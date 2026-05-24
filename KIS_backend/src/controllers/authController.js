const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Регистрация
const register = async (req, res) => {
    try {
        console.log('📝 Registration request:', req.body);

        const { username, surname, name, patronymic, birthday, postId, departmentId, email, telNum, password } = req.body;

        // Проверка обязательных полей (postId и departmentId теперь НЕ обязательны)
        if (!username) return res.status(400).json({ error: 'username обязателен' });
        if (!surname) return res.status(400).json({ error: 'surname обязателен' });
        if (!name) return res.status(400).json({ error: 'name обязателен' });
        if (!birthday) return res.status(400).json({ error: 'birthday обязателен' });
        if (!email) return res.status(400).json({ error: 'email обязателен' });
        if (!telNum) return res.status(400).json({ error: 'telNum обязателен' });
        if (!password) return res.status(400).json({ error: 'password обязателен' });

        // Проверка существования пользователя
        const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const existingUsername = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUsername.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
        }

        const existingPhone = await query('SELECT id FROM users WHERE tel_num = $1', [telNum]);
        if (existingPhone.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким телефоном уже существует' });
        }

        // Хэшируем пароль
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Создаём пользователя (без post_id и department_id)
        const result = await query(
            `INSERT INTO users (username, surname, name, patronymic, birthday, email, tel_num, password_hash, role_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, username, surname, name, patronymic, email, tel_num, created_at`,
            [username, surname, name, patronymic || null, birthday, email, telNum, passwordHash, 2]
        );

        const user = result.rows[0];

        // Генерируем токен
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ User registered:', user.username);

        res.status(201).json({
            success: true,
            user,
            token
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Ошибка при регистрации: ' + error.message });
    }
};

// Логин
const login = async (req, res) => {
    try {
        console.log('🔐 Login request body:', req.body);

        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: 'Email/логин и пароль обязательны' });
        }

        // Ищем пользователя по email или username
        let user = await query(
            `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
            [emailOrUsername]
        );
        
        if (user.rows.length === 0) {
            user = await query(
                `SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL`,
                [emailOrUsername]
            );
        }

        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const foundUser = user.rows[0];

        // Проверяем статус
        if (foundUser.status !== 'active') {
            return res.status(403).json({ error: 'Учетная запись заблокирована' });
        }

        // Проверяем пароль
        const isValid = await bcrypt.compare(password, foundUser.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Генерируем токен
        const token = jwt.sign(
            { id: foundUser.id, username: foundUser.username, email: foundUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Обновляем последнюю активность
        await query(`UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`, [foundUser.id]);

        // Сохраняем сессию
        await query(
            `INSERT INTO sessions (user_id, token, application, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5)`,
            [foundUser.id, token, 'web', req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
        );
        // После успешного логина
        await query(
            `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
            VALUES ($1, 'LOGIN', $2, $3)`,
            [user.id, req.ip, req.headers['user-agent']]
        );
        // Убираем пароль из ответа
        delete foundUser.password_hash;

        console.log('✅ User logged in:', foundUser.username);

        res.json({
            success: true,
            user: foundUser,
            token
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Ошибка при входе: ' + error.message });
    }
};

// Получение текущего пользователя
const getMe = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Нет токена' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const result = await query(
            `SELECT u.id, u.username, u.surname, u.name, u.patronymic, u.email, u.tel_num, 
                    u.avatar_uri, u.status, u.created_at, u.last_seen_at,
                    p.name as post_name, d.name as department_name
             FROM users u
             LEFT JOIN posts p ON u.post_id = p.id
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('❌ GetMe error:', error);
        res.status(401).json({ error: 'Неверный токен' });
    }
};

// Выход
const logout = async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            await query(`UPDATE sessions SET is_current = false WHERE token = $1`, [token]);
        }
        // После логаута
        await query(
            `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
            VALUES ($1, 'LOGOUT', $2, $3)`,
            [userId, req.ip, req.headers['user-agent']]
        );
        res.json({ success: true, message: 'Выход выполнен' });
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ error: 'Ошибка при выходе' });
    }
};



module.exports = {
    register,
    login,
    getMe,
    logout
};