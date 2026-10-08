const { query } = require('../config/database');

/**
 * Проверка права в разделе documents
 * @param {string} action - ключ действия (view, create, manage_types, ...)
 * @param {boolean} checkValue - проверять ли значение (для view: all/department/own)
 */
function checkDocumentPermission(action, checkValue = null) {
    return async (req, res, next) => {
        try {
            // Супер-админ имеет все права
            if (req.user?.is_super_admin) {
                return next();
            }
            
            // Получаем права роли
            const result = await query(
                `SELECT r.permissions 
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.id = $1`,
                [req.userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Нет доступа' });
            }
            
            const permissions = result.rows[0].permissions || {};
            const docPerms = permissions.documents || {};
            
            // Проверяем конкретное действие
            const value = docPerms[action];
            
            if (value === undefined || value === false) {
                return res.status(403).json({ 
                    error: `Нет права на действие: documents.${action}` 
                });
            }
            
            // Если проверяем конкретное значение (для view: all/department/own)
            if (checkValue !== null && value !== checkValue) {
                return res.status(403).json({ 
                    error: `Недостаточно прав: нужно ${checkValue}, есть ${value}` 
                });
            }
            
            // Сохраняем права в req для дальнейшего использования
            req.documentsPermissions = docPerms;
            
            next();
        } catch (error) {
            console.error('Document permission error:', error);
            res.status(500).json({ error: error.message });
        }
    };
}

/**
 * Проверка "любого из" нескольких прав
 * Пример: checkAnyDocumentPermission(['manage_types', 'manage_templates'])
 */
function checkAnyDocumentPermission(actions) {
    return async (req, res, next) => {
        try {
            if (req.user?.is_super_admin) {
                return next();
            }
            
            const result = await query(
                `SELECT r.permissions 
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.id = $1`,
                [req.userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Нет доступа' });
            }
            
            const permissions = result.rows[0].permissions || {};
            const docPerms = permissions.documents || {};
            
            const hasAny = actions.some(action => 
                docPerms[action] === true || docPerms[action] === 'all'
            );
            
            if (!hasAny) {
                return res.status(403).json({ 
                    error: `Нужно одно из прав: ${actions.join(', ')}` 
                });
            }
            
            req.documentsPermissions = docPerms;
            
            next();
        } catch (error) {
            console.error('Document permission error:', error);
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = { checkDocumentPermission, checkAnyDocumentPermission };