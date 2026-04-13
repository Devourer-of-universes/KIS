const express = require('express');
const router = express.Router();

// Аутентификация
router.post('/mobile/auth/login', async (req, res) => {
    // TODO: Проверка логина/пароля, выдача JWT
    res.json({ token: 'jwt-token', user: {} });
});

// Получить список чатов
router.get('/mobile/chats', async (req, res) => {
    // TODO: Вернуть чаты пользователя
    res.json({ chats: [] });
});

// Получить сообщения чата
router.get('/mobile/chats/:chatId/messages', async (req, res) => {
    // TODO: Вернуть историю сообщений
    res.json({ messages: [] });
});

// Отправить сообщение
router.post('/mobile/chats/:chatId/messages', async (req, res) => {
    // TODO: Сохранить сообщение
    res.json({ success: true });
});

module.exports = router;