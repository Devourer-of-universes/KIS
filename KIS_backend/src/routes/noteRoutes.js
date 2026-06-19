const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// =====================================================
// ЗАМЕТКИ - МАРШРУТЫ
// =====================================================

// Получение личных заметок пользователя
router.get('/notes/personal', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        const result = await query(
            `SELECT n.*, u.surname, u.name 
             FROM notes n
             LEFT JOIN users u ON n.user_id = u.id
             WHERE n.user_id = $1 AND n.type = 'personal' AND n.deleted_at IS NULL
             ORDER BY n.created_at DESC`,
            [userId]
        );
        
        res.json({ notes: result.rows });
    } catch (error) {
        console.error('Get personal notes error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение общих заметок отдела
router.get('/notes/group', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        // Получаем отдел пользователя
        const userResult = await query(
            `SELECT department_id FROM users WHERE id = $1`,
            [userId]
        );
        
        const departmentId = userResult.rows[0]?.department_id;
        
        let result;
        if (departmentId) {
            result = await query(
                `SELECT n.*, u.surname, u.name 
                 FROM notes n
                 LEFT JOIN users u ON n.user_id = u.id
                 WHERE n.department_id = $1 AND n.type = 'group' AND n.deleted_at IS NULL
                 ORDER BY n.created_at DESC`,
                [departmentId]
            );
        } else {
            // Если у пользователя нет отдела — показываем пустой список
            result = { rows: [] };
        }
        
        res.json({ notes: result.rows });
    } catch (error) {
        console.error('Get group notes error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание заметки
router.post('/notes', authMiddleware, async (req, res) => {
    try {
        const { title, content, type } = req.body;
        const userId = req.userId;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Введите текст заметки' });
        }
        
        // Получаем отдел пользователя для групповых заметок
        let departmentId = null;
        if (type === 'group') {
            const userResult = await query(
                `SELECT department_id FROM users WHERE id = $1`,
                [userId]
            );
            departmentId = userResult.rows[0]?.department_id;
            
            if (!departmentId) {
                return res.status(400).json({ error: 'У вас нет отдела для создания общей заметки' });
            }
        }
        
        const noteTitle = title || content.substring(0, 30) + (content.length > 30 ? '...' : '');
        
        const result = await query(
            `INSERT INTO notes (user_id, department_id, type, title, content)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, departmentId, type, noteTitle, content.trim()]
        );
        
        res.status(201).json({ note: result.rows[0] });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление заметки
router.put('/notes/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const userId = req.userId;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Введите текст заметки' });
        }
        
        // Проверяем, что заметка принадлежит пользователю
        const checkResult = await query(
            `SELECT id FROM notes WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Заметка не найдена или нет прав' });
        }
        
        const noteTitle = title || content.substring(0, 30) + (content.length > 30 ? '...' : '');
        
        const result = await query(
            `UPDATE notes 
             SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [noteTitle, content.trim(), id]
        );
        
        res.json({ note: result.rows[0] });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление заметки (мягкое удаление)
router.delete('/notes/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        // Проверяем, что заметка принадлежит пользователю
        const checkResult = await query(
            `SELECT id FROM notes WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Заметка не найдена или нет прав' });
        }
        
        await query(
            `UPDATE notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;