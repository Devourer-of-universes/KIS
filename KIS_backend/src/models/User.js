const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
    // Регистрация нового пользователя
    static async create(userData) {
        const { username, surname, name, patronymic, birthday, postId, departmentId, email, telNum, password, roleId = 2 } = userData;

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await query(
            `INSERT INTO users (username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, role_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, username, surname, name, patronymic, email, tel_num, avatar_uri, status, role_id, created_at`,
            [username, surname, name, patronymic, birthday, postId || null, departmentId || null, email, telNum, passwordHash, roleId]
        );

        return result.rows[0];
    }

    // Поиск по ID
    static async findById(id) {
        const result = await query(
            `SELECT u.*, u.is_super_admin, r.name as role_name, p.name as post_name, d.name as department_name,
                    (EXTRACT(EPOCH FROM (NOW() - u.last_seen_at)) / 60) < $1 as is_online
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN posts p ON u.post_id = p.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = $2 AND u.deleted_at IS NULL`,
            [process.env.OFFLINE_TIMEOUT_MINUTES || 5, id]
        );
        return result.rows[0];
    }
    // Поиск по email
    static async findByEmail(email) {
        const result = await query(
            `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
            [email]
        );
        return result.rows[0];
    }

    // Поиск по username
    static async findByUsername(username) {
        const result = await query(
            `SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL`,
            [username]
        );
        return result.rows[0];
    }

    // Аутентификация
    static async authenticate(emailOrUsername, password) {
        let user = await this.findByEmail(emailOrUsername);
        if (!user) {
            user = await this.findByUsername(emailOrUsername);
        }
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return null;

        if (user.status !== 'active') return null;

        return user;
    }

    // Генерация JWT токена
    static generateToken(user) {
        return jwt.sign(
            { id: user.id, username: user.username, email: user.email, roleId: user.role_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
    }

    // Получение списка пользователей (для контактов)
    static async getUsersList(currentUserId, search = '', limit = 50, offset = 0) {
        let queryText = `
            SELECT u.id, u.username, u.surname, u.name, u.patronymic, 
                   u.email, u.avatar_uri, u.status, u.last_seen_at,
                   p.name as post_name, d.name as department_name,
                   CASE WHEN c.contact_id IS NOT NULL THEN true ELSE false END as is_contact,
                   (EXTRACT(EPOCH FROM (NOW() - u.last_seen_at)) / 60) < $2 as is_online
            FROM users u
            LEFT JOIN posts p ON u.post_id = p.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN contacts c ON c.user_id = $1 AND c.contact_id = u.id
            WHERE u.id != $1 AND u.deleted_at IS NULL
        `;
        const params = [currentUserId, parseInt(process.env.OFFLINE_TIMEOUT_MINUTES) || 5];

        if (search) {
            queryText += ` AND (u.surname ILIKE $3 OR u.name ILIKE $3 OR u.username ILIKE $3)`;
            params.push(`%${search}%`);
        }

        queryText += ` ORDER BY u.surname, u.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await query(queryText, params);
        return result.rows;
    }

    // Обновление последней активности
    static async updateLastSeen(userId) {
        await query(
            `UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [userId]
        );
    }

    // Обновление профиля
    static async update(userId, updateData) {
        const allowedFields = ['surname', 'name', 'patronymic', 'email', 'tel_num', 'settings'];
        const updates = [];
        const values = [];
        let idx = 1;

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = $${idx}`);
                values.push(updateData[field]);
                idx++;
            }
        }

        if (updates.length === 0) return null;

        values.push(userId);
        const result = await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, surname, name, patronymic, email, tel_num, avatar_uri, status`,
            values
        );

        return result.rows[0];
    }

    // Смена пароля
    static async changePassword(userId, oldPassword, newPassword) {
        const user = await this.findById(userId);
        if (!user) throw new Error('User not found');

        const isValid = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isValid) throw new Error('Invalid old password');

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);

        return true;
    }

    // Проверка является ли пользователь админом
    static async isAdmin(userId) {
        const user = await this.findById(userId);
        if (!user) return false;
        
        const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id));
        return adminIds.includes(userId) || user.role_id === 1;
    }

    // Добавление в контакты
    static async addContact(userId, contactId) {
        await query(
            `INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, contactId]
        );
        return true;
    }

    // Удаление из контактов
    static async removeContact(userId, contactId) {
        await query(
            `DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2`,
            [userId, contactId]
        );
        return true;
    }

    // Получение списка контактов
    static async getContacts(userId) {
        const result = await query(
            `SELECT u.id, u.username, u.surname, u.name, u.avatar_uri, u.status,
                    (EXTRACT(EPOCH FROM (NOW() - u.last_seen_at)) / 60) < $2 as is_online
             FROM contacts c
             JOIN users u ON c.contact_id = u.id
             WHERE c.user_id = $1 AND u.deleted_at IS NULL
             ORDER BY u.surname, u.name`,
            [userId, parseInt(process.env.OFFLINE_TIMEOUT_MINUTES) || 5]
        );
        return result.rows;
    }
}

module.exports = User;