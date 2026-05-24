const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Регистрация
router.post('/register', async (req, res) => {
    console.log('📝 Headers:', req.headers);
    console.log('📝 Body:', req.body);
    
    try {
        const { username, surname, name, patronymic, birthday, postId, departmentId, email, telNum, password } = req.body;

        // Проверяем, что body существует
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'Body is empty. Make sure Content-Type: application/json' });
        }

        // Проверка обязательных полей
        if (!username) return res.status(400).json({ error: 'username required' });
        if (!surname) return res.status(400).json({ error: 'surname required' });
        if (!name) return res.status(400).json({ error: 'name required' });
        if (!birthday) return res.status(400).json({ error: 'birthday required' });
        // if (!postId) return res.status(400).json({ error: 'postId required' });
        // if (!departmentId) return res.status(400).json({ error: 'departmentId required' });
        if (!email) return res.status(400).json({ error: 'email required' });
        if (!telNum) return res.status(400).json({ error: 'telNum required' });
        if (!password) return res.status(400).json({ error: 'password required' });

        // Проверка существования
        const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const existingUsername = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUsername.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Хэшируем пароль
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Создаем пользователя
        const result = await query(
            `INSERT INTO users (username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, role_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 2)
             RETURNING id, username, surname, name, email`,
            [username, surname, name, patronymic || null, birthday, postId || null, departmentId || null, email, telNum, passwordHash]
        );

        const user = result.rows[0];

        // Генерируем токен
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '7d' }
        );

        res.status(201).json({ success: true, user, token });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Логин
router.post('/login', async (req, res) => {
    console.log('🔐 Login body:', req.body);
    
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: 'Login and password required' });
        }

        // Ищем пользователя
        let user = await query(`SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`, [emailOrUsername]);
        if (user.rows.length === 0) {
            user = await query(`SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL`, [emailOrUsername]);
        }

        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        const foundUser = user.rows[0];

        // ★★★ ПРОВЕРКА СТАТУСА ★★★
        if (foundUser.status === 'blocked') {
            return res.status(403).json({ error: 'Учетная запись заблокирована' });
        }

        if (foundUser.status !== 'active') {
            return res.status(403).json({ error: 'Учетная запись неактивна' });
        }

        // Проверяем пароль
        const isValid = await bcrypt.compare(password, foundUser.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        // Генерируем токен
        const token = jwt.sign(
            { id: foundUser.id, username: foundUser.username, email: foundUser.email },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '7d' }
        );

        delete foundUser.password_hash;

        res.json({ success: true, user: foundUser, token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Проверка токена (получение текущего пользователя)
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        
        const result = await query(
            `SELECT id, username, surname, name, email, avatar_uri, status, role_id, is_super_admin 
             FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        console.log('✅ /me returning user:', { id: user.id, username: user.username, is_super_admin: user.is_super_admin });

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('❌ /me error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;