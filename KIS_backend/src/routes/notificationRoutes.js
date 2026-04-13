const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');

// Получение уведомлений
const getNotifications = async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [req.userId]
        );
        res.json({ notifications: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

router.use(authMiddleware);
router.get('/', getNotifications);

module.exports = router;