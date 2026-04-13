const { query, transaction } = require('../config/database');
const User = require('./User');

class Message {
    // Создание сообщения
    static async create(chatId, userId, content, attachments = []) {
        return await transaction(async (client) => {
            // Создаем сообщение
            const messageResult = await client.query(
                `INSERT INTO messages (chat_id, user_id, content) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [chatId, userId, content]
            );
            const message = messageResult.rows[0];

            // Добавляем вложения
            for (const attachment of attachments) {
                await client.query(
                    `INSERT INTO message_attachments (message_id, file_uri, file_name, file_size, file_type, mime_type)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [message.id, attachment.uri, attachment.name, attachment.size, attachment.type, attachment.mimeType]
                );
            }

            // Обновляем last_message_at в чате
            await client.query(
                `UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [chatId]
            );

            return message;
        });
    }

    // Получение сообщений чата (с пагинацией)
    static async getChatMessages(chatId, userId, limit = 50, offset = 0) {
        // Проверяем, что пользователь участник чата
        const participantCheck = await query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        if (participantCheck.rows.length === 0) {
            throw new Error('Access denied');
        }

        const result = await query(
            `SELECT 
                m.id, m.chat_id, m.user_id, 
                CASE WHEN m.is_deleted THEN '[Сообщение удалено]' ELSE m.content END as content,
                m.created_at, m.updated_at, m.is_edited, m.is_deleted,
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
             WHERE m.chat_id = $1 AND m.is_deleted = false
             ORDER BY m.created_at DESC
             LIMIT $2 OFFSET $3`,
            [chatId, limit, offset]
        );

        return result.rows.reverse(); // Возвращаем в хронологическом порядке
    }

    // Редактирование сообщения
    static async edit(messageId, userId, newContent) {
        const result = await query(
            `UPDATE messages 
             SET content = $1, updated_at = CURRENT_TIMESTAMP, is_edited = true
             WHERE id = $2 AND user_id = $3 AND is_deleted = false
             RETURNING *`,
            [newContent, messageId, userId]
        );
        return result.rows[0];
    }

    // Удаление сообщения (soft delete)
    static async delete(messageId, userId) {
        const result = await query(
            `UPDATE messages 
             SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2 AND is_deleted = false
             RETURNING *`,
            [messageId, userId]
        );
        
        if (result.rows[0]) {
            // Создаем уведомление для админов
            const admins = await User.getAdmins();
            const message = result.rows[0];
            
            for (const admin of admins) {
                await query(
                    `INSERT INTO notifications (user_id, type, title, content, data)
                     VALUES ($1, 'deleted_message', 'Сообщение удалено', 
                             'Пользователь удалил сообщение', 
                             $2)`,
                    [admin.id, JSON.stringify({
                        messageId: message.id,
                        originalContent: message.content,
                        chatId: message.chat_id,
                        deletedBy: userId
                    })]
                );
            }
        }
        
        return result.rows[0];
    }

    // Жалоба на сообщение
    static async report(messageId, reporterId, reason) {
        const message = await query(
            `SELECT m.*, u.surname, u.name 
             FROM messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.id = $1 AND m.is_deleted = false`,
            [messageId]
        );
        
        if (message.rows.length === 0) {
            throw new Error('Message not found');
        }
        
        // Создаем уведомление для админов
        const admins = await User.getAdmins();
        
        for (const admin of admins) {
            await query(
                `INSERT INTO notifications (user_id, type, title, content, data)
                 VALUES ($1, 'report', 'Жалоба на сообщение', 
                         'Пользователь пожаловался на сообщение', 
                         $2)`,
                [admin.id, JSON.stringify({
                    messageId: messageId,
                    messageContent: message.rows[0].content,
                    messageAuthor: `${message.rows[0].surname} ${message.rows[0].name}`,
                    reporterId: reporterId,
                    reason: reason,
                    chatId: message.rows[0].chat_id
                })]
            );
        }
        
        return true;
    }

    // Поиск сообщений
    static async search(userId, query_text, limit = 50) {
        const result = await query(
            `SELECT m.id, m.chat_id, m.content, m.created_at,
                    c.name as chat_name, c.is_group,
                    u.surname, u.name
             FROM messages m
             JOIN chat_participants cp ON cp.chat_id = m.chat_id AND cp.user_id = $1
             JOIN chats c ON c.id = m.chat_id
             JOIN users u ON m.user_id = u.id
             WHERE m.content ILIKE $2 AND m.is_deleted = false
             ORDER BY m.created_at DESC
             LIMIT $3`,
            [userId, `%${query_text}%`, limit]
        );
        return result.rows;
    }
}

module.exports = Message;