const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, transaction } = require('../config/database');

// =====================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================

/**
 * Проверка, что пользователь может управлять доступом к документу.
 * Может: автор, супер-админ, у кого есть доступ уровня 'full'.
 */
async function canManageAccess(documentId, userId, isSuperAdmin = false) {
    if (isSuperAdmin) return true;
    
    const docResult = await query(
        `SELECT created_by FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId]
    );
    
    if (docResult.rows.length === 0) return false;
    if (docResult.rows[0].created_by === userId) return true;
    
    // Проверка явного доступа уровня 'full'
    const accessResult = await query(
        `SELECT access_level FROM document_access 
         WHERE document_id = $1 AND user_id = $2
         ORDER BY CASE access_level WHEN 'full' THEN 3 WHEN 'edit' THEN 2 WHEN 'view' THEN 1 ELSE 0 END DESC
         LIMIT 1`,
        [documentId, userId]
    );
    
    return accessResult.rows.length > 0 && accessResult.rows[0].access_level === 'full';
}

/**
 * Проверка, что пользователь имеет доступ к документу хотя бы на просмотр.
 */
async function hasAccess(documentId, userId, isSuperAdmin = false) {
    if (isSuperAdmin) return true;
    
    const result = await query(
        `SELECT 1 FROM documents d
         WHERE d.id = $1 AND d.deleted_at IS NULL
           AND (
             d.created_by = $2
             OR EXISTS (
               SELECT 1 FROM document_access da
               WHERE da.document_id = d.id
                 AND (
                   da.user_id = $2
                   OR da.department_id = (SELECT department_id FROM users WHERE id = $2)
                 )
             )
           )
         LIMIT 1`,
        [documentId, userId]
    );
    
    return result.rows.length > 0;
}

// =====================================================
// ИСПОЛНИТЕЛИ ДОКУМЕНТА
// =====================================================

/**
 * Проверка: является ли пользователь руководителем отдела документа
 * (или одного из родительских отделов).
 */
async function isDocumentDepartmentManager(documentId, userId) {
    const result = await query(
        `WITH RECURSIVE managed_departments AS (
            SELECT id FROM departments WHERE manager_id = $2
            UNION
            SELECT d.id
            FROM departments d
            JOIN managed_departments m ON d.parent_department_id = m.id
        )
        SELECT 1
        FROM documents d
        LEFT JOIN users u ON u.id = d.created_by
        WHERE d.id = $1
          AND d.deleted_at IS NULL
          AND (
              d.department_id IN (SELECT id FROM managed_departments)
              OR u.department_id IN (SELECT id FROM managed_departments)
          )
        LIMIT 1`,
        [documentId, userId]
    );
    return result.rows.length > 0;
}

/**
 * Назначать исполнителей могут только:
 * - супер-администратор;
 * - пользователь с доступом к делопроизводству (делопроизводитель);
 * - руководитель отдела документа.
 *
 * Автор документа таким правом не обладает.
 */
async function canManageAssignees(documentId, userId, isSuperAdmin = false) {
    if (isSuperAdmin) return true;

    const docResult = await query(
        `SELECT id FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId]
    );
    if (docResult.rows.length === 0) return false;

    if (await isDocumentDepartmentManager(documentId, userId)) return true;

    const permResult = await query(
        `SELECT permissions FROM roles WHERE id = (SELECT role_id FROM users WHERE id = $1)`,
        [userId]
    );
    const rolePermissions = permResult.rows[0]?.permissions || {};
    const docflowPerm = rolePermissions.docflow_page;

    return docflowPerm === true || docflowPerm === 'all' ||
        docflowPerm?.access === true || docflowPerm?.access === 'all';
}

async function loadAssignees(documentId) {
    const result = await query(
        `SELECT da.user_id, da.assigned_at,
                TRIM(CONCAT_WS(' ', u.surname, u.name, u.patronymic)) AS full_name,
                u.username, u.email, u.avatar_uri, u.status
         FROM document_assignees da
         JOIN users u ON u.id = da.user_id
         WHERE da.document_id = $1
         ORDER BY da.assigned_at ASC, da.user_id ASC`,
        [documentId]
    );
    return result.rows;
}

async function notifyAssignee(userId, document, senderId) {
    await query(
        `INSERT INTO notifications
            (user_id, category, priority, title, content, link_type, link_id, sender_id)
         VALUES ($1, 'document', 'normal', $2, $3, 'document', $4, $5)`,
        [
            userId,
            `Вам назначен документ "${document.title}"`,
            `Документ №${document.id} передан вам в работу.`,
            document.id,
            senderId
        ]
    );
}

// Список исполнителей документа
router.get('/documents/:id/assignees', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const docResult = await query(
            `SELECT id FROM documents WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }

        const canManage = await canManageAssignees(id, req.userId, req.user?.is_super_admin);
        const canView = canManage || await hasAccess(id, req.userId, req.user?.is_super_admin);
        if (!canView) {
            return res.status(403).json({ error: 'Нет доступа к документу' });
        }

        res.json({ assignees: await loadAssignees(id) });
    } catch (error) {
        console.error('Get document assignees error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Назначить документ одному или нескольким сотрудникам
router.put('/documents/:id/assignees', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const rawIds = req.body?.user_ids;

        if (!Array.isArray(rawIds)) {
            return res.status(400).json({ error: 'Ожидается массив user_ids' });
        }
        if (rawIds.length > 100) {
            return res.status(400).json({ error: 'Можно назначить не более 100 сотрудников' });
        }

        const userIds = [...new Set(
            rawIds.map(Number).filter(value => Number.isInteger(value) && value > 0)
        )];

        const docResult = await query(
            `SELECT id, title, created_by FROM documents WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        if (!await canManageAssignees(id, req.userId, req.user?.is_super_admin)) {
            return res.status(403).json({ error: 'Недостаточно прав для назначения исполнителей' });
        }

        let validUserIds = [];
        if (userIds.length > 0) {
            const usersResult = await query(
                `SELECT id FROM users
                 WHERE id = ANY($1::int[]) AND status = 'active' AND deleted_at IS NULL`,
                [userIds]
            );
            validUserIds = usersResult.rows.map(row => row.id);

            if (validUserIds.length !== userIds.length) {
                const invalid = userIds.filter(userId => !validUserIds.includes(userId));
                return res.status(400).json({
                    error: `Сотрудники не найдены или неактивны: ${invalid.join(', ')}`
                });
            }
        }

        let previousIds = [];
        let addedIds = [];
        await transaction(async client => {
            const previousResult = await client.query(
                `SELECT user_id FROM document_assignees WHERE document_id = $1 ORDER BY user_id`,
                [id]
            );
            previousIds = previousResult.rows.map(row => row.user_id);

            await client.query(`DELETE FROM document_assignees WHERE document_id = $1`, [id]);

            for (const userId of validUserIds) {
                await client.query(
                    `INSERT INTO document_assignees (document_id, user_id, assigned_by)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (document_id, user_id) DO NOTHING`,
                    [id, userId, req.userId]
                );
            }

            const previousSet = new Set(previousIds);
            addedIds = validUserIds.filter(userId => !previousSet.has(userId));
        });

        const document = docResult.rows[0];
        for (const userId of addedIds) {
            await notifyAssignee(userId, document, req.userId);
        }

        req.audit = {
            action: 'UPDATE document assignees',
            entityType: 'documents',
            entityId: Number(id),
            oldData: { user_ids: previousIds },
            newData: { user_ids: validUserIds, notified: addedIds }
        };

        res.json({
            assignees: await loadAssignees(id),
            added: addedIds,
            notified: addedIds.length
        });
    } catch (error) {
        console.error('Assign document error:', error);
        res.status(500).json({ error: error.message });
    }
});


// =====================================================
// СПИСОК ДОСТУПОВ ДОКУМЕНТА
// =====================================================

router.get('/documents/:id/access', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, что пользователь вообще имеет доступ к документу
        const allowed = await hasAccess(id, req.userId, req.user?.is_super_admin);
        if (!allowed) {
            return res.status(403).json({ error: 'Нет доступа к документу' });
        }
        
        // Получаем список доступов
        const result = await query(
            `SELECT 
                da.id, da.access_level, da.granted_at,
                da.user_id, da.department_id,
                u.surname, u.name, u.patronymic, u.avatar_uri,
                p.name as post_name,
                d.name as dept_name, d.id as dept_id,
                g.surname as granted_by_surname,
                g.name as granted_by_name
             FROM document_access da
             LEFT JOIN users u ON da.user_id = u.id
             LEFT JOIN posts p ON u.post_id = p.id
             LEFT JOIN departments d ON da.department_id = d.id
             LEFT JOIN users g ON da.granted_by = g.id
             WHERE da.document_id = $1
             ORDER BY 
                CASE da.access_level 
                    WHEN 'full' THEN 1 
                    WHEN 'edit' THEN 2 
                    WHEN 'view' THEN 3 
                    ELSE 4 
                END,
                da.granted_at DESC`,
            [id]
        );
        
        // Получаем автора и участников маршрута (у них тоже есть доступ)
        const docResult = await query(
            `SELECT d.created_by, u.surname, u.name, u.patronymic, u.avatar_uri
             FROM documents d
             JOIN users u ON d.created_by = u.id
             WHERE d.id = $1`,
            [id]
        );
        
        const routeResult = await query(
            `SELECT route_data FROM document_routes 
             WHERE document_id = $1 
             ORDER BY id DESC LIMIT 1`,
            [id]
        );
        
        const routeSteps = routeResult.rows[0]?.route_data?.steps || [];
        const routeUserIds = [...new Set(routeSteps.filter(s => s.user_id).map(s => s.user_id))];
        
        let routeUsers = [];
        if (routeUserIds.length > 0) {
            const routeUsersResult = await query(
                `SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri, p.name as post_name
                 FROM users u
                 LEFT JOIN posts p ON u.post_id = p.id
                 WHERE u.id = ANY($1::int[])`,
                [routeUserIds]
            );
            
            routeUsers = routeUsersResult.rows.map(u => ({
                ...u,
                full_name: `${u.surname} ${u.name} ${u.patronymic || ''}`.trim(),
                source: 'route',
                access_level: 'view'
            }));
        }
        
        const explicitAccess = result.rows.map(a => ({
            ...a,
            subject_type: a.user_id ? 'user' : 'department',
            subject_name: a.user_id 
                ? `${a.surname} ${a.name} ${a.patronymic || ''}`.trim()
                : a.dept_name,
            source: 'explicit'
        }));
        
        // Автор
        const author = docResult.rows[0] ? {
            user_id: docResult.rows[0].created_by,
            full_name: `${docResult.rows[0].surname} ${docResult.rows[0].name} ${docResult.rows[0].patronymic || ''}`.trim(),
            avatar_uri: docResult.rows[0].avatar_uri,
            access_level: 'full',
            source: 'author',
            subject_type: 'user'
        } : null;
        
        res.json({
            access: explicitAccess,
            author,
            route_participants: routeUsers
        });
    } catch (error) {
        console.error('Get document access error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ДОБАВИТЬ ПОЛЬЗОВАТЕЛЯ
// =====================================================

router.post('/documents/:id/access/users', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, access_level = 'view' } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ error: 'Укажите ID пользователя' });
        }
        
        if (!['view', 'edit', 'full'].includes(access_level)) {
            return res.status(400).json({ error: 'Некорректный уровень доступа' });
        }
        
        // Права на управление доступом
        const canManage = await canManageAccess(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на управление доступом' });
        }
        
        // Проверяем, что пользователь существует
        const userCheck = await query(
            `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [user_id]
        );
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Проверяем, нет ли уже такой записи
        const existing = await query(
            `SELECT id FROM document_access 
             WHERE document_id = $1 AND user_id = $2`,
            [id, user_id]
        );
        
        if (existing.rows.length > 0) {
            // Обновляем уровень
            await query(
                `UPDATE document_access SET access_level = $1 
                 WHERE id = $2`,
                [access_level, existing.rows[0].id]
            );
            return res.json({ 
                success: true, 
                message: 'Уровень доступа обновлён',
                updated: true 
            });
        }
        
        // Создаём новую запись
        const result = await query(
            `INSERT INTO document_access (document_id, user_id, access_level, granted_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, user_id, access_level, req.userId]
        );
        
        res.status(201).json({ 
            success: true, 
            access: result.rows[0],
            created: true 
        });
    } catch (error) {
        console.error('Add user access error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ДОБАВИТЬ ПОДРАЗДЕЛЕНИЕ
// =====================================================

router.post('/documents/:id/access/departments', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { department_id, access_level = 'view' } = req.body;
        
        if (!department_id) {
            return res.status(400).json({ error: 'Укажите ID подразделения' });
        }
        
        if (!['view', 'edit', 'full'].includes(access_level)) {
            return res.status(400).json({ error: 'Некорректный уровень доступа' });
        }
        
        const canManage = await canManageAccess(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на управление доступом' });
        }
        
        // Проверяем, что подразделение существует
        const deptCheck = await query(
            `SELECT id FROM departments WHERE id = $1`,
            [department_id]
        );
        if (deptCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Подразделение не найдено' });
        }
        
        // Проверяем, нет ли уже такой записи
        const existing = await query(
            `SELECT id FROM document_access 
             WHERE document_id = $1 AND department_id = $2`,
            [id, department_id]
        );
        
        if (existing.rows.length > 0) {
            await query(
                `UPDATE document_access SET access_level = $1 
                 WHERE id = $2`,
                [access_level, existing.rows[0].id]
            );
            return res.json({ 
                success: true, 
                message: 'Уровень доступа обновлён',
                updated: true 
            });
        }
        
        const result = await query(
            `INSERT INTO document_access (document_id, department_id, access_level, granted_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, department_id, access_level, req.userId]
        );
        
        res.status(201).json({ 
            success: true, 
            access: result.rows[0],
            created: true 
        });
    } catch (error) {
        console.error('Add department access error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПАКЕТНОЕ ДОБАВЛЕНИЕ
// =====================================================

router.post('/documents/:id/access/batch', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            user_ids = [], 
            department_ids = [], 
            access_level = 'view' 
        } = req.body;
        
        if (!['view', 'edit', 'full'].includes(access_level)) {
            return res.status(400).json({ error: 'Некорректный уровень доступа' });
        }
        
        const canManage = await canManageAccess(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на управление доступом' });
        }
        
        let addedUsers = 0;
        let addedDepts = 0;
        
        // Добавляем пользователей
        for (const userId of user_ids) {
            const userCheck = await query(
                `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
                [userId]
            );
            if (userCheck.rows.length === 0) continue;
            
            const existing = await query(
                `SELECT id FROM document_access WHERE document_id = $1 AND user_id = $2`,
                [id, userId]
            );
            
            if (existing.rows.length > 0) {
                await query(
                    `UPDATE document_access SET access_level = $1 WHERE id = $2`,
                    [access_level, existing.rows[0].id]
                );
            } else {
                await query(
                    `INSERT INTO document_access (document_id, user_id, access_level, granted_by)
                     VALUES ($1, $2, $3, $4)`,
                    [id, userId, access_level, req.userId]
                );
                addedUsers++;
            }
        }
        
        // Добавляем подразделения
        for (const deptId of department_ids) {
            const deptCheck = await query(
                `SELECT id FROM departments WHERE id = $1`,
                [deptId]
            );
            if (deptCheck.rows.length === 0) continue;
            
            const existing = await query(
                `SELECT id FROM document_access WHERE document_id = $1 AND department_id = $2`,
                [id, deptId]
            );
            
            if (existing.rows.length > 0) {
                await query(
                    `UPDATE document_access SET access_level = $1 WHERE id = $2`,
                    [access_level, existing.rows[0].id]
                );
            } else {
                await query(
                    `INSERT INTO document_access (document_id, department_id, access_level, granted_by)
                     VALUES ($1, $2, $3, $4)`,
                    [id, deptId, access_level, req.userId]
                );
                addedDepts++;
            }
        }
        
        res.json({
            success: true,
            added_users: addedUsers,
            added_departments: addedDepts,
            total_users: user_ids.length,
            total_departments: department_ids.length
        });
    } catch (error) {
        console.error('Batch add access error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ИЗМЕНИТЬ УРОВЕНЬ ДОСТУПА
// =====================================================

router.put('/documents/:id/access/:accessId', authMiddleware, async (req, res) => {
    try {
        const { id, accessId } = req.params;
        const { access_level } = req.body;
        
        if (!['view', 'edit', 'full'].includes(access_level)) {
            return res.status(400).json({ error: 'Некорректный уровень доступа' });
        }
        
        const canManage = await canManageAccess(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на управление доступом' });
        }
        
        const result = await query(
            `UPDATE document_access SET access_level = $1 
             WHERE id = $2 AND document_id = $3
             RETURNING *`,
            [access_level, accessId, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Запись о доступе не найдена' });
        }
        
        res.json({ success: true, access: result.rows[0] });
    } catch (error) {
        console.error('Update access level error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// УДАЛИТЬ ДОСТУП
// =====================================================

router.delete('/documents/:id/access/:accessId', authMiddleware, async (req, res) => {
    try {
        const { id, accessId } = req.params;
        
        const canManage = await canManageAccess(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на управление доступом' });
        }
        
        const result = await query(
            `DELETE FROM document_access 
             WHERE id = $1 AND document_id = $2
             RETURNING *`,
            [accessId, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Запись о доступе не найдена' });
        }
        
        res.json({ success: true, deleted: result.rows[0] });
    } catch (error) {
        console.error('Delete access error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// УДАЛИТЬ ДОСТУП ПОЛЬЗОВАТЕЛЮ (по user_id)
// =====================================================

router.delete('/documents/:id/access/users/:userId', authMiddleware, async (req, res) => {
    try {
        const { id, userId } = req.params;
        
        const canManage = await canManageAccess(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на управление доступом' });
        }
        
        // Нельзя удалить автора
        const docCheck = await query(
            `SELECT created_by FROM documents WHERE id = $1`,
            [id]
        );
        
        if (docCheck.rows[0]?.created_by === parseInt(userId)) {
            return res.status(400).json({ error: 'Нельзя убрать доступ автора' });
        }
        
        const result = await query(
            `DELETE FROM document_access 
             WHERE document_id = $1 AND user_id = $2
             RETURNING id`,
            [id, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'У пользователя нет явного доступа' });
        }
        
        res.json({ success: true, deleted_count: result.rows.length });
    } catch (error) {
        console.error('Delete user access error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// УДАЛИТЬ ДОСТУП ПОДРАЗДЕЛЕНИЮ
// =====================================================

router.delete('/documents/:id/access/departments/:deptId', authMiddleware, async (req, res) => {
    try {
        const { id, deptId } = req.params;
        
        const canManage = await canManageAccess(id, req.userId, req.user?.is_super_admin);
        if (!canManage) {
            return res.status(403).json({ error: 'Нет прав на управление доступом' });
        }
        
        const result = await query(
            `DELETE FROM document_access 
             WHERE document_id = $1 AND department_id = $2
             RETURNING id`,
            [id, deptId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'У подразделения нет явного доступа' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete department access error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЕЙ, У КОТОРЫХ ЕСТЬ ДОСТУП
// =====================================================

router.get('/documents/:id/effective-access', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const allowed = await hasAccess(id, req.userId, req.user?.is_super_admin);
        if (!allowed) {
            return res.status(403).json({ error: 'Нет доступа' });
        }
        
        // Автор
        const docResult = await query(
            `SELECT created_by FROM documents WHERE id = $1`,
            [id]
        );
        const authorId = docResult.rows[0]?.created_by;
        
        // Явный доступ пользователей
        const explicitUsers = await query(
            `SELECT DISTINCT da.user_id, da.access_level
             FROM document_access da
             WHERE da.document_id = $1 AND da.user_id IS NOT NULL`,
            [id]
        );
        
        // Явный доступ подразделений
        const explicitDepts = await query(
            `SELECT DISTINCT da.department_id, da.access_level
             FROM document_access da
             WHERE da.document_id = $1 AND da.department_id IS NOT NULL`,
            [id]
        );
        
        // Пользователи из подразделений, у которых есть доступ
        const deptIds = explicitDepts.rows.map(d => d.department_id);
        let deptUsers = [];
        if (deptIds.length > 0) {
            const deptUsersResult = await query(
                `SELECT DISTINCT u.id as user_id, u.surname, u.name, u.patronymic, u.avatar_uri
                 FROM users u
                 WHERE u.department_id = ANY($1::int[])
                   AND u.deleted_at IS NULL`,
                [deptIds]
            );
            deptUsers = deptUsersResult.rows;
        }
        
        // Участники маршрута
        const routeResult = await query(
            `SELECT route_data FROM document_routes 
             WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
            [id]
        );
        const routeSteps = routeResult.rows[0]?.route_data?.steps || [];
        const routeUserIds = [...new Set(routeSteps.filter(s => s.user_id).map(s => s.user_id))];
        
        // Собираем уникальный список ID
        const allUserIds = new Set();
        if (authorId) allUserIds.add(authorId);
        explicitUsers.rows.forEach(u => allUserIds.add(u.user_id));
        deptUsers.forEach(u => allUserIds.add(u.user_id));
        routeUserIds.forEach(uid => allUserIds.add(uid));
        
        // Получаем инфу по всем пользователям
        const userIdsArray = [...allUserIds];
        let users = [];
        if (userIdsArray.length > 0) {
            const usersResult = await query(
                `SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri,
                        p.name as post_name, d.name as department_name
                 FROM users u
                 LEFT JOIN posts p ON u.post_id = p.id
                 LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.id = ANY($1::int[])`,
                [userIdsArray]
            );
            
            users = usersResult.rows.map(u => {
                const isAuthor = u.id === authorId;
                const explicitAccess = explicitUsers.rows.find(e => e.user_id === u.id);
                const isRouteParticipant = routeUserIds.includes(u.id);
                const isDeptAccess = deptUsers.some(d => d.user_id === u.id);
                
                let effectiveLevel = 'view';
                if (isAuthor) effectiveLevel = 'full';
                else if (explicitAccess) effectiveLevel = explicitAccess.access_level;
                else if (isDeptAccess) effectiveLevel = 'view';
                else if (isRouteParticipant) effectiveLevel = 'view';
                
                let source = 'unknown';
                if (isAuthor) source = 'author';
                else if (explicitAccess) source = 'explicit';
                else if (isDeptAccess) source = 'department';
                else if (isRouteParticipant) source = 'route';
                
                return {
                    ...u,
                    full_name: `${u.surname} ${u.name} ${u.patronymic || ''}`.trim(),
                    access_level: effectiveLevel,
                    source
                };
            });
        }
        
        res.json({ users });
    } catch (error) {
        console.error('Get effective access error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;