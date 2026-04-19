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
const editMessage = async (req, res) => {
    try {
        const { id } = req.params;           // ID сообщения из URL
        const { content } = req.body;        // Новый текст из тела запроса
        const userId = req.userId;            // ID текущего пользователя (из токена)
        
        // 1. Проверяем, что сообщение существует и принадлежит пользователю
        const result = await query(
            `UPDATE messages 
             SET content = $1, updated_at = CURRENT_TIMESTAMP, is_edited = true
             WHERE id = $2 AND user_id = $3 AND is_deleted = false
             RETURNING *`,
            [content, id, userId]
        );
        
        // 2. Если сообщение не найдено или не принадлежит пользователю
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }
        
        // 3. Возвращаем обновлённое сообщение
        res.json({ success: true, message: result.rows[0] });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const reportMessage = async (req, res) => {
    try {
        const { id } = req.params;           // ID сообщения из URL
        const { reason } = req.body;         // Причина жалобы
        const reporterId = req.userId;       // ID того, кто жалуется
        
        // 1. Проверяем, что сообщение существует
        const message = await query(
            `SELECT m.*, u.surname, u.name 
             FROM messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.id = $1 AND m.is_deleted = false`,
            [id]
        );
        
        if (message.rows.length === 0) {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }
        
        // 2. Получаем всех администраторов
        const admins = await query(`SELECT id FROM users WHERE role_id = 1`);
        
        // 3. Создаём уведомление для каждого админа
        for (const admin of admins.rows) {
            await query(
                `INSERT INTO notifications (user_id, type, title, content, data)
                 VALUES ($1, 'report', 'Жалоба на сообщение', 
                         'Пользователь пожаловался на сообщение', $2)`,
                [admin.id, JSON.stringify({
                    messageId: id,
                    messageContent: message.rows[0].content,
                    messageAuthor: `${message.rows[0].surname} ${message.rows[0].name}`,
                    reporterId: reporterId,
                    reason: reason,
                    chatId: message.rows[0].chat_id
                })]
            );
        }
        
        res.json({ success: true, message: 'Жалоба отправлена администратору' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const deleteMessage = async (req, res) => {
    console.log('🗑️ Delete message request for ID:', req.params.id);
    
    try {
        const { id } = req.params;
        
        // 1. Получаем сообщение
        const messageResult = await query(
            `SELECT * FROM messages WHERE id = $1 AND is_deleted = false`,
            [id]
        );
        
        if (messageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }
        
        const message = messageResult.rows[0];
        
        // 2. Проверяем права (только автор может удалить)
        if (message.user_id !== req.userId) {
            return res.status(403).json({ error: 'Нет прав для удаления' });
        }
        
        // 3. Получаем вложения
        const attachments = await query(
            `SELECT * FROM message_attachments WHERE message_id = $1`,
            [id]
        );
        
        console.log(`📎 Found ${attachments.rows.length} attachments to delete`);
        
        // 4. Удаляем файлы с диска
        const fs = require('fs');
        const path = require('path');
        
        for (const att of attachments.rows) {
            const filePath = path.join(__dirname, '../../', att.file_uri);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`✅ Deleted file: ${filePath}`);
            } else {
                console.log(`⚠️ File not found: ${filePath}`);
            }
        }
        
        // 5. Удаляем записи о вложениях из БД
        if (attachments.rows.length > 0) {
            await query(`DELETE FROM message_attachments WHERE message_id = $1`, [id]);
            console.log(`✅ Deleted ${attachments.rows.length} attachment records from DB`);
        }
        
        // 6. Помечаем сообщение как удалённое
        await query(
            `UPDATE messages SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        );
        
        // 7. Обновляем last_message_at в чате
        const lastMessage = await query(
            `SELECT created_at FROM messages WHERE chat_id = $1 AND is_deleted = false ORDER BY created_at DESC LIMIT 1`,
            [message.chat_id]
        );
        
        await query(
            `UPDATE chats SET last_message_at = $1 WHERE id = $2`,
            [lastMessage.rows[0]?.created_at || new Date(), message.chat_id]
        );
        
        console.log('✅ Message deleted successfully');
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: error.message });
    }
}; 



// ========== ГРУППЫ ЧАТОВ (ПАПКИ) ==========

// Получение всех групп пользователя
router.get('/folders', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM chat_folders WHERE user_id = $1 ORDER BY created_at ASC`,
            [req.userId]
        );
        res.json({ folders: result.rows });
    } catch (error) {
        console.error('Get folders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание группы
router.post('/folders', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Укажите название группы' });
        }
        
        const result = await query(
            `INSERT INTO chat_folders (user_id, name) VALUES ($1, $2) RETURNING *`,
            [req.userId, name.trim()]
        );
        
        res.status(201).json({ folder: result.rows[0] });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление группы
router.put('/folders/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon } = req.body;
        
        // Проверяем, что группа принадлежит пользователю
        const check = await query(
            `SELECT id FROM chat_folders WHERE id = $1 AND user_id = $2`,
            [id, req.userId]
        );
        
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }
        
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (name !== undefined) {
            updates.push(`name = $${idx++}`);
            values.push(name.trim());
        }
        if (icon !== undefined) {
            updates.push(`icon = $${idx++}`);
            values.push(icon);
        }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        
        values.push(id);
        
        const result = await query(
            `UPDATE chat_folders SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        
        res.json({ folder: result.rows[0] });
    } catch (error) {
        console.error('Update folder error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление группы
router.delete('/folders/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, что группа принадлежит пользователю
        const check = await query(
            `SELECT id FROM chat_folders WHERE id = $1 AND user_id = $2`,
            [id, req.userId]
        );
        
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }
        
        // Удаляем связи чатов с этой группой (чаты не удаляются)
        await query(`DELETE FROM chat_folder_items WHERE folder_id = $1`, [id]);
        
        // Удаляем группу
        await query(`DELETE FROM chat_folders WHERE id = $1`, [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение чатов в группе
router.get('/folders/:id/chats', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND is_deleted = false) as message_count,
                    (SELECT json_build_object(
                        'id', m.id,
                        'content', CASE WHEN m.is_deleted THEN '[Сообщение удалено]' ELSE m.content END,
                        'created_at', m.created_at,
                        'user_id', m.user_id
                     ) FROM messages m 
                     WHERE m.chat_id = c.id AND m.is_deleted = false 
                     ORDER BY m.created_at DESC LIMIT 1) as last_message
             FROM chats c
             INNER JOIN chat_folder_items fi ON fi.chat_id = c.id
             WHERE fi.folder_id = $1
             ORDER BY c.last_message_at DESC`,
            [id]
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
        console.error('Get folder chats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Добавление чата в группу
router.post('/folders/:folderId/chats/:chatId', authMiddleware, async (req, res) => {
    try {
        const { folderId, chatId } = req.params;
        
        console.log('Adding chat to folder:', { folderId, chatId, userId: req.userId });
        
        // 1. Проверяем, что папка существует и принадлежит пользователю
        const folderCheck = await query(
            'SELECT id FROM chat_folders WHERE id = $1 AND user_id = $2',
            [folderId, req.userId]
        );
        
        if (folderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Папка не найдена' });
        }
        
        // 2. Проверяем, что пользователь участник чата
        const chatCheck = await query(
            'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
            [chatId, req.userId]
        );
        
        if (chatCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа к чату' });
        }
        
        // 3. Добавляем чат в папку
        await query(
            'INSERT INTO chat_folder_items (folder_id, chat_id) VALUES ($1, $2) ON CONFLICT (folder_id, chat_id) DO NOTHING',
            [folderId, chatId]
        );
        
        console.log('Chat added to folder successfully');
        res.json({ success: true });
        
    } catch (error) {
        console.error('Add chat to folder error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Удаление чата из группы
router.delete('/folders/:folderId/chats/:chatId', authMiddleware, async (req, res) => {
    try {
        const { folderId, chatId } = req.params;
        
        await query(
            `DELETE FROM chat_folder_items WHERE folder_id = $1 AND chat_id = $2`,
            [folderId, chatId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Remove chat from folder error:', error);
        res.status(500).json({ error: error.message });
    }
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
            : `📎 ${originalName}\n/uploads/chat-files/${file.filename}`;
        
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
router.put('/messages/:id', authMiddleware, editMessage);
router.delete('/messages/:id', authMiddleware, deleteMessage);
router.post('/messages/:id/report', authMiddleware, reportMessage);
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
router.delete('/messages/:id', authMiddleware, deleteMessage);  






module.exports = router;