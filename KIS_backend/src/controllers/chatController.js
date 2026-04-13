const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { validateCreateChat } = require('../utils/validators');

// Получение списка чатов пользователя
const getChats = async (req, res) => {
    try {
        const chats = await Chat.getUserChats(req.userId);
        res.json({ chats });
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: 'Ошибка получения чатов' });
    }
};

// Получение информации о чате
const getChatById = async (req, res) => {
    try {
        const { id } = req.params;
        const chat = await Chat.getChatById(parseInt(id), req.userId);
        
        if (!chat) {
            return res.status(404).json({ error: 'Чат не найден' });
        }
        
        res.json({ chat });
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ error: 'Ошибка получения чата' });
    }
};

// Создание чата
const createChat = async (req, res) => {
    try {
        const { userIds, name, isGroup } = req.body;
        
        if (!userIds || userIds.length === 0) {
            return res.status(400).json({ error: 'Укажите участников чата' });
        }

        let chat;
        
        if (isGroup) {
            // Групповой чат
            if (!name) {
                return res.status(400).json({ error: 'Укажите название группы' });
            }
            chat = await Chat.createGroupChat(name, userIds, req.userId);
        } else {
            // Личный чат
            if (userIds.length !== 1) {
                return res.status(400).json({ error: 'Для личного чата укажите одного участника' });
            }
            const result = await Chat.createPrivateChat(req.userId, userIds[0], req.userId);
            chat = { id: result.id };
        }
        
        res.status(201).json({ success: true, chatId: chat.id });
    } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ error: 'Ошибка создания чата' });
    }
};

// Добавление участника в группу
const addParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'Укажите ID пользователя' });
        }
        
        await Chat.addParticipant(parseInt(id), userId, req.userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Add participant error:', error);
        if (error.message === 'Invalid chat') {
            return res.status(404).json({ error: 'Чат не найден или не является групповым' });
        }
        res.status(500).json({ error: 'Ошибка добавления участника' });
    }
};

// Удаление участника из группы
const removeParticipant = async (req, res) => {
    try {
        const { id, userId } = req.params;
        
        await Chat.removeParticipant(parseInt(id), parseInt(userId), req.userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Remove participant error:', error);
        if (error.message === 'Chat not found') {
            return res.status(404).json({ error: 'Чат не найден' });
        }
        if (error.message === 'Cannot remove chat creator') {
            return res.status(403).json({ error: 'Нельзя удалить создателя чата' });
        }
        res.status(500).json({ error: 'Ошибка удаления участника' });
    }
};

// Получение сообщений чата
const getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const messages = await Message.getChatMessages(parseInt(id), req.userId, limit, offset);
        
        // Обновляем время последнего прочтения
        await Chat.updateLastRead(parseInt(id), req.userId);
        
        res.json({ messages, hasMore: messages.length === limit });
    } catch (error) {
        console.error('Get messages error:', error);
        if (error.message === 'Access denied') {
            return res.status(403).json({ error: 'Нет доступа к этому чату' });
        }
        res.status(500).json({ error: 'Ошибка получения сообщений' });
    }
};

// Отметка о прочтении
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Chat.updateLastRead(parseInt(id), req.userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Ошибка' });
    }
};

// Получение количества непрочитанных
const getUnreadCount = async (req, res) => {
    try {
        const unread = await Chat.getUnreadCount(req.userId);
        res.json(unread);
    } catch (error) {
        console.error('Get unread error:', error);
        res.status(500).json({ error: 'Ошибка получения непрочитанных' });
    }
};

module.exports = {
    getChats,
    getChatById,
    createChat,
    addParticipant,
    removeParticipant,
    getMessages,
    markAsRead,
    getUnreadCount
};