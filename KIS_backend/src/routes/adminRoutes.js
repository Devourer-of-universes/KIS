const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth'); // Убираем adminMiddleware
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========

// Получение всех пользователей (с пагинацией и поиском)
router.get('/users', authMiddleware, async (req, res) => {  // Убрали adminMiddleware
    try {
        const { search = '', limit = 50, offset = 0 } = req.query;
        
        let queryText = `
            SELECT u.id, u.username, u.surname, u.name, u.patronymic, 
                   u.email, u.tel_num, u.status, u.created_at, u.last_seen_at,
                   r.name as role_name, r.id as role_id,
                   p.name as post_name, d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN posts p ON u.post_id = p.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.deleted_at IS NULL
        `;
        const params = [];
        
        if (search) {
            queryText += ` AND (u.surname ILIKE $1 OR u.name ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)`;
            params.push(`%${search}%`);
        }
        
        queryText += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(queryText, params);
        
        const countResult = await query(
            `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`,
            []
        );
        
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
        
        const result = await query(
            `SELECT u.id, u.username, u.surname, u.name, u.patronymic, 
                    u.email, u.tel_num, u.status, u.created_at, u.birthday,
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
        
        delete result.rows[0].password_hash;
        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание пользователя (админом)
router.post('/users', authMiddleware, async (req, res) => {
    try {
        const { 
            username, surname, name, patronymic, birthday, 
            postId, departmentId, email, telNum, password, roleId = 2 
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
        
        // Исправленный INSERT — используем переданные departmentId и postId
        const result = await query(
            `INSERT INTO users (username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, role_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
             RETURNING id, username, surname, name, email, tel_num, status, role_id`,
            [username, surname, name, patronymic || null, birthday, postId || null, departmentId || null, email, telNum, passwordHash, roleId]
        );
        
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление пользователя
router.put('/users/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { surname, name, patronymic, email, telNum, roleId, status, postId, departmentId } = req.body;
        
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
        if (postId !== undefined) { updates.push(`post_id = $${idx++}`); values.push(postId); }
        if (departmentId !== undefined) { updates.push(`department_id = $${idx++}`); values.push(departmentId); }
        
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
router.delete('/users/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
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
        // Простой запрос без рекурсии
        const result = await query(`
            SELECT id, name, parent_department_id 
            FROM departments 
            ORDER BY name
        `);
        
        // Строим дерево с уровнями на клиенте или просто возвращаем плоский список
        // Для селекта достаточно простого списка
        const departments = result.rows.map(dept => ({
            id: dept.id,
            name: dept.name,
            level: 0 // временно, для отступа
        }));
        
        res.json({ departments });
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



module.exports = router;