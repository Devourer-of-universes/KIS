const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');

// Получение списка пользователей
const getUsers = async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.username, u.surname, u.name, u.patronymic, u.email, u.avatar_uri, u.status
             FROM users u
             WHERE u.deleted_at IS NULL AND u.id != $1
             ORDER BY u.surname, u.name`,
            [req.userId]
        );
        res.json({ users: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Получение пользователя по ID
const getUserById = async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.username, u.surname, u.name, u.patronymic, u.email, u.avatar_uri, u.status
             FROM users u
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Получение контактов
const getContacts = async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.username, u.surname, u.name, u.avatar_uri
             FROM contacts c
             JOIN users u ON c.contact_id = u.id
             WHERE c.user_id = $1 AND u.deleted_at IS NULL`,
            [req.userId]
        );
        res.json({ contacts: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Добавление в контакты
const addContact = async (req, res) => {
    try {
        await query(
            `INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [req.userId, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Удаление из контактов
const removeContact = async (req, res) => {
    try {
        await query(`DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2`, [req.userId, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

router.use(authMiddleware);
router.get('/', getUsers);
router.get('/contacts', getContacts);
router.get('/:id', getUserById);
router.post('/contacts/:id', addContact);
router.delete('/contacts/:id', removeContact);

module.exports = router;