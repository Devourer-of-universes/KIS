const { query } = require('../config/database');

// Проверка права доступа
const checkPermission = (resource, action = 'view') => {
    return async (req, res, next) => {
        try {
            const userId = req.userId;
            
            // Супер-админ имеет все права
            if (req.user?.is_super_admin) {
                return next();
            }
            
            // Получаем права роли пользователя
            const result = await query(
                `SELECT r.permissions 
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.id = $1`,
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Доступ запрещён' });
            }
            
            const permissions = result.rows[0].permissions || {};
            
            // Проверяем конкретное право
            const hasPermission = permissions[resource]?.[action] === true;
            
            if (!hasPermission && !permissions[resource] === true) {
                return res.status(403).json({ error: `Нет права на ${action} ресурса ${resource}` });
            }
            
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ error: error.message });
        }
    };
};

// Проверка доступа к админ-панели
const adminPanelAccess = async (req, res, next) => {
    try {
        const userId = req.userId;
        
        // Супер-админ имеет доступ
        if (req.user?.is_super_admin) {
            return next();
        }
        
        const result = await query(
            `SELECT r.permissions 
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.id = $1`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        const permissions = result.rows[0].permissions || {};
        
        if (!permissions.admin_panel) {
            return res.status(403).json({ error: 'Доступ к панели администратора запрещён' });
        }
        
        next();
    } catch (error) {
        console.error('Admin panel access error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { checkPermission, adminPanelAccess };