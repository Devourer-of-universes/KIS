const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, transaction } = require('../config/database');

// ========== ПОЛУЧЕНИЕ ЗАДАЧ ==========

// Получение задач с фильтрацией по статусу
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { status, limit = 50, offset = 0 } = req.query;
        
        let sql = `
            SELECT t.*, 
                   u.surname as assignee_surname, u.name as assignee_name,
                   c.surname as creator_surname, c.name as creator_name,
                   d.name as department_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN users c ON t.created_by = c.id
            LEFT JOIN departments d ON t.department_id = d.id
            WHERE t.deleted_at IS NULL
              AND (t.created_by = $1 OR t.assigned_to = $1)
        `;
        
        const params = [userId];
        let paramIndex = 2;
        
        // Фильтр по статусу (может быть несколько через запятую)
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            const placeholders = statuses.map((_, i) => `$${paramIndex + i}`).join(', ');
            sql += ` AND t.status IN (${placeholders})`;
            params.push(...statuses);
            paramIndex += statuses.length;
        }
        
        sql += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(sql, params);
        res.json({ tasks: result.rows });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});
// =====================================================
// ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ПО ID ДЛЯ КАРТОЧКИ ЗАДАЧИ
// =====================================================
router.get('/task/userscard', authMiddleware, async (req, res) => {
    try {
        const { ids } = req.query;
        console.log('🔍 Task users request, ids:', ids);
        
        if (!ids) {
            return res.json({ users: [] });
        }
        
        const idArray = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        console.log('📊 Parsed IDs:', idArray);
        
        if (idArray.length === 0) {
            return res.json({ users: [] });
        }
        
        const MAX_USERS = 50;
        const limitedIds = idArray.slice(0, MAX_USERS);
        
        const result = await query(
            `SELECT id, surname, name, patronymic, username, avatar_uri 
             FROM users 
             WHERE id = ANY($1::int[]) AND deleted_at IS NULL`,
            [limitedIds]
        );
        
        console.log('👥 Users found:', result.rows.length);
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Get task users error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Получение задачи по ID
router.get('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(`
            SELECT 
                t.*,
                u.surname as assignee_surname, 
                u.name as assignee_name,
                c.surname as creator_surname, 
                c.name as creator_name,
                d.name as department_name,
                tmpl.name as template_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN users c ON t.created_by = c.id
            LEFT JOIN departments d ON t.department_id = d.id
            LEFT JOIN task_templates tmpl ON t.template_id = tmpl.id
            WHERE t.id = $1 AND t.deleted_at IS NULL
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }
        
        const task = result.rows[0];
        // Убедимся, что custom_fields всегда объект
        if (!task.custom_fields) {
            task.custom_fields = {};
        }
        
        res.json({ task });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/tasks', authMiddleware, async (req, res) => {
    try {
        const { 
            title, description, assignedTo, departmentId, 
            startDate, dueDate, priority, tags,
            customFields,  // ← добавляем
            templateId     // ← добавляем
        } = req.body;
        const userId = req.userId;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Укажите название задачи' });
        }
        
        const validPriority = ['low', 'medium', 'high', 'critical'].includes(priority) ? priority : 'medium';
        
        // Преобразуем customFields в JSON
        const customFieldsJson = customFields || {};
        
        const result = await query(`
            INSERT INTO tasks (
                title, description, created_by, assigned_to, department_id, 
                start_date, due_date, priority, tags, status, progress,
                custom_fields, template_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 0, $10, $11)
            RETURNING *
        `, [
            title.trim(), description, userId, assignedTo || null, departmentId || null,
            startDate || null, dueDate || null, validPriority, tags || [],
            customFieldsJson, templateId || null
        ]);
        
        res.status(201).json({ task: result.rows[0] });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Обновление задачи
router.put('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, description, assignedTo, departmentId, 
            startDate, dueDate, priority, status, progress, tags,
            customFields  // ← добавляем
        } = req.body;
        
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
        if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
        if (assignedTo !== undefined) { updates.push(`assigned_to = $${idx++}`); values.push(assignedTo); }
        if (departmentId !== undefined) { updates.push(`department_id = $${idx++}`); values.push(departmentId); }
        if (startDate !== undefined) { updates.push(`start_date = $${idx++}`); values.push(startDate); }
        if (dueDate !== undefined) { updates.push(`due_date = $${idx++}`); values.push(dueDate); }
        if (priority !== undefined) { updates.push(`priority = $${idx++}`); values.push(priority); }
        if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
        if (progress !== undefined) { updates.push(`progress = $${idx++}`); values.push(progress); }
        if (tags !== undefined) { updates.push(`tags = $${idx++}`); values.push(tags); }
        if (customFields !== undefined) { 
            updates.push(`custom_fields = $${idx++}`); 
            values.push(customFields); 
        }
        
        if (status === 'completed') {
            updates.push(`completed_at = CURRENT_TIMESTAMP`);
        }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        
        if (updates.length === 1) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        const result = await query(`
            UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *
        `, values);
        
        res.json({ task: result.rows[0] });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление задачи
router.delete('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        const result = await query(`
            UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND (created_by = $2 OR assigned_to = $2)
            RETURNING id
        `, [id, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Добавление комментария
// Добавление комментария к задаче
router.post('/tasks/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.userId;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Введите комментарий' });
        }
        
        // Проверяем, что задача существует
        const taskCheck = await query(
            `SELECT id FROM tasks WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (taskCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }
        
        const result = await query(
            `INSERT INTO task_comments (task_id, user_id, content)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id, userId, content.trim()]
        );
        
        // Получаем данные пользователя для ответа
        const userResult = await query(
            `SELECT surname, name FROM users WHERE id = $1`,
            [userId]
        );
        
        const comment = {
            ...result.rows[0],
            user_name: userResult.rows[0]?.surname 
                ? `${userResult.rows[0].surname} ${userResult.rows[0].name}`.trim() 
                : 'Пользователь'
        };
        
        res.status(201).json({ comment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение комментариев к задаче
router.get('/tasks/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT tc.*, u.surname, u.name 
             FROM task_comments tc
             LEFT JOIN users u ON tc.user_id = u.id
             WHERE tc.task_id = $1
             ORDER BY tc.created_at ASC`,
            [id]
        );
        
        const comments = result.rows.map(row => ({
            ...row,
            user_name: row.surname ? `${row.surname} ${row.name}`.trim() : 'Пользователь'
        }));
        
        res.json({ comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== КАЛЕНДАРЬ ==========

// Получение событий для календаря
router.get('/calendar/events', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { start, end } = req.query;
        
        let sql = `
            SELECT 
                t.id,
                t.title as name,
                t.due_date as date,
                t.status,
                t.priority,  -- ← Убедись, что priority выбирается
                'task' as type,
                u.surname as assignee_surname,
                u.name as assignee_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.deleted_at IS NULL
              AND (t.created_by = $1 OR t.assigned_to = $1)
        `;
        
        const params = [userId];
        let paramIndex = 2;
        
        if (start) {
            sql += ` AND t.due_date >= $${paramIndex++}`;
            params.push(start);
        }
        
        if (end) {
            sql += ` AND t.due_date <= $${paramIndex++}`;
            params.push(end);
        }
        
        sql += ` ORDER BY t.due_date ASC`;
        
        const result = await query(sql, params);
        
        const events = result.rows.map(row => ({
            id: row.id,
            title: row.name,
            date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
            type: row.type,
            priority: row.priority || 'medium',  // ← значение по умолчанию
            status: row.status,
            assignee: row.assignee_surname ? `${row.assignee_surname} ${row.assignee_name}` : null
        }));
        
        res.json({ events });
    } catch (error) {
        console.error('Get calendar events error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;