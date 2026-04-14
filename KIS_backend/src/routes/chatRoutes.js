const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query, transaction } = require('../config/database');

// Получение списка чатов
const getChats = async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                c.id, 
                c.name, 
                c.is_group, 
                c.avatar_uri, 
                c.last_message_at,
                cp.last_read_at,
                (SELECT COUNT(*) FROM messages m 
                 WHERE m.chat_id = c.id 
                   AND m.created_at > cp.last_read_at 
                   AND m.is_deleted = false 
                   AND m.user_id != $1) as unread_count,
                (SELECT json_build_object(
                    'id', m.id,
                    'content', CASE WHEN m.is_deleted THEN '[Сообщение удалено]' ELSE m.content END,
                    'created_at', m.created_at,
                    'user_id', m.user_id
                 ) FROM messages m 
                 WHERE m.chat_id = c.id AND m.is_deleted = false 
                 ORDER BY m.created_at DESC LIMIT 1) as last_message
             FROM chats c
             JOIN chat_participants cp ON cp.chat_id = c.id
             WHERE cp.user_id = $1
             ORDER BY c.last_message_at DESC`,
            [req.userId]
        );
        
        const chats = result.rows;
        
        // Для личных чатов подставляем имя собеседника
        for (const chat of chats) {
            if (!chat.is_group && !chat.name) {
                const participants = await query(
                    `SELECT u.surname, u.name
                     FROM users u
                     JOIN chat_participants cp ON cp.user_id = u.id
                     WHERE cp.chat_id = $1 AND u.id != $2`,
                    [chat.id, req.userId]
                );
                if (participants.rows[0]) {
                    const p = participants.rows[0];
                    chat.name = `${p.surname} ${p.name}`;
                }
            }
        }
        
        res.json({ chats });
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Создание чата
const createChat = async (req, res) => {
    console.log('📝 Create chat request body:', req.body);
    console.log('👤 User ID:', req.userId);
    
    try {
        const { userIds, name, isGroup } = req.body;
        
        // Валидация
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'Укажите участников чата' });
        }
        
        let chatId;
        
        if (isGroup) {
            // Групповой чат
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'Укажите название группы' });
            }
            
            const result = await query(
                `INSERT INTO chats (name, is_group, created_by) 
                 VALUES ($1, true, $2) RETURNING id`,
                [name.trim(), req.userId]
            );
            chatId = result.rows[0].id;
            
            // Добавляем всех участников (включая создателя)
            const allUsers = [...new Set([...userIds, req.userId])];
            for (const uid of allUsers) {
                await query(
                    `INSERT INTO chat_participants (chat_id, user_id) 
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [chatId, uid]
                );
            }
            
        } else {
            // Личный чат (диалог)
            const otherUserId = userIds[0];
            
            if (!otherUserId) {
                return res.status(400).json({ error: 'Укажите собеседника' });
            }
            
            // Проверяем, существует ли уже чат между этими пользователями
            const existing = await query(
                `SELECT c.id 
                 FROM chats c
                 JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = $1
                 JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = $2
                 WHERE c.is_group = false`,
                [req.userId, otherUserId]
            );
            
            if (existing.rows.length > 0) {
                chatId = existing.rows[0].id;
            } else {
                // Создаем новый чат
                const result = await query(
                    `INSERT INTO chats (is_group, created_by) 
                     VALUES (false, $1) RETURNING id`,
                    [req.userId]
                );
                chatId = result.rows[0].id;
                
                // Добавляем участников
                await query(
                    `INSERT INTO chat_participants (chat_id, user_id) 
                     VALUES ($1, $2), ($1, $3)`,
                    [chatId, req.userId, otherUserId]
                );
            }
        }
        
        console.log('✅ Chat created with ID:', chatId);
        res.status(201).json({ success: true, chatId });
        
    } catch (error) {
        console.error('❌ Create chat error:', error);
        console.error('Error details:', error.stack);
        res.status(500).json({ error: error.message });
    }
};

// Получение сообщений чата
const getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        // Проверяем, что пользователь участник чата
        const isParticipant = await query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [id, req.userId]
        );
        
        if (isParticipant.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа к этому чату' });
        }
        
        const result = await query(
            `SELECT m.id, m.chat_id, m.user_id, 
                    CASE WHEN m.is_deleted THEN '[Сообщение удалено]' ELSE m.content END as content,
                    m.created_at, m.updated_at, m.is_edited, m.is_deleted,
                    u.surname, u.name, u.avatar_uri
             FROM messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.chat_id = $1 AND m.is_deleted = false
             ORDER BY m.created_at DESC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );
        
        // Обновляем время последнего прочтения
        await query(
            `UPDATE chat_participants SET last_read_at = CURRENT_TIMESTAMP 
             WHERE chat_id = $1 AND user_id = $2`,
            [id, req.userId]
        );
        
        res.json({ messages: result.rows.reverse() });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Отправка сообщения
const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }
        
        // Проверяем, что пользователь участник чата
        const isParticipant = await query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, req.userId]
        );
        
        if (isParticipant.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа к этому чату' });
        }
        
        // Создаем сообщение
        const result = await query(
            `INSERT INTO messages (chat_id, user_id, content) 
             VALUES ($1, $2, $3) RETURNING *`,
            [chatId, req.userId, content.trim()]
        );
        
        // Обновляем last_message_at в чате
        await query(
            `UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [chatId]
        );
        
        const message = result.rows[0];
        
        // Получаем данные пользователя
        const userResult = await query(
            `SELECT surname, name, avatar_uri FROM users WHERE id = $1`,
            [req.userId]
        );
        
        const responseMessage = {
            ...message,
            surname: userResult.rows[0].surname,
            name: userResult.rows[0].name,
            avatar_uri: userResult.rows[0].avatar_uri
        };
        
        res.status(201).json({ success: true, message: responseMessage });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: error.message });
    }
};
// Получение информации о чате (с участниками)
const getChatById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, что пользователь участник чата
        const isParticipant = await query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [id, req.userId]
        );
        
        if (isParticipant.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа к этому чату' });
        }
        
        // Получаем информацию о чате
        const chatResult = await query(
            `SELECT * FROM chats WHERE id = $1`,
            [id]
        );
        
        if (chatResult.rows.length === 0) {
            return res.status(404).json({ error: 'Чат не найден' });
        }
        
        const chat = chatResult.rows[0];
        
        // Получаем участников чата
        const participantsResult = await query(
            `SELECT u.id, u.surname, u.name, u.avatar_uri, u.status,
                    (EXTRACT(EPOCH FROM (NOW() - u.last_seen_at)) / 60) < $2 as is_online
             FROM chat_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.chat_id = $1`,
            [id, process.env.OFFLINE_TIMEOUT_MINUTES || 5]
        );
        
        chat.participants = participantsResult.rows;
        
        res.json({ chat });
    } catch (error) {
        console.error('Get chat by id error:', error);
        res.status(500).json({ error: error.message });
    }
};
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/chat-files');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Маршрут для загрузки файла
router.post('/:chatId/upload', authMiddleware, upload.single('file'), async (req, res) => {
    console.log('📁 Upload request received');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    console.log('ChatId:', req.params.chatId);
    
    try {
        const { chatId } = req.params;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        // Декодируем имя файла
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        let fileType = 'document';
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            fileType = 'image';
        } else if (file.mimetype === 'application/x-zip-compressed') {
            fileType = 'archive';
        } else if (file.mimetype.includes('word') || file.mimetype.includes('document')) {
            fileType = 'document';
        } else {
            fileType = 'document';
        }
        
        // Создаём сообщение
        const content = fileType === 'image' 
            ? `📷 Изображение\n/uploads/chat-files/${file.filename}` 
            : `📎 ${originalName}`;
        
        const result = await query(
            `INSERT INTO messages (chat_id, user_id, content) VALUES ($1, $2, $3) RETURNING id`,
            [chatId, req.userId, content]
        );
        
        const messageId = result.rows[0].id;
        
        // Сохраняем вложение с правильным именем
        await query(
            `INSERT INTO message_attachments (message_id, file_uri, file_name, file_size, file_type, mime_type)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [messageId, `/uploads/chat-files/${file.filename}`, originalName, file.size, fileType, file.mimetype]
        );
        
        console.log('Attachment saved');
        
        // Обновляем last_message_at
        await query(`UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`, [chatId]);
        
        // Получаем данные пользователя
        const userResult = await query(`SELECT surname, name, avatar_uri FROM users WHERE id = $1`, [req.userId]);
        
        res.status(201).json({ 
            success: true, 
            message: {
                id: messageId,
                chat_id: parseInt(chatId),
                user_id: req.userId,
                content: content,
                created_at: new Date().toISOString(),
                surname: userResult.rows[0].surname,
                name: userResult.rows[0].name,
                avatar_uri: userResult.rows[0].avatar_uri,
                attachments: [{
                    id: messageId,
                    file_uri: `/uploads/chat-files/${file.filename}`,
                    file_name: file.originalname,
                    file_size: file.size,
                    file_type: fileType
                }]
            }
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Маршруты
router.use(authMiddleware);
router.get('/', getChats);
router.post('/', createChat);
router.get('/:id/messages', getMessages);
router.post('/:chatId/messages', authMiddleware, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content, attachments = [] } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }
        
        // Проверяем, что пользователь участник чата
        const isParticipant = await query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, req.userId]
        );
        
        if (isParticipant.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа к этому чату' });
        }
        
        // Создаем сообщение
        const result = await query(
            `INSERT INTO messages (chat_id, user_id, content) 
             VALUES ($1, $2, $3) RETURNING *`,
            [chatId, req.userId, content.trim()]
        );
        
        const message = result.rows[0];
        
        // Сохраняем вложения с определением типа
        for (const att of attachments) {
            // Определяем тип файла по mime-type или расширению
            let fileType = 'document';
            if (att.mimeType && att.mimeType.startsWith('image/')) {
                fileType = 'image';
            } else if (att.name && att.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                fileType = 'image';
            }
            
            await query(
                `INSERT INTO message_attachments (message_id, file_uri, file_name, file_size, file_type, mime_type)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [message.id, att.uri, att.name, att.size, fileType, att.mimeType || null]
            );
        }
        
        // Обновляем last_message_at в чате
        await query(
            `UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [chatId]
        );
        
        // Получаем данные пользователя
        const userResult = await query(
            `SELECT surname, name, avatar_uri FROM users WHERE id = $1`,
            [req.userId]
        );
        
        const responseMessage = {
            ...message,
            surname: userResult.rows[0].surname,
            name: userResult.rows[0].name,
            avatar_uri: userResult.rows[0].avatar_uri
        };
        
        res.status(201).json({ success: true, message: responseMessage });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', getChatById);
router.post('/:chatId/upload', authMiddleware, upload.single('file'), async (req, res) => {
    res.json({ success: true, file: req.file });
});
// Получение медиа чата
// Получение медиа чата - максимально простой запрос
// Получение медиа чата
router.get('/:id/media', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Media request for chat:', id);
        
        // Правильный запрос с uploaded_at
        const result = await query(
            `SELECT 
                ma.id, 
                ma.file_name as name, 
                ma.file_uri as url,
                ma.file_type,
                ma.uploaded_at as created_at,
                ma.file_size
             FROM message_attachments ma
             WHERE ma.message_id IN (
                 SELECT id FROM messages WHERE chat_id = $1
             )
             ORDER BY ma.uploaded_at DESC`,
            [id]
        );
        
        console.log('Found attachments:', result.rows.length);
        if (result.rows.length > 0) {
            console.log('First row:', result.rows[0]);
        }
        
        // Форматируем размер
        const rows = result.rows.map(row => ({
            ...row,
            size: row.file_size ? 
                (row.file_size < 1024 ? row.file_size + ' B' :
                 row.file_size < 1024*1024 ? (row.file_size/1024).toFixed(1) + ' KB' :
                 (row.file_size/(1024*1024)).toFixed(1) + ' MB') : '—'
        }));
        
        // Разделяем на файлы и изображения
        const images = rows.filter(r => r.file_type === 'image');
        const files = rows.filter(r => r.file_type !== 'image');
        
        console.log('Images:', images.length, 'Files:', files.length);
        
        res.json({ files, images });
    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/:id/read', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await query(
            `UPDATE chat_participants SET last_read_at = CURRENT_TIMESTAMP 
             WHERE chat_id = $1 AND user_id = $2`,
            [id, req.userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;