const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========

// Получение всех пользователей (с пагинацией и поиском)
router.get('/users', authMiddleware, async (req, res) => {
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
// Получение истории действий пользователя
router.get('/users/:id/history', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await query(
            `SELECT id, action, entity_type, entity_id, 
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
router.post('/users', authMiddleware, async (req, res) => {
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
router.put('/users/:id', authMiddleware, async (req, res) => {
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
router.post('/users/:id/reset-password', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
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
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
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
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        const result = await query(`SELECT * FROM system_settings ORDER BY setting_key`);
        
        // Преобразуем массив в объект { key: value }
        const settings = {};
        for (const row of result.rows) {
            let value = row.setting_value;
            if (row.setting_type === 'boolean') {
                value = value === 'true';
            } else if (row.setting_type === 'number') {
                value = parseInt(value);
            }
            settings[row.setting_key] = value;
        }
        
        res.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление настроек
router.put('/settings', authMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        const userId = req.userId;
        
        for (const [key, value] of Object.entries(updates)) {
            // Определяем тип значения
            let settingType = 'string';
            let settingValue = value;
            
            if (typeof value === 'boolean') {
                settingType = 'boolean';
                settingValue = value ? 'true' : 'false';
            } else if (typeof value === 'number') {
                settingType = 'number';
                settingValue = String(value);
            } else if (typeof value === 'object' && Array.isArray(value)) {
                settingType = 'json';
                settingValue = JSON.stringify(value);
            }
            
            await query(
                `UPDATE system_settings 
                 SET setting_value = $1, setting_type = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
                 WHERE setting_key = $4`,
                [settingValue, settingType, userId, key]
            );
        }
        
        // Если изменилось название организации, обновляем головное подразделение
        if (updates.org_name) {
            const rootDept = await query(
                `SELECT id FROM departments WHERE parent_department_id IS NULL LIMIT 1`
            );
            
            if (rootDept.rows.length > 0) {
                await query(
                    `UPDATE departments SET name = $1 WHERE id = $2`,
                    [updates.org_name, rootDept.rows[0].id]
                );
                console.log('✅ Название головного подразделения обновлено:', updates.org_name);
            }
        }
        
        // Логируем изменение настроек
        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, old_data, new_data, ip_address, user_agent)
             VALUES ($1, 'UPDATE settings', 'system', $2, $3, $4, $5)`,
            [userId, null, JSON.stringify(updates), req.ip, req.headers['user-agent']]
        );
        
        res.json({ success: true, message: 'Настройки сохранены' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Сброс настроек по умолчанию
router.post('/settings/reset', authMiddleware, async (req, res) => {
    try {
        await query(`UPDATE system_settings SET setting_value = DEFAULT`);
        res.json({ success: true, message: 'Настройки сброшены' });
    } catch (error) {
        console.error('Reset settings error:', error);
        res.status(500).json({ error: error.message });
    }
});









// ========== ЛОГИ И СТАТИСТИКА ==========

// Получение логов
router.get('/logs', authMiddleware, async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        const result = await query(
            `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
            [parseInt(limit), parseInt(offset)]
        );
        
        res.json({ logs: result.rows });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение статистики
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const stats = {};
        
        // Всего пользователей
        const totalUsers = await query(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`);
        stats.total_users = parseInt(totalUsers.rows[0].count);
        
        // Активных сегодня (last_seen_at > now() - interval '1 day')
        const activeUsers = await query(`
            SELECT COUNT(*) FROM users 
            WHERE last_seen_at > NOW() - INTERVAL '1 day' AND deleted_at IS NULL
        `);
        stats.active_users = parseInt(activeUsers.rows[0].count);
        
        // Всего чатов
        const totalChats = await query(`SELECT COUNT(*) FROM chats`);
        stats.total_chats = parseInt(totalChats.rows[0].count);
        
        // Групповые и личные чаты
        const groupChats = await query(`SELECT COUNT(*) FROM chats WHERE is_group = true`);
        stats.group_chats = parseInt(groupChats.rows[0].count);
        const privateChats = await query(`SELECT COUNT(*) FROM chats WHERE is_group = false`);
        stats.private_chats = parseInt(privateChats.rows[0].count);
        
        // Всего сообщений
        const totalMessages = await query(`SELECT COUNT(*) FROM messages WHERE is_deleted = false`);
        stats.total_messages = parseInt(totalMessages.rows[0].count);
        
        // Всего файлов
        const totalFiles = await query(`SELECT COUNT(*) FROM message_attachments`);
        stats.total_files = parseInt(totalFiles.rows[0].count);
        // Заблокированные пользователи
        const blockedUsers = await query(`SELECT COUNT(*) FROM users WHERE status = 'blocked' AND deleted_at IS NULL`);
        stats.blocked_users = parseInt(blockedUsers.rows[0].count);

        // Новые пользователи за месяц
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

// Форматирование размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;