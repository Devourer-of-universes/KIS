const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Проверка JWT токена
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Нет токена авторизации' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

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
        const isAdmin = await User.isAdmin(req.userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Требуются права администратора' });
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

module.exports = { authMiddleware, adminMiddleware, optionalAuthMiddleware };