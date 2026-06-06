const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');  // ← ДОБАВИТЬ ЭТУ СТРОКУ
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const useragent = require('useragent');

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

        // Проверка статуса
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
         // Генерируем токен
        const token = jwt.sign(
            { id: foundUser.id, username: foundUser.username, email: foundUser.email },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '7d' }
        );
        
        // Получаем информацию об устройстве и браузере
        const userAgent = req.headers['user-agent'] || '';
        const deviceInfo = getDeviceInfo(userAgent);
        const location = await getLocationByIp(req.ip || 'unknown');
        
        // Сохраняем новую сессию как активную
        await query(
            `INSERT INTO sessions (user_id, token, application, device, location, ip_address, user_agent, is_current, is_active, started_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, CURRENT_TIMESTAMP)`,
            [foundUser.id, token, deviceInfo.application, deviceInfo.device, location, req.ip || 'unknown', userAgent]
        );
        
        delete foundUser.password_hash;

        res.json({ success: true, user: foundUser, token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Выход
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        console.log('🚪 Logout request, token:', token ? 'present' : 'missing');
        
        if (token) {
            // Помечаем сессию как неактивную и не текущую
            const result = await query(
                `UPDATE sessions SET is_active = false, is_current = false WHERE token = $1 RETURNING id`,
                [token]
            );
            
            if (result.rows.length > 0) {
                console.log(`✅ Session ${result.rows[0].id} marked as inactive`);
            } else {
                console.log('⚠️ Session not found for token');
            }
        }
        
        res.json({ success: true, message: 'Выход выполнен' });
    } catch (error) {
        console.error('Logout error:', error);
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
            `SELECT u.id, u.username, u.surname, u.name, u.patronymic, 
                    u.email, u.tel_num, u.avatar_uri, u.status, 
                    u.role_id, u.is_super_admin,
                    p.name as post_name, 
                    d.name as department_name
             FROM users u
             LEFT JOIN posts p ON u.post_id = p.id
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        console.log('✅ /me returning user:', { 
            id: user.id, 
            username: user.username, 
            tel_num: user.tel_num,
            post_name: user.post_name,
            department_name: user.department_name
        });

        res.json({ user });
    } catch (error) {
        console.error('❌ /me error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});
// Смена пароля
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.userId;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }
        
        const user = await query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const isValid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);
        
        await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление профиля (email, телефон)
router.put('/update-profile', authMiddleware, async (req, res) => {
    try {
        const { email, tel_num } = req.body;
        const userId = req.userId;
        
        if (email) {
            await query(`UPDATE users SET email = $1 WHERE id = $2`, [email, userId]);
        }
        if (tel_num) {
            await query(`UPDATE users SET tel_num = $1 WHERE id = $2`, [tel_num, userId]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Настройка multer для аватаров
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/avatars');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `avatar_${req.userId}_${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

const avatarUpload = multer({ 
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed'), false);
        }
    }
});

// Загрузка аватара
router.post('/upload-avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const userId = req.userId;
        
        // Получаем старый аватар
        const oldAvatar = await query(`SELECT avatar_uri FROM users WHERE id = $1`, [userId]);
        if (oldAvatar.rows[0]?.avatar_uri) {
            const oldPath = path.join(__dirname, '../../', oldAvatar.rows[0].avatar_uri);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        
        await query(`UPDATE users SET avatar_uri = $1 WHERE id = $2`, [avatarUrl, userId]);
        
        res.json({ success: true, avatarUrl });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление аватара
router.delete('/remove-avatar', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        const result = await query(`SELECT avatar_uri FROM users WHERE id = $1`, [userId]);
        if (result.rows[0]?.avatar_uri) {
            const oldPath = path.join(__dirname, '../../', result.rows[0].avatar_uri);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        
        await query(`UPDATE users SET avatar_uri = NULL WHERE id = $1`, [userId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Remove avatar error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение сессий
router.get('/sessions', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const currentToken = req.headers.authorization?.replace('Bearer ', '');
        
        // Получаем ВСЕ сессии пользователя (и активные, и историю)
        const allSessions = await query(
            `SELECT id, application, device, location, ip_address, user_agent, 
                    started_at as last_activity, is_active, is_current
             FROM sessions 
             WHERE user_id = $1 
             ORDER BY started_at DESC`,
            [userId]
        );
        
        // Находим текущую сессию по токену
        let currentSessionId = null;
        if (currentToken) {
            const currentSession = await query(
                `SELECT id FROM sessions WHERE user_id = $1 AND token = $2`,
                [userId, currentToken]
            );
            if (currentSession.rows.length > 0) {
                currentSessionId = currentSession.rows[0].id;
            }
        }
        
        // Активные сессии: is_active = true
        const activeSessions = allSessions.rows.filter(s => s.is_active === true);
        
        // История: is_active = false (завершённые сессии)
        const historySessions = allSessions.rows.filter(s => s.is_active === false);
        
        res.json({ 
            activeSessions: activeSessions,
            historySessions: historySessions,
            currentSessionId: currentSessionId
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Завершение конкретной сессии (принудительно)
router.delete('/sessions/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        // Не даём завершить текущую сессию
        const currentToken = req.headers.authorization?.replace('Bearer ', '');
        const currentSession = await query(
            `SELECT id FROM sessions WHERE user_id = $1 AND token = $2`,
            [userId, currentToken]
        );
        
        if (currentSession.rows.length > 0 && currentSession.rows[0].id === parseInt(id)) {
            return res.status(400).json({ error: 'Нельзя завершить текущую сессию' });
        }
        
        // Помечаем сессию как неактивную
        await query(
            `UPDATE sessions SET is_active = false, is_current = false WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Terminate session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Завершение всех других сессий (кроме текущей)
router.post('/sessions/terminate-others', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const currentToken = req.headers.authorization?.replace('Bearer ', '');
        
        // Получаем ID текущей сессии
        const currentSession = await query(
            `SELECT id FROM sessions WHERE user_id = $1 AND token = $2`,
            [userId, currentToken]
        );
        
        const currentSessionId = currentSession.rows[0]?.id;
        
        // Завершаем все остальные активные сессии
        let queryText = `UPDATE sessions SET is_active = false, is_current = false 
                         WHERE user_id = $1 AND is_active = true`;
        const params = [userId];
        
        if (currentSessionId) {
            queryText += ` AND id != $2`;
            params.push(currentSessionId);
        }
        
        await query(queryText, params);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Terminate others error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Функция для определения устройства
function getDeviceInfo(userAgent) {
    const agent = useragent.parse(userAgent);
    
    // Определяем устройство
    let device = 'Компьютер';
    if (agent.os.family) {
        if (agent.os.family.toLowerCase().includes('windows')) device = 'Windows';
        else if (agent.os.family.toLowerCase().includes('mac')) device = 'macOS';
        else if (agent.os.family.toLowerCase().includes('linux')) device = 'Linux';
        else if (agent.os.family.toLowerCase().includes('android')) device = 'Android';
        else if (agent.os.family.toLowerCase().includes('ios')) device = 'iPhone/iPad';
        else if (agent.os.family.toLowerCase().includes('mobile')) device = 'Мобильное устройство';
    }
    
    // Определяем браузер (application)
    let browser = agent.family || 'Неизвестно';
    if (browser.includes('Chrome') && !browser.includes('Edge')) browser = 'Chrome';
    else if (browser.includes('Firefox')) browser = 'Firefox';
    else if (browser.includes('Safari')) browser = 'Safari';
    else if (browser.includes('Edge')) browser = 'Edge';
    else if (browser.includes('Opera')) browser = 'Opera';
    else if (browser.includes('Internet Explorer')) browser = 'Internet Explorer';
    
    // Добавляем версию
    const version = agent.major ? ` ${agent.major}` : '';
    
    return {
        device: device,
        application: browser + version,
        os: agent.os.family || 'Неизвестно'
    };
}

// Функция для получения геолокации
async function getLocationByIp(ip) {
    try {
        if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            return 'Локальная сеть, Локальный хост';
        }
        
        const response = await fetch(`http://ip-api.com/json/${ip}?lang=ru`);
        const data = await response.json();
        
        if (data.status === 'success') {
            return `${data.city}, ${data.country}`;
        }
        return 'Неизвестно';
    } catch (error) {
        console.error('Geo location error:', error);
        return 'Неизвестно';
    }
}

// Получение истории входов (последние 20)
router.get('/login-history', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        // Используем started_at вместо created_at
        const result = await query(
            `SELECT id, application, device, location, ip_address, started_at as created_at, is_current
             FROM sessions 
             WHERE user_id = $1 
             ORDER BY started_at DESC 
             LIMIT 20`,
            [userId]
        );
        
        res.json({ history: result.rows });
    } catch (error) {
        console.error('Get login history error:', error);
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;