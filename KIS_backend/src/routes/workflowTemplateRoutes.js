const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkDocumentPermission } = require('../middleware/documentPermissions');
const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// =====================================================
// ШАБЛОНЫ ПРОЦЕССОВ (WORKFLOW TEMPLATES)
// =====================================================

// Получение списка шаблонов
router.get('/workflow-templates', authMiddleware, async (req, res) => {
    try {
        const { 
            search = '',
            active_only = 'true',
            limit = 50, 
            offset = 0,
            sort_by = 'updated_at',
            sort_dir = 'desc'
        } = req.query;
        
        const allowedSortFields = ['name', 'created_at', 'updated_at', 'usage_count'];
        const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'updated_at';
        const safeSortDir = sort_dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        let sql = `
            SELECT 
                wt.id, wt.name, wt.description, wt.steps,
                wt.usage_count, wt.version, wt.is_active,
                wt.created_by, wt.created_at, wt.updated_at,
                u.surname as created_by_surname,
                u.name as created_by_name,
                jsonb_array_length(wt.steps) as steps_count
            FROM workflow_templates wt
            LEFT JOIN users u ON wt.created_by = u.id
            WHERE wt.deleted_at IS NULL
        `;
        
        const params = [];
        let idx = 1;
        
        if (active_only === 'true') {
            sql += ` AND wt.is_active = true`;
        }
        
        if (search) {
            sql += ` AND (wt.name ILIKE $${idx} OR wt.description ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        
        sql += ` ORDER BY wt.${safeSortBy} ${safeSortDir}`;
        sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(sql, params);
        
        let countSql = `SELECT COUNT(*) FROM workflow_templates WHERE deleted_at IS NULL`;
        const countParams = [];
        let countIdx = 1;
        
        if (active_only === 'true') {
            countSql += ` AND is_active = true`;
        }
        if (search) {
            countSql += ` AND (name ILIKE $${countIdx} OR description ILIKE $${countIdx})`;
            countParams.push(`%${search}%`);
        }
        
        const countResult = await query(countSql, countParams);
        
        const templates = result.rows.map(t => ({
            ...t,
            created_by_name: t.created_by_surname 
                ? `${t.created_by_surname} ${t.created_by_name || ''}`.trim() 
                : null
        }));
        
        res.json({ 
            templates, 
            total: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get workflow templates error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение одного шаблона
router.get('/workflow-templates/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT wt.*, 
                    u.surname as created_by_surname,
                    u.name as created_by_name
             FROM workflow_templates wt
             LEFT JOIN users u ON wt.created_by = u.id
             WHERE wt.id = $1 AND wt.deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Шаблон процесса не найден' });
        }
        
        const template = result.rows[0];
        template.created_by_name = template.created_by_surname 
            ? `${template.created_by_surname} ${template.created_by_name || ''}`.trim() 
            : null;
        
        // Обогащаем шаги данными о пользователях
        const steps = template.steps || [];

        // Собираем ID пользователей + информацию о должностях/ролях/отделах
        const userIds = [...new Set(steps.filter(s => s.assignee_user_id).map(s => s.assignee_user_id))];
        const postIds = [...new Set(steps.filter(s => s.assignee_post_id).map(s => s.assignee_post_id))];
        const roleIds = [...new Set(steps.filter(s => s.assignee_role_id).map(s => s.assignee_role_id))];
        const deptIds = [...new Set(steps.filter(s => s.assignee_department_id).map(s => s.assignee_department_id))];

        const usersMap = {};
        const postsMap = {};
        const rolesMap = {};
        const deptsMap = {};

        if (userIds.length > 0) {
            const usersResult = await query(
                `SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri,
                        p.name as post_name, d.name as department_name
                FROM users u
                LEFT JOIN posts p ON u.post_id = p.id
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.id = ANY($1::int[])`,
                [userIds]
            );
            usersResult.rows.forEach(u => {
                usersMap[u.id] = {
                    ...u,
                    full_name: `${u.surname} ${u.name} ${u.patronymic || ''}`.trim()
                };
            });
        }

        if (postIds.length > 0) {
            const postsResult = await query(
                `SELECT id, name FROM posts WHERE id = ANY($1::int[])`,
                [postIds]
            );
            postsResult.rows.forEach(p => { postsMap[p.id] = p; });
        }

        if (roleIds.length > 0) {
            const rolesResult = await query(
                `SELECT id, name FROM roles WHERE id = ANY($1::int[])`,
                [roleIds]
            );
            rolesResult.rows.forEach(r => { rolesMap[r.id] = r; });
        }

        if (deptIds.length > 0) {
            const deptsResult = await query(
                `SELECT id, name FROM departments WHERE id = ANY($1::int[])`,
                [deptIds]
            );
            deptsResult.rows.forEach(d => { deptsMap[d.id] = d; });
        }

        template.steps = steps.map(s => ({
            ...s,
            user: s.assignee_user_id ? usersMap[s.assignee_user_id] : null,
            post: s.assignee_post_id ? postsMap[s.assignee_post_id] : null,
            role: s.assignee_role_id ? rolesMap[s.assignee_role_id] : null,
            department: s.assignee_department_id ? deptsMap[s.assignee_department_id] : null
        }));
        
        res.json({ template });
    } catch (error) {
        console.error('Get workflow template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание шаблона процесса
router.post('/workflow-templates',
    authMiddleware,
    checkDocumentPermission('manage_templates'),
    async (req, res) => {
    try {
        const {
            name,
            description = '',
            steps = []
        } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Укажите название шаблона' });
        }
        
        if (!Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({ error: 'Маршрут должен содержать хотя бы один шаг' });
        }
        
        const { VALID_ASSIGNEE_TYPES } = require('../services/assigneeResolver');

        // Валидация и подготовка шагов
        const preparedSteps = steps.map((s, i) => {
            const assigneeType = s.assignee_type || 'user';
            
            if (!VALID_ASSIGNEE_TYPES.includes(assigneeType)) {
                throw new Error(`Шаг ${i + 1}: некорректный тип назначения "${assigneeType}"`);
            }
            
            // Проверяем, что нужное поле заполнено
            if (assigneeType === 'user' && !s.assignee_user_id) {
                throw new Error(`Шаг ${i + 1}: не выбран пользователь`);
            }
            if (assigneeType === 'post' && !s.assignee_post_id) {
                throw new Error(`Шаг ${i + 1}: не выбрана должность`);
            }
            if (assigneeType === 'role' && !s.assignee_role_id) {
                throw new Error(`Шаг ${i + 1}: не выбрана роль`);
            }
            
            return {
                id: s.id || uuidv4(),
                order: i + 1,
                type: s.type || 'approval',
                assignee_type: assigneeType,
                assignee_user_id: s.assignee_user_id || null,
                assignee_post_id: s.assignee_post_id || null,
                assignee_department_id: s.assignee_department_id || null,
                assignee_role_id: s.assignee_role_id || null,
                role_label: s.role_label || s.role || ''
            };
        });
        
        const result = await query(
            `INSERT INTO workflow_templates (name, description, steps, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                name.trim(),
                description,
                JSON.stringify(preparedSteps),
                req.userId
            ]
        );
        
        res.status(201).json({ template: result.rows[0] });
    } catch (error) {
        console.error('Create workflow template error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Обновление шаблона
router.put('/workflow-templates/:id',
    authMiddleware,
    checkDocumentPermission('manage_templates'),
    async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, steps, is_active } = req.body;
        
        // Проверяем существование
        const existing = await query(
            `SELECT * FROM workflow_templates WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (name !== undefined) {
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'Название не может быть пустым' });
            }
            updates.push(`name = $${idx++}`);
            values.push(name.trim());
        }
        
        if (description !== undefined) {
            updates.push(`description = $${idx++}`);
            values.push(description);
        }
        
        if (steps !== undefined) {
            if (!Array.isArray(steps) || steps.length === 0) {
                return res.status(400).json({ error: 'Маршрут должен содержать хотя бы один шаг' });
            }
            
            const { VALID_ASSIGNEE_TYPES } = require('../services/assigneeResolver');
            
            const preparedSteps = steps.map((s, i) => {
                const assigneeType = s.assignee_type || 'user';
                
                if (!VALID_ASSIGNEE_TYPES.includes(assigneeType)) {
                    throw new Error(`Шаг ${i + 1}: некорректный тип назначения`);
                }
                
                if (assigneeType === 'user' && !s.assignee_user_id) {
                    throw new Error(`Шаг ${i + 1}: не выбран пользователь`);
                }
                if (assigneeType === 'post' && !s.assignee_post_id) {
                    throw new Error(`Шаг ${i + 1}: не выбрана должность`);
                }
                if (assigneeType === 'role' && !s.assignee_role_id) {
                    throw new Error(`Шаг ${i + 1}: не выбрана роль`);
                }
                
                return {
                    id: s.id || uuidv4(),
                    order: i + 1,
                    type: s.type || 'approval',
                    assignee_type: assigneeType,
                    assignee_user_id: s.assignee_user_id || null,
                    assignee_post_id: s.assignee_post_id || null,
                    assignee_department_id: s.assignee_department_id || null,
                    assignee_role_id: s.assignee_role_id || null,
                    role_label: s.role_label || s.role || ''
                };
            });
            
            updates.push(`steps = $${idx++}`);
            values.push(JSON.stringify(preparedSteps));
        }
        
        if (is_active !== undefined) {
            updates.push(`is_active = $${idx++}`);
            values.push(is_active);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        updates.push(`version = version + 1`);
        values.push(id);
        
        const result = await query(
            `UPDATE workflow_templates SET ${updates.join(', ')} 
             WHERE id = $${idx} RETURNING *`,
            values
        );
        
        res.json({ template: result.rows[0] });
    } catch (error) {
        console.error('Update workflow template error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Удаление шаблона
router.delete('/workflow-templates/:id',
    authMiddleware,
    checkDocumentPermission('manage_templates'),
    async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, используется ли шаблон в типах документов или шаблонах документов
        const usageCheck = await query(
            `SELECT 
                (SELECT COUNT(*) FROM document_types WHERE default_workflow_template_id = $1) +
                (SELECT COUNT(*) FROM document_templates WHERE default_workflow_template_id = $1) as usage_count`,
            [id]
        );
        
        const usageCount = parseInt(usageCheck.rows[0].usage_count);
        
        if (usageCount > 0) {
            // Деактивируем
            await query(
                `UPDATE workflow_templates SET is_active = false, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [id]
            );
            return res.json({ 
                success: true, 
                message: 'Шаблон деактивирован (используется)' 
            });
        }
        
        // Мягко удаляем
        await query(
            `UPDATE workflow_templates SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [id]
        );
        
        res.json({ success: true, message: 'Шаблон удалён' });
    } catch (error) {
        console.error('Delete workflow template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Дублирование шаблона
router.post('/workflow-templates/:id/duplicate',
    authMiddleware,
    checkDocumentPermission('manage_templates'),
    async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        const existing = await query(
            `SELECT * FROM workflow_templates WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        
        const original = existing.rows[0];
        const newName = name || `${original.name} (копия)`;
        
        // Генерируем новые ID для шагов
        const newSteps = (original.steps || []).map(s => ({
            ...s,
            id: uuidv4()
        }));
        
        const result = await query(
            `INSERT INTO workflow_templates (name, description, steps, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                newName.trim(),
                original.description,
                JSON.stringify(newSteps),
                req.userId
            ]
        );
        
        res.status(201).json({ template: result.rows[0] });
    } catch (error) {
        console.error('Duplicate workflow template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Увеличить счётчик использования
router.post('/workflow-templates/:id/use', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        await query(
            `UPDATE workflow_templates SET usage_count = usage_count + 1 WHERE id = $1`,
            [id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Use workflow template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получить документы, использующие этот шаблон
router.get('/workflow-templates/:id/usage', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Типы документов
        const typesResult = await query(
            `SELECT id, name, code FROM document_types WHERE default_workflow_template_id = $1`,
            [id]
        );
        
        // Шаблоны документов
        const templatesResult = await query(
            `SELECT id, name FROM document_templates WHERE default_workflow_template_id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        // Документы с этим шаблоном в маршруте
        const docsResult = await query(
            `SELECT d.id, d.title, d.status, d.created_at
             FROM documents d
             JOIN document_routes dr ON dr.document_id = d.id
             WHERE dr.workflow_template_id = $1
               AND d.deleted_at IS NULL
             ORDER BY d.created_at DESC
             LIMIT 20`,
            [id]
        );
        
        res.json({
            document_types: typesResult.rows,
            document_templates: templatesResult.rows,
            documents: docsResult.rows
        });
    } catch (error) {
        console.error('Get workflow template usage error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;