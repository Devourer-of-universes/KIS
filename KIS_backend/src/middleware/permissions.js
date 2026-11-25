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
            
            const resPerm = permissions[resource];
            const val = resPerm && typeof resPerm === 'object' ? resPerm[action] : resPerm;
            const hasPermission = permissions.all === true || resPerm === true || val === true || val === 'all' || (Array.isArray(val) && val.length > 0);
            if (!hasPermission) {
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
        
        const ap = permissions.admin_panel;
        const hasAdminPanel = permissions.all === true || ap === true || ap === 'all' || (ap && typeof ap === 'object' && (ap.access === true || ap.access === 'all'));
        if (!hasAdminPanel) {
            return res.status(403).json({ error: 'Доступ к панели администратора запрещён' });
        }
        
        next();
    } catch (error) {
        console.error('Admin panel access error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { checkPermission, adminPanelAccess };