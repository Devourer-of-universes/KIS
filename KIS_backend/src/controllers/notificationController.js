const { query } = require('../config/database');

// Получение уведомлений пользователя
const getNotifications = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [req.userId, parseInt(limit), parseInt(offset)]
        );
        
        const countResult = await query(
            `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
            [req.userId]
        );
        
        res.json({
            notifications: result.rows,
            unreadCount: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Ошибка получения уведомлений' });
    }
};

// Отметить как прочитанное
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        await query(
            `UPDATE notifications SET is_read = true 
             WHERE id = $1 AND user_id = $2`,
            [id, req.userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Ошибка' });
    }
};

// Отметить все как прочитанные
const markAllAsRead = async (req, res) => {
    try {
        await query(
            `UPDATE notifications SET is_read = true 
             WHERE user_id = $1 AND is_read = false`,
            [req.userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Ошибка' });
    }
};

// Получение количества непрочитанных
const getUnreadCount = async (req, res) => {
    try {
        const result = await query(
            `SELECT COUNT(*) FROM notifications 
             WHERE user_id = $1 AND is_read = false`,
            [req.userId]
        );
        
        res.json({ unreadCount: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Ошибка' });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
};