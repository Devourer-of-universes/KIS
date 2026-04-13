const User = require('../models/User');

// Получение списка пользователей
const getUsers = async (req, res) => {
    try {
        const { search, limit = 50, offset = 0 } = req.query;
        
        const users = await User.getUsersList(
            req.userId,
            search || '',
            parseInt(limit),
            parseInt(offset)
        );
        
        res.json({ users, count: users.length });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Ошибка получения списка пользователей' });
    }
};

// Получение профиля пользователя
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(parseInt(id));
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        delete user.password_hash;
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Ошибка получения пользователя' });
    }
};

// Получение контактов
const getContacts = async (req, res) => {
    try {
        const contacts = await User.getContacts(req.userId);
        res.json({ contacts });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ error: 'Ошибка получения контактов' });
    }
};

// Добавление в контакты
const addContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (parseInt(id) === req.userId) {
            return res.status(400).json({ error: 'Нельзя добавить себя в контакты' });
        }
        
        await User.addContact(req.userId, parseInt(id));
        res.json({ success: true });
    } catch (error) {
        console.error('Add contact error:', error);
        res.status(500).json({ error: 'Ошибка добавления в контакты' });
    }
};

// Удаление из контактов
const removeContact = async (req, res) => {
    try {
        const { id } = req.params;
        await User.removeContact(req.userId, parseInt(id));
        res.json({ success: true });
    } catch (error) {
        console.error('Remove contact error:', error);
        res.status(500).json({ error: 'Ошибка удаления из контактов' });
    }
};

module.exports = {
    getUsers,
    getUserById,
    getContacts,
    addContact,
    removeContact
};