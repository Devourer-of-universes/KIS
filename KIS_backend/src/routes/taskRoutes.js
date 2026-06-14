const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, transaction } = require('../config/database');

// ========== ПОЛУЧЕНИЕ ЗАДАЧ ==========

// Получение всех задач пользователя
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { status, priority, startDate, endDate } = req.query;
        
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
        
        if (status) {
            sql += ` AND t.status = $${paramIndex++}`;
            params.push(status);
        }
        
        if (priority) {
            sql += ` AND t.priority = $${paramIndex++}`;
            params.push(priority);
        }
        
        if (startDate) {
            sql += ` AND t.due_date >= $${paramIndex++}`;
            params.push(startDate);
        }
        
        if (endDate) {
            sql += ` AND t.due_date <= $${paramIndex++}`;
            params.push(endDate);
        }
        
        sql += ` ORDER BY t.due_date ASC NULLS LAST, t.priority DESC`;
        
        const result = await query(sql, params);
        res.json({ tasks: result.rows });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение задачи по ID
router.get('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        const result = await query(`
            SELECT t.*, 
                   u.surname as assignee_surname, u.name as assignee_name,
                   c.surname as creator_surname, c.name as creator_name,
                   d.name as department_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN users c ON t.created_by = c.id
            LEFT JOIN departments d ON t.department_id = d.id
            WHERE t.id = $1 AND t.deleted_at IS NULL
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }
        
        res.json({ task: result.rows[0] });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/tasks', authMiddleware, async (req, res) => {
    try {
        const { 
            title, description, assignedTo, departmentId, 
            startDate, dueDate, priority: receivedPriority,  // ← переименовали
            tags, notifyAssignee, notifyOnDeadline 
        } = req.body;
        const userId = req.userId;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Укажите название задачи' });
        }
        
        // Приоритет: убедимся, что значение корректное
        const validPriority = ['low', 'medium', 'high', 'critical'].includes(receivedPriority) 
            ? receivedPriority 
            : 'medium';
        
        console.log('📥 Creating task:', { title, priority: validPriority, dueDate, assignedTo });
        
        const result = await query(`
            INSERT INTO tasks (title, description, created_by, assigned_to, department_id, 
                               start_date, due_date, priority, tags, status, progress)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 0)
            RETURNING *
        `, [title.trim(), description, userId, assignedTo || null, departmentId || null, 
            startDate || null, dueDate || null, validPriority, tags || []]);
        
        console.log('✅ Task created:', result.rows[0].id);
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
        const { title, description, assignedTo, departmentId, startDate, dueDate, priority, status, progress, tags } = req.body;
        
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
router.post('/tasks/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.userId;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Введите комментарий' });
        }
        
        const result = await query(`
            INSERT INTO task_comments (task_id, user_id, content)
            VALUES ($1, $2, $3) RETURNING *
        `, [id, userId, content.trim()]);
        
        res.status(201).json({ comment: result.rows[0] });
    } catch (error) {
        console.error('Add comment error:', error);
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