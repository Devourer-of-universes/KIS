const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { query } = require('../config/database');

// Хранилище активных подключений
const activeUsers = new Map(); // userId -> Set(socketIds)
const userSockets = new Map(); // socketId -> userId
const chatRooms = new Map();   // chatId -> Set(socketIds)

function setupWebSocket(io) {
    // Middleware для аутентификации WebSocket
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (!user || user.status !== 'active') {
                return next(new Error('Invalid user'));
            }

            socket.userId = user.id;
            socket.user = user;
            next();
        } catch (error) {
            console.error('WebSocket auth error:', error);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', async (socket) => {
        console.log(`🔌 User ${socket.userId} connected: ${socket.id}`);
        
        // Добавляем пользователя в активные
        if (!activeUsers.has(socket.userId)) {
            activeUsers.set(socket.userId, new Set());
        }
        activeUsers.get(socket.userId).add(socket.id);
        userSockets.set(socket.id, socket.userId);
        
        // Обновляем статус онлайн
        await User.updateLastSeen(socket.userId);
        
        // Оповещаем контакты о статусе
        await broadcastUserStatus(socket.userId, true, io);
        
        // Присоединение к комнатам чатов
        socket.on('join-chats', async (chatIds) => {
            for (const chatId of chatIds) {
                // Проверяем, что пользователь участник чата
                const isParticipant = await checkParticipant(chatId, socket.userId);
                if (isParticipant) {
                    socket.join(`chat_${chatId}`);
                    if (!chatRooms.has(chatId)) {
                        chatRooms.set(chatId, new Set());
                    }
                    chatRooms.get(chatId).add(socket.id);
                    console.log(`User ${socket.userId} joined chat ${chatId}`);
                }
            }
        });
        
        // Отправка сообщения
        socket.on('send-message', async (data, callback) => {
            try {
                const { chatId, content, attachments = [] } = data;
                
                // Проверяем, что пользователь участник чата
                const isParticipant = await checkParticipant(chatId, socket.userId);
                if (!isParticipant) {
                    return callback({ error: 'Access denied' });
                }
                
                // Создаем сообщение в БД
                const message = await Message.create(chatId, socket.userId, content, attachments);
                
                // Получаем полные данные сообщения для отправки
                const messageWithData = await getMessageWithData(message.id);
                
                // Отправляем всем в комнате чата
                io.to(`chat_${chatId}`).emit('new-message', messageWithData);
                
                // Отправляем уведомления оффлайн пользователям
                await sendOfflineNotifications(chatId, socket.userId, messageWithData);
                
                callback({ success: true, message: messageWithData });
            } catch (error) {
                console.error('Send message error:', error);
                callback({ error: 'Failed to send message' });
            }
        });
        
        // Редактирование сообщения
        socket.on('edit-message', async (data, callback) => {
            try {
                const { messageId, content } = data;
                
                const message = await Message.edit(messageId, socket.userId, content);
                if (!message) {
                    return callback({ error: 'Message not found or access denied' });
                }
                
                io.to(`chat_${message.chat_id}`).emit('message-edited', {
                    messageId: message.id,
                    content: message.content,
                    updatedAt: message.updated_at
                });
                
                callback({ success: true });
            } catch (error) {
                console.error('Edit message error:', error);
                callback({ error: 'Failed to edit message' });
            }
        });
        
        // Удаление сообщения
        socket.on('delete-message', async (data, callback) => {
            try {
                const { messageId } = data;
                
                const message = await Message.delete(messageId, socket.userId);
                if (!message) {
                    return callback({ error: 'Message not found or access denied' });
                }
                
                io.to(`chat_${message.chat_id}`).emit('message-deleted', {
                    messageId: message.id,
                    deletedBy: socket.userId
                });
                
                callback({ success: true });
            } catch (error) {
                console.error('Delete message error:', error);
                callback({ error: 'Failed to delete message' });
            }
        });
        
        // Печатает...
        socket.on('typing', async (data) => {
            const { chatId, isTyping } = data;
            socket.to(`chat_${chatId}`).emit('user-typing', {
                userId: socket.userId,
                userName: `${socket.user.surname} ${socket.user.name}`,
                isTyping
            });
        });
        
        // Отметка о прочтении
        socket.on('read-receipt', async (data) => {
            const { chatId, messageId } = data;
            await Chat.updateLastRead(chatId, socket.userId);
            
            socket.to(`chat_${chatId}`).emit('message-read', {
                userId: socket.userId,
                chatId,
                lastReadMessageId: messageId
            });
        });
        
        // Отключение
        socket.on('disconnect', async () => {
            console.log(`🔌 User ${socket.userId} disconnected: ${socket.id}`);
            
            // Удаляем из активных
            if (activeUsers.has(socket.userId)) {
                activeUsers.get(socket.userId).delete(socket.id);
                if (activeUsers.get(socket.userId).size === 0) {
                    activeUsers.delete(socket.userId);
                    // Оповещаем, что пользователь оффлайн
                    await broadcastUserStatus(socket.userId, false, io);
                }
            }
            
            userSockets.delete(socket.id);
            
            // Удаляем из комнат чатов
            for (const [chatId, sockets] of chatRooms) {
                if (sockets.has(socket.id)) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        chatRooms.delete(chatId);
                    }
                }
            }
        });
    });
}

// Проверка, является ли пользователь участником чата
async function checkParticipant(chatId, userId) {
    const result = await query(
        `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
        [chatId, userId]
    );
    return result.rows.length > 0;
}

// Получение сообщения с данными пользователя
async function getMessageWithData(messageId) {
    const result = await query(
        `SELECT m.id, m.chat_id, m.user_id, m.content, m.created_at, m.updated_at, m.is_edited,
                u.surname, u.name, u.avatar_uri,
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'id', a.id,
                        'file_uri', a.file_uri,
                        'file_name', a.file_name,
                        'file_size', a.file_size,
                        'file_type', a.file_type
                    )) FROM message_attachments a WHERE a.message_id = m.id),
                    '[]'::json
                ) as attachments
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.id = $1`,
        [messageId]
    );
    return result.rows[0];
}

// Отправка уведомлений оффлайн пользователям
async function sendOfflineNotifications(chatId, senderId, messageData) {
    // Получаем всех участников чата, кроме отправителя
    const participants = await query(
        `SELECT cp.user_id, cp.is_muted
         FROM chat_participants cp
         WHERE cp.chat_id = $1 AND cp.user_id != $2`,
        [chatId, senderId]
    );
    
    for (const participant of participants) {
        if (participant.is_muted) continue;
        
        // Проверяем, онлайн ли пользователь
        const isOnline = activeUsers.has(participant.user_id);
        
        if (!isOnline) {
            // Создаем уведомление в БД
            await query(
                `INSERT INTO notifications (user_id, type, title, content, data)
                 VALUES ($1, 'message', 'Новое сообщение', $2, $3)`,
                [participant.user_id, messageData.content, JSON.stringify({
                    chatId: chatId,
                    messageId: messageData.id,
                    senderName: `${messageData.surname} ${messageData.name}`
                })]
            );
        }
    }
}

// Оповещение контактов об изменении статуса пользователя
async function broadcastUserStatus(userId, isOnline, io) {
    // Получаем контакты пользователя
    const contacts = await query(
        `SELECT contact_id FROM contacts WHERE user_id = $1
         UNION
         SELECT user_id FROM contacts WHERE contact_id = $1`,
        [userId]
    );
    
    for (const contact of contacts.rows) {
        const contactId = contact.contact_id || contact.user_id;
        if (activeUsers.has(contactId)) {
            // Отправляем статус только если контакт онлайн
            io.to(`user_${contactId}`).emit('user-status-change', {
                userId,
                isOnline
            });
        }
    }
}

module.exports = { setupWebSocket };