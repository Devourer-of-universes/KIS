const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');

// Получение шаблонов пользователя
router.get('/task-templates', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        // Получаем отдел пользователя
        const user = await query(`SELECT department_id FROM users WHERE id = $1`, [userId]);
        const departmentId = user.rows[0]?.department_id;
        
        // Шаблоны: 
        // - личные пользователя
        // - общие по отделу (is_shared = true)
        // - системные (type = 'system')
        const result = await query(`
            SELECT * FROM task_templates 
            WHERE user_id = $1 
               OR (department_id = $2 AND is_shared = true)
               OR type = 'system'
            ORDER BY type, name
        `, [userId, departmentId]);
        
        res.json({ templates: result.rows });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание шаблона
router.post('/task-templates', authMiddleware, async (req, res) => {
    try {
        const { name, description, templateData, isShared } = req.body;
        const userId = req.userId;
        
        if (!name || !templateData) {
            return res.status(400).json({ error: 'Укажите название и данные шаблона' });
        }
        
        // Получаем отдел пользователя
        const user = await query(`SELECT department_id FROM users WHERE id = $1`, [userId]);
        const departmentId = user.rows[0]?.department_id;
        
        const result = await query(`
            INSERT INTO task_templates (name, description, template_data, user_id, department_id, is_shared, type)
            VALUES ($1, $2, $3, $4, $5, $6, 'custom')
            RETURNING *
        `, [name, description, templateData, userId, departmentId, isShared || false]);
        
        res.status(201).json({ template: result.rows[0] });
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление шаблона
router.put('/task-templates/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, templateData, isShared } = req.body;
        const userId = req.userId;
        
        // Проверяем права (только владелец)
        const template = await query(`SELECT user_id FROM task_templates WHERE id = $1`, [id]);
        if (template.rows.length === 0) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        if (template.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Нет прав' });
        }
        
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
        if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
        if (templateData !== undefined) { updates.push(`template_data = $${idx++}`); values.push(templateData); }
        if (isShared !== undefined) { updates.push(`is_shared = $${idx++}`); values.push(isShared); }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        
        const result = await query(`
            UPDATE task_templates SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *
        `, values);
        
        res.json({ template: result.rows[0] });
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление шаблона
router.delete('/task-templates/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        const template = await query(`SELECT user_id FROM task_templates WHERE id = $1`, [id]);
        if (template.rows.length === 0) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        if (template.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Нет прав' });
        }
        
        await query(`DELETE FROM task_templates WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Применение шаблона (увеличиваем счётчик использования)
router.post('/task-templates/:id/use', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await query(`UPDATE task_templates SET usage_count = usage_count + 1 WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Use template error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;