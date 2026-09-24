const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');

// =====================================================
// ПОЛУЧЕНИЕ УВЕДОМЛЕНИЙ
// =====================================================
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { category, unreadOnly, limit = 50, offset = 0 } = req.query;
        
        let sql = `
            SELECT n.*, 
                   u.surname as sender_surname, 
                   u.name as sender_name,
                   u.avatar_uri as sender_avatar
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            WHERE n.user_id = $1
              AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
        `;
        
        const params = [userId];
        let idx = 2;
        
        if (category && category !== 'all') {
            sql += ` AND n.category = $${idx++}`;
            params.push(category);
        }
        
        if (unreadOnly === 'true') {
            sql += ` AND n.is_read = false`;
        }
        
        sql += ` ORDER BY n.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(sql, params);
        
        const notifications = result.rows.map(n => ({
            ...n,
            sender_name: n.sender_surname 
                ? `${n.sender_surname} ${n.sender_name || ''}`.trim() 
                : null
        }));
        
        res.json({ notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПОМЕТИТЬ КАК ПРОЧИТАННОЕ (ОДНО)
// =====================================================
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        await query(
            `UPDATE notifications SET is_read = true 
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПОМЕТИТЬ ВСЕ КАК ПРОЧИТАННЫЕ ← ЭТОТ МАРШРУТ НУЖНО ДОБАВИТЬ
// =====================================================
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        await query(
            `UPDATE notifications SET is_read = true 
             WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// УДАЛЕНИЕ УВЕДОМЛЕНИЯ
// =====================================================
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        await query(
            `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// СЧЁТЧИК НЕПРОЧИТАННЫХ
// =====================================================
router.get('/unread/count', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        const result = await query(
            `SELECT COUNT(*) FROM notifications 
             WHERE user_id = $1 AND is_read = false
               AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
            [userId]
        );
        
        res.json({ unreadCount: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;