const { query } = require('../config/database');

// =====================================================
// РЕЗОЛВИНГ ИСПОЛНИТЕЛЕЙ ЭТАПОВ МАРШРУТА
// =====================================================
//
// Типы назначения (assignee_type):
// - 'user'                — конкретный пользователь
// - 'author'              — автор документа
// - 'department_manager'  — руководитель отдела автора
// - 'post'                — должность (в отделе автора или указанном)
// - 'role'                — роль
//
// Резолвинг происходит ОДИН РАЗ — при запуске документа
// на согласование. Результат сохраняется в route_data.steps[i].user_id.
// =====================================================

const VALID_ASSIGNEE_TYPES = ['user', 'author', 'department_manager', 'post', 'role'];

/**
 * Резолвит конкретного пользователя для одного шага.
 */
async function resolveAssignee(step, document) {
    const type = step.assignee_type || 'user';
    
    // 1. Конкретный пользователь
    if (type === 'user') {
        return step.assignee_user_id || null;
    }
    
    // 2. Автор документа
    if (type === 'author') {
        return document.created_by || null;
    }
    
    // 3. Руководитель отдела автора
    if (type === 'department_manager') {
        if (!document.department_id) return null;
        
        const result = await query(
            `SELECT manager_id FROM departments WHERE id = $1`,
            [document.department_id]
        );
        return result.rows[0]?.manager_id || null;
    }
    
    // 4. Должность
    if (type === 'post') {
        const postId = step.assignee_post_id;
        if (!postId) return null;
        
        const deptId = step.assignee_department_id || document.department_id;
        
        let sql = `
            SELECT id FROM users 
            WHERE post_id = $1 
              AND deleted_at IS NULL 
              AND status = 'active'
        `;
        const params = [postId];
        
        if (deptId) {
            sql += ` AND department_id = $2`;
            params.push(deptId);
        }
        
        // Пытаемся найти хоть кого-то на должности
        sql += ` ORDER BY id ASC LIMIT 1`;
        
        const result = await query(sql, params);
        
        if (result.rows.length > 0) return result.rows[0].id;
        
        // Фолбэк: если в конкретном отделе никого нет — ищем по всей компании
        if (deptId) {
            const fallbackResult = await query(
                `SELECT id FROM users 
                 WHERE post_id = $1 AND deleted_at IS NULL AND status = 'active'
                 ORDER BY id ASC LIMIT 1`,
                [postId]
            );
            return fallbackResult.rows[0]?.id || null;
        }
        
        return null;
    }
    
    // 5. Роль
    if (type === 'role') {
        const roleId = step.assignee_role_id;
        if (!roleId) return null;
        
        // Ищем пользователя с этой ролью. Приоритет — в отделе автора.
        const deptId = document.department_id;
        
        if (deptId) {
            const deptResult = await query(
                `SELECT id FROM users 
                 WHERE role_id = $1 
                   AND department_id = $2
                   AND deleted_at IS NULL 
                   AND status = 'active'
                 ORDER BY id ASC LIMIT 1`,
                [roleId, deptId]
            );
            if (deptResult.rows.length > 0) return deptResult.rows[0].id;
        }
        
        // Фолбэк: любой пользователь с этой ролью
        const result = await query(
            `SELECT id FROM users 
             WHERE role_id = $1 
               AND deleted_at IS NULL 
               AND status = 'active'
             ORDER BY id ASC LIMIT 1`,
            [roleId]
        );
        return result.rows[0]?.id || null;
    }
    
    return null;
}

/**
 * Резолвит массив шагов. Возвращает тот же массив, но с полем user_id.
 * Если исполнителя найти не удалось — user_id = null, шаг помечается как unresolved.
 */
async function resolveAllSteps(steps, document) {
    const resolved = [];
    
    for (const step of steps) {
        const userId = await resolveAssignee(step, document);
        resolved.push({
            ...step,
            user_id: userId,
            unresolved: !userId
        });
    }
    
    return resolved;
}

/**
 * Формирует человекочитаемое описание назначения шага.
 * Например: "Руководитель отдела автора", "Должность: Юрист", "Роль: Администратор".
 */
function describeAssignee(step) {
    const type = step.assignee_type || 'user';
    
    switch (type) {
        case 'user':
            return step.role_label || 'Конкретный пользователь';
        case 'author':
            return 'Автор документа';
        case 'department_manager':
            return 'Руководитель отдела автора';
        case 'post':
            return `Должность: ${step.role_label || 'не указана'}`;
        case 'role':
            return `Роль: ${step.role_label || 'не указана'}`;
        default:
            return 'Не указано';
    }
}

module.exports = {
    VALID_ASSIGNEE_TYPES,
    resolveAssignee,
    resolveAllSteps,
    describeAssignee
};