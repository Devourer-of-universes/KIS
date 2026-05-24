const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { query } = require('../config/database');

// Проверка JWT токена
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Нет токена авторизации' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Получаем полную информацию о пользователе
        const result = await query(
            `SELECT id, username, email, role_id, status, is_super_admin 
             FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        const user = result.rows[0];

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Учетная запись заблокирована' });
        }

        req.user = user;
        req.userId = user.id;
        
        // Обновляем время последней активности
        await User.updateLastSeen(user.id);
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Неверный токен' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истек' });
        }
        res.status(401).json({ error: 'Ошибка авторизации' });
    }
};

// Проверка прав администратора
const adminMiddleware = async (req, res, next) => {
    try {
        // Проверяем, что пользователь существует и имеет role_id = 1 (admin)
        const result = await query(`SELECT role_id FROM users WHERE id = $1`, [req.userId]);
        if (result.rows.length === 0 || result.rows[0].role_id !== 1) {
            return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора.' });
        }
        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Ошибка проверки прав' });
    }
};

// Опциональная аутентификация (не обязательна)
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (user && user.status === 'active') {
                req.user = user;
                req.userId = user.id;
            }
        }
        next();
    } catch (error) {
        next();
    }
};
// Проверка, что пользователь не супер-админ при редактировании
const notSuperAdminMiddleware = async (req, res, next) => {
    try {
        const targetId = req.params.id;
        const targetUser = await query(`SELECT is_super_admin FROM users WHERE id = $1`, [targetId]);
        if (targetUser.rows.length > 0 && targetUser.rows[0].is_super_admin) {
            return res.status(403).json({ error: 'Действие запрещено для супер-администратора' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
module.exports = { authMiddleware, adminMiddleware, optionalAuthMiddleware };