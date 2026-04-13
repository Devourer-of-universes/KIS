const Message = require('../models/Message');
const { validateMessage, validateReport } = require('../utils/validators');

// Отправка сообщения
const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content, attachments } = req.body;
        
        const { error } = validateMessage({ content, attachments });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        
        const message = await Message.create(parseInt(chatId), req.userId, content, attachments || []);
        
        res.status(201).json({ success: true, message });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Ошибка отправки сообщения' });
    }
};

// Редактирование сообщения
const editMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Содержание сообщения не может быть пустым' });
        }
        
        const message = await Message.edit(parseInt(id), req.userId, content);
        
        if (!message) {
            return res.status(404).json({ error: 'Сообщение не найдено или у вас нет прав' });
        }
        
        res.json({ success: true, message });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ error: 'Ошибка редактирования сообщения' });
    }
};

// Удаление сообщения
const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        
        const message = await Message.delete(parseInt(id), req.userId);
        
        if (!message) {
            return res.status(404).json({ error: 'Сообщение не найдено или у вас нет прав' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Ошибка удаления сообщения' });
    }
};

// Жалоба на сообщение
const reportMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const { error } = validateReport({ reason });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        
        await Message.report(parseInt(id), req.userId, reason);
        
        res.json({ success: true, message: 'Жалоба отправлена администратору' });
    } catch (error) {
        console.error('Report message error:', error);
        if (error.message === 'Message not found') {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }
        res.status(500).json({ error: 'Ошибка отправки жалобы' });
    }
};

// Поиск сообщений
const searchMessages = async (req, res) => {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 50;
        
        if (!q || q.length < 2) {
            return res.status(400).json({ error: 'Введите минимум 2 символа для поиска' });
        }
        
        const messages = await Message.search(req.userId, q, limit);
        res.json({ messages });
    } catch (error) {
        console.error('Search messages error:', error);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
};

module.exports = {
    sendMessage,
    editMessage,
    deleteMessage,
    reportMessage,
    searchMessages
};