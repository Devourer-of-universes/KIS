const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { checkPermission, adminPanelAccess } = require('../middleware/permissions');
const { getSystemSettings, upsertSystemSettings, resetSystemSettings } = require('../utils/systemSettings');
const { runAutoArchive } = require('../utils/documentArchiveScheduler');


// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========

// Получение всех пользователей (с пагинацией и поиском)
router.get('/users', authMiddleware, adminPanelAccess, checkPermission('users', 'view'), async (req, res) => {
    console.log('🔍 Current user:', JSON.stringify(req.user, null, 2));
    console.log('🔍 is_super_admin:', req.user?.is_super_admin);
     try {
        const { search = '', limit = 50, offset = 0 } = req.query;
        const currentUser = req.user;
        
        console.log('Current user is_super_admin:', currentUser.is_super_admin);
        
        let queryText = `
            SELECT u.id, u.username, u.surname, u.name, u.patronymic, 
                   u.email, u.tel_num, u.status, u.created_at, u.last_seen_at,
                   u.is_super_admin,
                   r.name as role_name, r.id as role_id,
                   p.name as post_name, d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN posts p ON u.post_id = p.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.deleted_at IS NULL
        `;
        const params = [];
        
        // Только если пользователь НЕ супер-админ — скрываем других супер-админов
        if (!currentUser.is_super_admin) {
            queryText += ` AND u.is_super_admin = false`;
        }
        
        if (search) {
            queryText += ` AND (u.surname ILIKE $${params.length + 1} OR u.name ILIKE $${params.length + 1} OR u.username ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }
        
        queryText += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(queryText, params);
        
        // Подсчёт общего количества
        let countQuery = `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`;
        if (!currentUser.is_super_admin) {
            countQuery += ` AND is_super_admin = false`;
        }
        const countResult = await query(countQuery);
        
        res.json({ 
            users: result.rows, 
            total: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение пользователя по ID
router.get('/users/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        
        const result = await query(
            `SELECT u.id, u.username, u.surname, u.name, u.patronymic, 
                    u.email, u.tel_num, u.status, u.created_at, u.birthday,
                    u.start_date, u.is_super_admin,
                    r.name as role_name, r.id as role_id,
                    p.name as post_name, d.name as department_name
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             LEFT JOIN posts p ON u.post_id = p.id
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const user = result.rows[0];
        
        // Если запрашивают супер-админа, а текущий пользователь не супер-админ
        if (user.is_super_admin && !currentUser.is_super_admin) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        delete user.password_hash;
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Получение истории действий пользователя (только для админпанели)
router.get('/users/:id/history', authMiddleware, adminPanelAccess, checkPermission('users', 'view'), async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await query(
            `SELECT id, action, entity_type, entity_id, old_data, new_data,
                    to_char(created_at, 'DD.MM.YYYY HH24:MI:SS') as created_at,
                    ip_address, user_agent
             FROM audit_logs
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [id, parseInt(limit), parseInt(offset)]
        );
        
        const countResult = await query(
            `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`,
            [id]
        );
        
        res.json({ 
            history: result.rows,
            total: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get user history error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Создание пользователя (админом)
router.post('/users', authMiddleware, adminPanelAccess, checkPermission('users', 'create'), async (req, res) => {
    try {
        const { 
            username, surname, name, patronymic, birthday, 
            postId, departmentId, email, telNum, password, roleId = 2,
            startDate
        } = req.body;
        
        if (!username || !surname || !name || !email || !telNum || !password) {
            return res.status(400).json({ error: 'Заполните все обязательные поля' });
        }
        
        // Проверка уникальности
        const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email уже используется' });
        }
        
        const existingUsername = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUsername.rows.length > 0) {
            return res.status(400).json({ error: 'Имя пользователя уже занято' });
        }
        
        const existingPhone = await query('SELECT id FROM users WHERE tel_num = $1', [telNum]);
        if (existingPhone.rows.length > 0) {
            return res.status(400).json({ error: 'Телефон уже используется' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const result = await query(
            `INSERT INTO users (username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, role_id, status, start_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12)
             RETURNING id, username, surname, name, email, tel_num, status, role_id`,
            [username, surname, name, patronymic || null, birthday, postId || null, departmentId || null, email, telNum, passwordHash, roleId, startDate || null]
        );
        
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST /users/change-password — для смены своего пароля
router.post('/users/change-password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.userId;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Укажите старый и новый пароль' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
        }
        
        // Получаем пользователя
        const userResult = await query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Проверяем старый пароль
        const isValid = await bcrypt.compare(oldPassword, userResult.rows[0].password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный старый пароль' });
        }
        
        // Хэшируем и сохраняем новый пароль
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);
        
        await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
        
        res.json({ success: true, message: 'Пароль успешно изменён' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Обновление пользователя (только личные данные, контакты, роль, статус)
router.put('/users/:id', authMiddleware, adminPanelAccess, checkPermission('users', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const { surname, name, patronymic, email, telNum, roleId, status } = req.body;
        
        // Получаем информацию о редактируемом пользователе
        const targetUser = await query(`SELECT is_super_admin FROM users WHERE id = $1`, [id]);
        if (targetUser.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const isSuperAdmin = targetUser.rows[0].is_super_admin;
        
        // Запрещаем редактирование супер-админа (кроме него самого)
        if (isSuperAdmin && !currentUser.is_super_admin) {
            return res.status(403).json({ error: 'Нельзя редактировать супер-администратора' });
        }
        
        // Если это супер-админ редактирует себя — разрешаем только пароль
        if (currentUser.is_super_admin && parseInt(id) === currentUser.id) {
            // Можно обновлять только пароль через отдельный эндпоинт
            return res.status(400).json({ error: 'Изменение данных через этот эндпоинт запрещено. Используйте /profile для смены пароля' });
        }
        
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (surname !== undefined) { updates.push(`surname = $${idx++}`); values.push(surname); }
        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
        if (patronymic !== undefined) { updates.push(`patronymic = $${idx++}`); values.push(patronymic); }
        if (email !== undefined) { updates.push(`email = $${idx++}`); values.push(email); }
        if (telNum !== undefined) { updates.push(`tel_num = $${idx++}`); values.push(telNum); }
        if (roleId !== undefined) { updates.push(`role_id = $${idx++}`); values.push(roleId); }
        if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
        
        // НЕ ОБНОВЛЯЕМ department_id и post_id
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        values.push(id);
        
        const result = await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, surname, name, email, tel_num, status, role_id, post_id, department_id`,
            values
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Сброс пароля
router.post('/users/:id/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }
        
        // Проверяем, не супер-админ ли
        const targetUser = await query(`SELECT is_super_admin FROM users WHERE id = $1`, [id]);
        if (targetUser.rows.length > 0 && targetUser.rows[0].is_super_admin && req.userId != id) {
            return res.status(403).json({ error: 'Нельзя изменить пароль супер-администратора' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        
        await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);
        
        res.json({ success: true, message: 'Пароль успешно изменён' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление пользователя (мягкое удаление)
router.delete('/users/:id', authMiddleware, adminPanelAccess, checkPermission('users', 'delete'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, не супер-админ ли
        const targetUser = await query(`SELECT is_super_admin FROM users WHERE id = $1`, [id]);
        if (targetUser.rows.length > 0 && targetUser.rows[0].is_super_admin) {
            return res.status(403).json({ error: 'Нельзя удалить супер-администратора' });
        }
        
        await query(`UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: error.message });
    }
});


// ========== УПРАВЛЕНИЕ РОЛЯМИ ==========

// Получение всех ролей
router.get('/roles', authMiddleware, async (req, res) => {
    try {
        const result = await query(`SELECT id, name, permissions FROM roles ORDER BY id`);
        console.log('Roles found:', result.rows.length); // Для отладки
        res.json({ roles: result.rows });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание роли
router.post('/roles', authMiddleware, async (req, res) => {
    try {
        const { name, permissions } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Укажите название роли' });
        }
        
        const result = await query(
            `INSERT INTO roles (name, permissions) VALUES ($1, $2) RETURNING *`,
            [name.trim(), permissions || '{}']
        );
        
        res.status(201).json({ role: result.rows[0] });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Получение роли по ID
router.get('/roles/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT id, name, permissions, created_at FROM roles WHERE id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Роль не найдена' });
        }
        
        res.json({ role: result.rows[0] });
    } catch (error) {
        console.error('Get role by id error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Обновление роли
router.put('/roles/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, permissions } = req.body;
        
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (name !== undefined) {
            updates.push(`name = $${idx++}`);
            values.push(name.trim());
        }
        if (permissions !== undefined) {
            updates.push(`permissions = $${idx++}`);
            values.push(permissions);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        values.push(id);
        
        const result = await query(
            `UPDATE roles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        
        res.json({ role: result.rows[0] });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Удаление роли
router.delete('/roles/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, есть ли пользователи с этой ролью
        const usersCount = await query(`SELECT COUNT(*) FROM users WHERE role_id = $1`, [id]);
        if (parseInt(usersCount.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Нельзя удалить роль, у которой есть пользователи' });
        }
        
        await query(`DELETE FROM roles WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Получение прав роли
router.get('/roles/:id/permissions', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT permissions FROM roles WHERE id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Роль не найдена' });
        }
        
        res.json({ permissions: result.rows[0].permissions || {} });
    } catch (error) {
        console.error('Get role permissions error:', error);
        res.status(500).json({ error: error.message });
    }
});


// ========== УПРАВЛЕНИЕ ПОДРАЗДЕЛЕНИЯМИ ==========
router.get('/structure', authMiddleware, async (req, res) => {
    try {
        // Получаем все подразделения
        const departments = await query(`SELECT * FROM departments ORDER BY id`);
        
        // Получаем всех пользователей с их должностями и ролями
        const users = await query(`
            SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri, 
                   u.status, u.department_id, 
                   p.name as post_name,
                   r.name as role_name
            FROM users u
            LEFT JOIN posts p ON u.post_id = p.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.deleted_at IS NULL
        `);
        
        // Строим карту пользователей
        const usersMap = new Map();
        for (const user of users.rows) {
            usersMap.set(user.id, user);
        }
        
        // Строим дерево подразделений
        const deptMap = new Map();
        const roots = [];
        
        for (const dept of departments.rows) {
            deptMap.set(dept.id, { 
                ...dept, 
                children: [], 
                employees: [],
                manager: dept.manager_id ? usersMap.get(dept.manager_id) : null
            });
        }
        
        // Добавляем сотрудников в отделы и отдельно собираем "без отдела"
        const unassignedEmployees = [];
        
        for (const user of users.rows) {
            if (user.department_id && deptMap.has(user.department_id)) {
                deptMap.get(user.department_id).employees.push(user);
            } else {
                unassignedEmployees.push(user);
            }
        }
        
        // Строим иерархию
        for (const [id, dept] of deptMap) {
            if (dept.parent_department_id && deptMap.has(dept.parent_department_id)) {
                deptMap.get(dept.parent_department_id).children.push(dept);
            } else {
                roots.push(dept);
            }
        }
        
        // Добавляем виртуальную секцию "Без отдела"
        const result = {
            structure: roots,
            unassigned: unassignedEmployees
        };
        
        res.json(result);
    } catch (error) {
        console.error('Get structure error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Получение структуры подразделений
router.get('/departments/tree', authMiddleware, async (req, res) => {
    try {
        const result = await query(`SELECT * FROM departments ORDER BY id`);
        
        // Строим дерево
        const departments = result.rows;
        const map = new Map();
        const roots = [];
        
        for (const dept of departments) {
            map.set(dept.id, { ...dept, children: [], employees: [] });
        }
        
        for (const dept of departments) {
            if (dept.parent_department_id && map.has(dept.parent_department_id)) {
                map.get(dept.parent_department_id).children.push(map.get(dept.id));
            } else {
                roots.push(map.get(dept.id));
            }
        }
        
        // Добавляем сотрудников в отделы
        const employees = await query(`
            SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri, 
                   u.status, p.name as post_name, u.post_id, u.department_id
            FROM users u
            LEFT JOIN posts p ON u.post_id = p.id
            WHERE u.deleted_at IS NULL
        `);
        
        for (const emp of employees.rows) {
            if (map.has(emp.department_id)) {
                map.get(emp.department_id).employees.push(emp);
            }
        }
        
        res.json({ structure: roots });
    } catch (error) {
        console.error('Get structure error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Перемещение сотрудника в другой отдел
router.put('/employees/:id/move', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { departmentId, postId } = req.body;
        
        await query(
            `UPDATE users SET department_id = $1, post_id = $2 WHERE id = $3`,
            [departmentId, postId, id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Move employee error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание подразделения
router.post('/departments', authMiddleware, async (req, res) => {
    try {
        const { name, parentDepartmentId } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Укажите название подразделения' });
        }
        if (parentDepartmentId && parentDepartmentId == id) {
            return res.status(400).json({ error: 'Нельзя назначить подразделение родителем самого себя' });
        }
        const result = await query(
            `INSERT INTO departments (name, parent_department_id) VALUES ($1, $2) RETURNING *`,
            [name.trim(), parentDepartmentId || null]
        );
        
        res.status(201).json({ department: result.rows[0] });
    } catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Получение плоского списка подразделений (для селекта)
router.get('/departments/list', authMiddleware, async (req, res) => {
    try {
        const result = await query(`
            WITH RECURSIVE dept_tree AS (
                SELECT id, name, parent_department_id, 0 as level, ARRAY[id] as path
                FROM departments 
                WHERE parent_department_id IS NULL
                
                UNION ALL
                
                SELECT d.id, d.name, d.parent_department_id, dt.level + 1, dt.path || d.id
                FROM departments d
                JOIN dept_tree dt ON d.parent_department_id = dt.id
                WHERE NOT (d.id = ANY(dt.path))  -- Защита от циклов
            )
            SELECT id, name, level FROM dept_tree ORDER BY level, name
        `);
        
        res.json({ departments: result.rows });
    } catch (error) {
        console.error('Get departments list error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Обновление подразделения
router.put('/departments/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, parentDepartmentId, code, description, managerId, managerPosition, email, phone, location } = req.body;
        if (parentDepartmentId && parentDepartmentId == id) {
            return res.status(400).json({ error: 'Нельзя назначить подразделение родителем самого себя' });
        }
        // Если назначен руководитель, обновляем его должность
        if (managerId && managerPosition) {
            // Ищем или создаём должность с указанным названием
            let postResult = await query(
                `SELECT id FROM posts WHERE name = $1 AND department_id = $2`,
                [managerPosition, id]
            );
            
            let postId = null;
            if (postResult.rows.length === 0) {
                const newPost = await query(
                    `INSERT INTO posts (name, department_id) VALUES ($1, $2) RETURNING id`,
                    [managerPosition, id]
                );
                postId = newPost.rows[0].id;
            } else {
                postId = postResult.rows[0].id;
            }
            
            // Обновляем должность пользователя
            await query(`UPDATE users SET post_id = $1 WHERE id = $2`, [postId, managerId]);
        }
        
        // Обновляем подразделение (сохраняем managerPosition в отдельном поле для отображения)
        const result = await query(
            `UPDATE departments 
             SET name = $1, parent_department_id = $2, code = $3, description = $4, 
                 manager_id = $5, manager_position = $6, email = $7, phone = $8, location = $9
             WHERE id = $10 
             RETURNING *`,
            [name, parentDepartmentId || null, code, description, managerId || null, managerPosition || null, email, phone, location, id]
        );
        
        res.json({ department: result.rows[0] });
    } catch (error) {
        console.error('Update department error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Получение подразделения по ID
router.get('/departments/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT * FROM departments WHERE id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Подразделение не найдено' });
        }
        
        res.json({ department: result.rows[0] });
    } catch (error) {
        console.error('Get department error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Удаление подразделения
router.delete('/departments/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Проверяем дочерние подразделения
        const children = await query(`SELECT id FROM departments WHERE parent_department_id = $1`, [id]);
        if (children.rows.length > 0) {
            return res.status(400).json({ error: 'Сначала удалите дочерние подразделения' });
        }
        
        // 2. Получаем сотрудников отдела
        const employees = await query(`SELECT id FROM users WHERE department_id = $1`, [id]);
        
        if (employees.rows.length > 0) {
            // Убираем department_id у сотрудников
            await query(`UPDATE users SET department_id = NULL WHERE department_id = $1`, [id]);
        }
        
        // 3. Получаем должности этого отдела
        const posts = await query(`SELECT id FROM posts WHERE department_id = $1`, [id]);
        
        if (posts.rows.length > 0) {
            const postIds = posts.rows.map(p => p.id);
            // Сначала отвязываем пользователей от этих должностей
            await query(`UPDATE users SET post_id = NULL WHERE post_id = ANY($1::int[])`, [postIds]);
            // Затем удаляем должности
            await query(`DELETE FROM posts WHERE department_id = $1`, [id]);
        }
        
        // 4. Удаляем само подразделение
        await query(`DELETE FROM departments WHERE id = $1`, [id]);
        
        res.json({ success: true, message: 'Подразделение удалено' });
    } catch (error) {
        console.error('Delete department error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Получение сотрудников отдела
router.get('/departments/:id/employees', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(`
            SELECT u.id, u.surname, u.name, u.patronymic 
            FROM users u
            WHERE u.department_id = $1 AND u.deleted_at IS NULL
            ORDER BY u.surname, u.name
        `, [id]);
        
        res.json({ employees: result.rows });
    } catch (error) {
        console.error('Get department employees error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== МОЙ ОТДЕЛ (РУКОВОДИТЕЛЬ) ==========
async function getManagedDepartmentIds(userId) {
    const managed = await query(`SELECT id FROM departments WHERE manager_id = $1`, [userId]);
    if (managed.rows.length === 0) return null;
    const rootId = managed.rows[0].id;
    const all = await query(`SELECT id, parent_department_id FROM departments`);
    const children = new Map();
    for (const d of all.rows) {
        const p = d.parent_department_id;
        if (!children.has(p)) children.set(p, []);
        children.get(p).push(d.id);
    }
    const ids = [];
    const stack = [rootId];
    const seen = new Set();
    while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        ids.push(cur);
        for (const ch of (children.get(cur) || [])) stack.push(ch);
    }
    return { rootId, ids };
}

router.get('/my-department', authMiddleware, async (req, res) => {
    try {
        const info = await getManagedDepartmentIds(req.userId);
        if (!info) return res.json({ managed: false });

        const deptRes = await query(`SELECT * FROM departments WHERE id = $1`, [info.rootId]);
        const departments = await query(`SELECT * FROM departments WHERE id = ANY($1::int[]) ORDER BY id`, [info.ids]);
        const users = await query(`
            SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri, u.status, u.department_id,
                   u.email, u.tel_num, u.last_seen_at,
                   p.name as post_name, r.name as role_name
            FROM users u
            LEFT JOIN posts p ON u.post_id = p.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.deleted_at IS NULL AND u.department_id = ANY($1::int[])
            ORDER BY u.surname, u.name
        `, [info.ids]);

        const usersMap = new Map();
        for (const u of users.rows) usersMap.set(u.id, u);
        const deptMap = new Map();
        for (const d of departments.rows) {
            deptMap.set(d.id, { ...d, children: [], employees: [], manager: d.manager_id ? usersMap.get(d.manager_id) || null : null });
        }
        for (const u of users.rows) {
            if (deptMap.has(u.department_id)) deptMap.get(u.department_id).employees.push(u);
        }
        let root = null;
        for (const d of deptMap.values()) {
            if (d.id === info.rootId) root = d;
            if (d.parent_department_id && deptMap.has(d.parent_department_id)) deptMap.get(d.parent_department_id).children.push(d);
        }

        res.json({ managed: true, department: deptRes.rows[0] || null, structure: root, employee_count: users.rows.length, department_ids: info.ids });
    } catch (error) {
        console.error('Get my department error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/my-department/stats', authMiddleware, async (req, res) => {
    try {
        const info = await getManagedDepartmentIds(req.userId);
        if (!info) return res.json({ managed: false });

        const clampDays = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(3650, Math.max(1, n)) : 30; };
        let fromDate, toDate;
        const now = new Date();
        if (req.query.from || req.query.to) {
            const fromRaw = req.query.from ? new Date(req.query.from) : new Date(now.getTime() - 30 * 86400000);
            const toRaw = req.query.to ? new Date(req.query.to) : now;
            fromDate = isNaN(fromRaw.getTime()) ? new Date(now.getTime() - 30 * 86400000) : fromRaw;
            toDate = isNaN(toRaw.getTime()) ? now : toRaw;
        } else {
            const days = clampDays(req.query.days || 30);
            toDate = now; fromDate = new Date(now.getTime() - days * 86400000);
        }
        if (fromDate > toDate) { const t = fromDate; fromDate = toDate; toDate = t; }
        const toInc = new Date(toDate); toInc.setHours(23,59,59,999);
        const fromIso = fromDate.toISOString(); const toIso = toInc.toISOString();
        const days = Math.max(1, Math.ceil((toInc - fromDate) / 86400000));
        const ids = info.ids;
        const safe = async (fn, fb) => { try { return await fn(); } catch (e) { console.warn('My-dept stats query failed:', e.message); return fb; } };

        const employeesTotal = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL AND department_id = ANY($1::int[])`, [ids])).rows[0].c, 0);
        const employeesActive = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL AND status='active' AND department_id = ANY($1::int[])`, [ids])).rows[0].c, 0);

        const tasksTotal = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM tasks WHERE deleted_at IS NULL AND department_id = ANY($1::int[])`, [ids])).rows[0].c, 0);
        const tasksPeriod = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM tasks WHERE deleted_at IS NULL AND department_id = ANY($1::int[]) AND created_at >= $2 AND created_at <= $3`, [ids, fromIso, toIso])).rows[0].c, 0);
        const tasksOverdue = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM tasks WHERE deleted_at IS NULL AND department_id = ANY($1::int[]) AND status NOT IN ('completed','cancelled') AND due_date < CURRENT_DATE`, [ids])).rows[0].c, 0);
        const tasksCompletedPeriod = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM tasks WHERE deleted_at IS NULL AND department_id = ANY($1::int[]) AND status='completed' AND completed_at >= $2 AND completed_at <= $3`, [ids, fromIso, toIso])).rows[0].c, 0);
        const tasksByStatus = await safe(async () => (await query(`SELECT COALESCE(status,'unknown') status, COUNT(*)::int count FROM tasks WHERE deleted_at IS NULL AND department_id = ANY($1::int[]) AND created_at >= $2 AND created_at <= $3 GROUP BY 1 ORDER BY count DESC`, [ids, fromIso, toIso])).rows, []);
        const tasksOverTime = await safe(async () => (await query(`SELECT to_char(date_trunc('day',created_at),'YYYY-MM-DD') day, COUNT(*)::int count FROM tasks WHERE deleted_at IS NULL AND department_id = ANY($1::int[]) AND created_at >= $2 AND created_at <= $3 GROUP BY 1 ORDER BY 1`, [ids, fromIso, toIso])).rows, []);

        const docsPeriod = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM documents WHERE deleted_at IS NULL AND department_id = ANY($1::int[]) AND created_at >= $2 AND created_at <= $3`, [ids, fromIso, toIso])).rows[0].c, 0);
        const docsByStatus = await safe(async () => (await query(`SELECT COALESCE(status,'unknown') status, COUNT(*)::int count FROM documents WHERE deleted_at IS NULL AND department_id = ANY($1::int[]) AND created_at >= $2 AND created_at <= $3 GROUP BY 1 ORDER BY count DESC`, [ids, fromIso, toIso])).rows, []);
        const docsOverTime = await safe(async () => (await query(`SELECT to_char(date_trunc('day',created_at),'YYYY-MM-DD') day, COUNT(*)::int count FROM documents WHERE deleted_at IS NULL AND department_id = ANY($1::int[]) AND created_at >= $2 AND created_at <= $3 GROUP BY 1 ORDER BY 1`, [ids, fromIso, toIso])).rows, []);

        res.json({
            managed: true,
            period: { from: fromIso, to: toIso, days },
            kpis: { employees_total: employeesTotal, employees_active: employeesActive, tasks_total: tasksTotal, tasks_period: tasksPeriod, tasks_overdue: tasksOverdue, tasks_completed_period: tasksCompletedPeriod, documents_period: docsPeriod },
            charts: { tasks_by_status: tasksByStatus, tasks_over_time: tasksOverTime, documents_by_status: docsByStatus, documents_over_time: docsOverTime }
        });
    } catch (error) {
        console.error('Get my department stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== УПРАВЛЕНИЕ ДОЛЖНОСТЯМИ ==========
// Получение всех должностей
router.get('/posts', authMiddleware, async (req, res) => {
    try {
        const result = await query(`
            SELECT p.id, p.name, p.department_id, d.name as department_name
            FROM posts p
            LEFT JOIN departments d ON p.department_id = d.id
            ORDER BY d.name, p.name
        `);
        res.json({ posts: result.rows });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание должности
router.post('/posts', authMiddleware, async (req, res) => {
    try {
        const { name, departmentId } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Укажите название должности' });
        }
        
        const result = await query(
            `INSERT INTO posts (name, department_id) VALUES ($1, $2) RETURNING *`,
            [name.trim(), departmentId || null]
        );
        
        res.status(201).json({ post: result.rows[0] });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление должности
router.delete('/posts/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const users = await query(`SELECT id FROM users WHERE post_id = $1`, [id]);
        if (users.rows.length > 0) {
            return res.status(400).json({ error: 'У этой должности есть сотрудники' });
        }
        
        await query(`DELETE FROM posts WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: error.message });
    }
});



// Получение должностей по отделу
router.get('/posts/department/:departmentId', authMiddleware, async (req, res) => {
    try {
        const { departmentId } = req.params;
        
        const result = await query(
            `SELECT id, name FROM posts WHERE department_id = $1 ORDER BY name`,
            [departmentId]
        );
        
        res.json({ posts: result.rows });
    } catch (error) {
        console.error('Get posts by department error:', error);
        res.status(500).json({ error: error.message });
    }
});






// ========== СИСТЕМНЫЕ НАСТРОЙКИ ==========

// Получение всех настроек
// Получение всех настроек (только для админпанели)
router.get('/settings', authMiddleware, adminPanelAccess, async (req, res) => {
    try {
        const settings = await getSystemSettings();
        res.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление настроек (только известные ключи)
router.put('/settings', authMiddleware, adminPanelAccess, async (req, res) => {
    try {
        const updates = await upsertSystemSettings(req.body, req.userId);
        req.audit = { action: 'UPDATE settings', entityType: 'settings', newData: updates };
        res.json({ success: true, message: 'Настройки сохранены', updated: Object.keys(updates) });
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Сброс настроек к значениям по умолчанию
router.post('/settings/reset', authMiddleware, adminPanelAccess, async (req, res) => {
    try {
        await resetSystemSettings(req.userId);
        req.audit = { action: 'RESET settings', entityType: 'settings' };
        res.json({ success: true, message: 'Настройки сброшены' });
    } catch (error) {
        console.error('Reset settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== НАСТРОЙКИ ДОКУМЕНТООБОРОТА (СТРАНИЦА ДЕЛОПРОИЗВОДСТВА) ==========

const docflowAccess = checkPermission('docflow_page', 'access');

router.get('/docflow/settings', authMiddleware, docflowAccess, async (req, res) => {
    try {
        const settings = await getSystemSettings();
        res.json({ settings: {
            auto_archive_enabled: settings.auto_archive_enabled,
            auto_archive_days: settings.auto_archive_days,
            deadline_control_days: settings.deadline_control_days,
            max_file_size: settings.max_file_size,
            allowed_file_types: settings.allowed_file_types
        } });
    } catch (error) {
        console.error('Get docflow settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/docflow/settings', authMiddleware, docflowAccess, async (req, res) => {
    try {
        const updates = {};
        const body = req.body || {};
        if ('auto_archive_enabled' in body) updates.auto_archive_enabled = Boolean(body.auto_archive_enabled);
        if ('auto_archive_days' in body) {
            const days = Number(body.auto_archive_days);
            if (!Number.isFinite(days)) return res.status(400).json({ error: 'Некорректный срок архивации' });
            updates.auto_archive_days = Math.min(3650, Math.max(30, Math.trunc(days)));
        }
        if ('deadline_control_days' in body) {
            const days = Number(body.deadline_control_days);
            if (!Number.isFinite(days)) return res.status(400).json({ error: 'Некорректный порог контроля сроков' });
            updates.deadline_control_days = Math.min(365, Math.max(1, Math.trunc(days)));
        }
        if ('max_file_size' in body) {
            const size = Number(body.max_file_size);
            if (!Number.isFinite(size)) return res.status(400).json({ error: 'Некорректный размер файла' });
            updates.max_file_size = Math.min(500, Math.max(1, Math.trunc(size)));
        }
        if ('allowed_file_types' in body) {
            updates.allowed_file_types = Array.isArray(body.allowed_file_types)
                ? body.allowed_file_types.map(x => String(x).toLowerCase())
                : [];
        }
        const saved = await upsertSystemSettings(updates, req.userId);
        req.audit = { action: 'UPDATE docflow settings', entityType: 'settings', newData: saved };
        res.json({ success: true, message: 'Настройки документооборота сохранены', settings: saved });
    } catch (error) {
        console.error('Save docflow settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/docflow/auto-archive/run', authMiddleware, docflowAccess, async (req, res) => {
    try {
        const result = await runAutoArchive();
        req.audit = { action: 'RUN auto archive', entityType: 'settings', newData: result };
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Manual auto archive error:', error);
        res.status(500).json({ error: error.message });
    }
});


// ========== ЛОГИ И СТАТИСТИКА ==========

// Получение логов (только для админпанели)
router.get('/logs', authMiddleware, adminPanelAccess, checkPermission('users', 'view'), async (req, res) => {
    try {
        const { limit = 100, offset = 0, filter = '' } = req.query;
        const pattern = filter ? `%${String(filter).slice(0, 100)}%` : null;
        
        const result = await query(
            `SELECT id, user_id, action, entity_type, entity_id, old_data, new_data,
                    to_char(created_at, 'DD.MM.YYYY HH24:MI:SS') as created_at,
                    ip_address, user_agent
             FROM audit_logs
             WHERE ($3::text IS NULL OR action ILIKE $3)
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [parseInt(limit), parseInt(offset), pattern]
        );
        
        res.json({ logs: result.rows });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение статистики
router.get('/stats', authMiddleware, adminPanelAccess, checkPermission('stats', 'view'), async (req, res) => {
    try {
        const stats = {};
        const totalUsers = await query(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`);
        stats.total_users = parseInt(totalUsers.rows[0].count);
        const activeUsers = await query(`
            SELECT COUNT(*) FROM users 
            WHERE last_seen_at > NOW() - INTERVAL '1 day' AND deleted_at IS NULL
        `);
        stats.active_users = parseInt(activeUsers.rows[0].count);
        const totalChats = await query(`SELECT COUNT(*) FROM chats`);
        stats.total_chats = parseInt(totalChats.rows[0].count);
        const groupChats = await query(`SELECT COUNT(*) FROM chats WHERE is_group = true`);
        stats.group_chats = parseInt(groupChats.rows[0].count);
        const privateChats = await query(`SELECT COUNT(*) FROM chats WHERE is_group = false`);
        stats.private_chats = parseInt(privateChats.rows[0].count);
        const totalMessages = await query(`SELECT COUNT(*) FROM messages WHERE is_deleted = false`);
        stats.total_messages = parseInt(totalMessages.rows[0].count);
        const totalFiles = await query(`SELECT COUNT(*) FROM message_attachments`);
        stats.total_files = parseInt(totalFiles.rows[0].count);
        const blockedUsers = await query(`SELECT COUNT(*) FROM users WHERE status = 'blocked' AND deleted_at IS NULL`);
        stats.blocked_users = parseInt(blockedUsers.rows[0].count);
        const newUsersMonth = await query(`
            SELECT COUNT(*) FROM users 
            WHERE created_at > NOW() - INTERVAL '30 days' AND deleted_at IS NULL
        `);
        stats.new_users_month = parseInt(newUsersMonth.rows[0].count);
        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Детальная аналитика для вкладки "Отчёты"
router.get('/reports', authMiddleware, adminPanelAccess, checkPermission('stats', 'view'), async (req, res) => {
    try {
        const clampDays = (v) => {
            const n = parseInt(v, 10);
            if (!Number.isFinite(n)) return 30;
            return Math.min(3650, Math.max(1, n));
        };
        let fromDate; let toDate;
        const now = new Date();
        if (req.query.from || req.query.to) {
            const fromRaw = req.query.from ? new Date(req.query.from) : new Date(now.getTime() - 30 * 86400000);
            const toRaw = req.query.to ? new Date(req.query.to) : now;
            fromDate = isNaN(fromRaw.getTime()) ? new Date(now.getTime() - 30 * 86400000) : fromRaw;
            toDate = isNaN(toRaw.getTime()) ? now : toRaw;
        } else {
            const days = clampDays(req.query.days || 30);
            toDate = now;
            fromDate = new Date(now.getTime() - days * 86400000);
        }
        if (fromDate > toDate) { const tmp = fromDate; fromDate = toDate; toDate = tmp; }
        const toDateInclusive = new Date(toDate);
        toDateInclusive.setHours(23,59,59,999);
        const fromIso = fromDate.toISOString();
        const toIso = toDateInclusive.toISOString();
        const days = Math.max(1, Math.ceil((toDateInclusive - fromDate) / 86400000));

        const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { console.warn('Report query failed:', e.message); return fallback; } };

        const totalUsers = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL`)).rows[0].c, 0);
        const activeUsersPeriod = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL AND last_seen_at >= $1 AND last_seen_at <= $2`, [fromIso, toIso])).rows[0].c, 0);
        const newUsersPeriod = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2`, [fromIso, toIso])).rows[0].c, 0);

        const docsTotal = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM documents WHERE deleted_at IS NULL`)).rows[0].c, 0);
        const docsPeriod = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM documents WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2`, [fromIso, toIso])).rows[0].c, 0);
        const docsByStatus = await safe(async () => (await query(`
            SELECT COALESCE(status,'unknown') AS status, COUNT(*)::int AS count
            FROM documents WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2
            GROUP BY COALESCE(status,'unknown') ORDER BY count DESC
        `, [fromIso, toIso])).rows, []);
        const docsOverTime = await safe(async () => (await query(`
            SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
            FROM documents WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2
            GROUP BY 1 ORDER BY 1
        `, [fromIso, toIso])).rows, []);
        const docsByType = await safe(async () => (await query(`
            SELECT COALESCE(dt.name,'Без типа') AS name, COUNT(*)::int AS count
            FROM documents d LEFT JOIN document_types dt ON d.document_type_id = dt.id
            WHERE d.deleted_at IS NULL AND d.created_at >= $1 AND d.created_at <= $2
            GROUP BY COALESCE(dt.name,'Без типа') ORDER BY count DESC LIMIT 10
        `, [fromIso, toIso])).rows, []);

        const tasksTotal = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM tasks WHERE deleted_at IS NULL`)).rows[0].c, 0);
        const tasksPeriod = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM tasks WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2`, [fromIso, toIso])).rows[0].c, 0);
        const tasksCompletedPeriod = await safe(async () => (await query(`
            SELECT COUNT(*)::int AS c FROM tasks
            WHERE deleted_at IS NULL AND status='completed' AND completed_at >= $1 AND completed_at <= $2
        `, [fromIso, toIso])).rows[0].c, 0);
        const tasksByStatus = await safe(async () => (await query(`
            SELECT COALESCE(status,'unknown') AS status, COUNT(*)::int AS count
            FROM tasks WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2
            GROUP BY COALESCE(status,'unknown') ORDER BY count DESC
        `, [fromIso, toIso])).rows, []);
        const tasksByPriority = await safe(async () => (await query(`
            SELECT COALESCE(priority,'unknown') AS priority, COUNT(*)::int AS count
            FROM tasks WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2
            GROUP BY COALESCE(priority,'unknown') ORDER BY count DESC
        `, [fromIso, toIso])).rows, []);
        const tasksOverTime = await safe(async () => (await query(`
            SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
            FROM tasks WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2
            GROUP BY 1 ORDER BY 1
        `, [fromIso, toIso])).rows, []);

        const messagesPeriod = await safe(async () => (await query(`SELECT COUNT(*)::int AS c FROM messages WHERE is_deleted = false AND created_at >= $1 AND created_at <= $2`, [fromIso, toIso])).rows[0].c, 0);
        const messagesOverTime = await safe(async () => (await query(`
            SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
            FROM messages WHERE is_deleted = false AND created_at >= $1 AND created_at <= $2
            GROUP BY 1 ORDER BY 1
        `, [fromIso, toIso])).rows, []);

        const avgApprovalDays = await safe(async () => {
            const r = await query(`
                SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 86400) AS avg_days
                FROM workflow_instances
                WHERE status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
                  AND completed_at >= $1 AND completed_at <= $2
            `, [fromIso, toIso]);
            const v = r.rows[0]?.avg_days;
            return v == null ? null : Number(v);
        }, null);

        res.json({
            period: { from: fromIso, to: toIso, days },
            kpis: {
                total_users: totalUsers,
                active_users_period: activeUsersPeriod,
                new_users_period: newUsersPeriod,
                documents_total: docsTotal,
                documents_period: docsPeriod,
                tasks_total: tasksTotal,
                tasks_period: tasksPeriod,
                tasks_completed_period: tasksCompletedPeriod,
                messages_period: messagesPeriod,
                avg_approval_days: avgApprovalDays
            },
            charts: {
                documents_by_status: docsByStatus,
                documents_over_time: docsOverTime,
                documents_by_type: docsByType,
                tasks_by_status: tasksByStatus,
                tasks_by_priority: tasksByPriority,
                tasks_over_time: tasksOverTime,
                messages_over_time: messagesOverTime
            }
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== РЕЗЕРВНОЕ КОПИРОВАНИЕ ==========

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Создание резервной копии
router.post('/backup/create', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const backupDir = path.join(__dirname, '../../backups');
        
        // Создаём папку для бэкапов, если её нет
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const dbName = process.env.DB_NAME || 'corporate_messenger';
        const dbUser = process.env.DB_USER || 'messenger_user';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 5432;
        
        const backupFilename = `backup_${timestamp}.sql`;
        const backupPath = path.join(backupDir, backupFilename);
        
        // Оптимальные параметры pg_dump для надёжного восстановления
        // --clean - добавляет DROP TABLE перед CREATE TABLE
        // --if-exists - не падает, если таблицы нет
        // --no-owner - убирает владельцев
        // --no-privileges - убирает права доступа
        const dumpCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} \
            --clean --if-exists \
            --no-owner --no-privileges \
            --exclude-table-data='*backups*' \
            -f "${backupPath}"`;
        
        process.env.PGPASSWORD = process.env.DB_PASSWORD;
        
        console.log('📦 Creating backup...');
        const { stdout, stderr } = await execPromise(dumpCmd);
        
        if (stderr && !stderr.includes('set_config')) {
            console.error('Backup stderr:', stderr);
        }
        
        const stats = fs.statSync(backupPath);
        const fileSize = stats.size;
        
        // Сохраняем информацию о бэкапе
        await query(
            `INSERT INTO backups (filename, filepath, size_bytes, created_by, status)
             VALUES ($1, $2, $3, $4, 'completed')`,
            [backupFilename, backupPath, fileSize, userId]
        );
        
        console.log(`✅ Backup created: ${backupFilename} (${formatFileSize(fileSize)})`);
        
        res.json({ 
            success: true, 
            filename: backupFilename,
            size: formatFileSize(fileSize),
            created_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение списка бэкапов
router.get('/backup/list', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT b.*, u.surname, u.name 
             FROM backups b
             LEFT JOIN users u ON b.created_by = u.id
             ORDER BY b.created_at DESC`
        );
        
        const backups = result.rows.map(b => ({
            ...b,
            size_formatted: formatFileSize(b.size_bytes)
        }));
        
        res.json({ backups });
    } catch (error) {
        console.error('Get backups error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Скачивание бэкапа
router.get('/backup/download/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(`SELECT * FROM backups WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Бэкап не найден' });
        }
        
        const backup = result.rows[0];
        
        if (!fs.existsSync(backup.filepath)) {
            return res.status(404).json({ error: 'Файл бэкапа не найден' });
        }
        
        res.download(backup.filepath, backup.filename);
    } catch (error) {
        console.error('Download backup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление бэкапа
router.delete('/backup/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(`SELECT * FROM backups WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Бэкап не найден' });
        }
        
        const backup = result.rows[0];
        
        // Удаляем файл
        if (fs.existsSync(backup.filepath)) {
            fs.unlinkSync(backup.filepath);
        }
        
        // Удаляем запись из БД
        await query(`DELETE FROM backups WHERE id = $1`, [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete backup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Восстановление из бэкапа
router.post('/backup/restore/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Получаем информацию о бэкапе
        const result = await query(`SELECT * FROM backups WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Бэкап не найден' });
        }
        
        const backup = result.rows[0];
        
        if (!fs.existsSync(backup.filepath)) {
            return res.status(404).json({ error: 'Файл бэкапа не найден' });
        }
        
        const dbName = process.env.DB_NAME || 'corporate_messenger';
        const dbUser = process.env.DB_USER || 'messenger_user';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 5432;
        
        process.env.PGPASSWORD = process.env.DB_PASSWORD;
        
        // 2. Восстанавливаем через psql с флагом --clean
        console.log('🔄 Restoring backup...');
        const restoreCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backup.filepath}" 2>&1`;
        
        const { stdout, stderr } = await execPromise(restoreCmd);
        
        if (stderr && !stderr.includes('WARNING') && !stderr.includes('ERROR')) {
            console.error('Restore stderr:', stderr);
        }
        
        console.log('✅ Database restored from backup');
        
        // 3. Очищаем старые сессии
        await query(`TRUNCATE sessions CASCADE`);
        
        // 4. Обновляем последнюю активность админа
        await query(
            `UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [req.userId]
        );
        
        res.json({ 
            success: true, 
            message: 'База данных восстановлена из бэкапа. Пожалуйста, войдите заново.'
        });
        
    } catch (error) {
        console.error('Restore backup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// УПРАВЛЕНИЕ УВЕДОМЛЕНИЯМИ (АДМИН)
// =====================================================

// Получение всех уведомлений
router.get('/notifications', authMiddleware, adminPanelAccess, async (req, res) => {
    try {
        const { limit = 50, offset = 0, category, search } = req.query;
        
        let sql = `
            SELECT n.*, 
                   u.surname as sender_surname, u.name as sender_name,
                   ru.surname as recipient_surname, ru.name as recipient_name
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            LEFT JOIN users ru ON n.user_id = ru.id
            WHERE 1=1
        `;
        
        const params = [];
        let idx = 1;
        
        if (category && category !== 'all') {
            sql += ` AND n.category = $${idx++}`;
            params.push(category);
        }
        
        if (search) {
            sql += ` AND (n.title ILIKE $${idx} OR n.content ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        
        sql += ` ORDER BY n.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(sql, params);
        
        // Форматируем имена
        const notifications = result.rows.map(n => ({
            ...n,
            sender_name: n.sender_surname 
                ? `${n.sender_surname} ${n.sender_name || ''}`.trim() 
                : 'Система',
            user_name: n.recipient_surname 
                ? `${n.recipient_surname} ${n.recipient_name || ''}`.trim() 
                : null
        }));
        
        // Общее количество
        let countSql = `SELECT COUNT(*) FROM notifications WHERE 1=1`;
        const countParams = [];
        let countIdx = 1;
        
        if (category && category !== 'all') {
            countSql += ` AND category = $${countIdx++}`;
            countParams.push(category);
        }
        
        if (search) {
            countSql += ` AND (title ILIKE $${countIdx} OR content ILIKE $${countIdx})`;
            countParams.push(`%${search}%`);
        }
        
        const countResult = await query(countSql, countParams);
        
        res.json({ 
            notifications, 
            total: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get admin notifications error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Отправка уведомления
router.post('/notifications/send', authMiddleware, adminPanelAccess, async (req, res) => {
    try {
        const { 
            category = 'admin',
            priority = 'normal',
            title,
            content,
            linkType,
            linkId,
            expiresAt,
            isGlobal,
            departmentId,
            userIds
        } = req.body;
        
        const senderId = req.userId;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Заголовок и текст обязательны' });
        }
        
        // Определяем получателей
        let recipients = [];
        
        if (isGlobal) {
            const allUsers = await query(
                `SELECT id FROM users WHERE deleted_at IS NULL AND status = 'active'`
            );
            recipients = allUsers.rows.map(r => r.id);
        } else if (departmentId) {
            const deptUsers = await query(
                `SELECT id FROM users WHERE department_id = $1 AND deleted_at IS NULL AND status = 'active'`,
                [departmentId]
            );
            recipients = deptUsers.rows.map(r => r.id);
        } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            recipients = userIds;
        } else {
            return res.status(400).json({ error: 'Не указаны получатели' });
        }
        
        if (recipients.length === 0) {
            return res.status(400).json({ error: 'Получатели не найдены' });
        }
        
        // Создаём уведомления
        let createdCount = 0;
        
        for (const recipientId of recipients) {
            await query(
                `INSERT INTO notifications 
                 (user_id, category, priority, title, content, link_type, link_id, sender_id, expires_at, is_global)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    recipientId, 
                    category, 
                    priority,
                    title.trim(), 
                    content.trim(), 
                    linkType || null, 
                    linkId || null, 
                    senderId,
                    expiresAt || null,
                    isGlobal || false
                ]
            );
            createdCount++;
        }
        
        // Централизованный логгер запишет действие после ответа
        req.audit = {
            action: 'SEND notification',
            entityType: 'notifications',
            newData: { category, title, count: createdCount }
        };
        
        res.status(201).json({ 
            success: true, 
            count: createdCount,
            message: `Уведомление отправлено ${createdCount} получателям`
        });
        
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление уведомления
router.delete('/notifications/:id', authMiddleware, adminPanelAccess, async (req, res) => {
    try {
        const { id } = req.params;
        
        await query(`DELETE FROM notifications WHERE id = $1`, [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Форматирование размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;