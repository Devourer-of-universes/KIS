const { query, transaction } = require('../config/database');

class Chat {
    // Создание личного чата
    static async createPrivateChat(userId1, userId2, createdBy) {
        return await transaction(async (client) => {
            // Проверяем, существует ли уже чат
            const existing = await client.query(
                `SELECT c.id 
                 FROM chats c
                 JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = $1
                 JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = $2
                 WHERE c.is_group = false`,
                [userId1, userId2]
            );

            if (existing.rows.length > 0) {
                return { id: existing.rows[0].id, isNew: false };
            }

            // Создаем новый чат
            const chatResult = await client.query(
                `INSERT INTO chats (is_group, created_by) VALUES (false, $1) RETURNING *`,
                [createdBy]
            );
            const chat = chatResult.rows[0];

            // Добавляем участников
            await client.query(
                `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)`,
                [chat.id, userId1, userId2]
            );

            return { id: chat.id, isNew: true };
        });
    }

    // Создание группового чата
    static async createGroupChat(name, userIds, createdBy, avatarUri = null) {
        return await transaction(async (client) => {
            const chatResult = await client.query(
                `INSERT INTO chats (name, is_group, created_by, avatar_uri) 
                 VALUES ($1, true, $2, $3) RETURNING *`,
                [name, createdBy, avatarUri]
            );
            const chat = chatResult.rows[0];

            const allUserIds = [...new Set([...userIds, createdBy])];
            for (const userId of allUserIds) {
                await client.query(
                    `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)`,
                    [chat.id, userId]
                );
            }

            return chat;
        });
    }

    // Получение списка чатов пользователя
    static async getUserChats(userId) {
        const result = await query(
            `SELECT 
                c.id, c.name, c.is_group, c.avatar_uri, c.last_message_at,
                cp.last_read_at, cp.is_muted,
                (SELECT COUNT(*) FROM messages m 
                 WHERE m.chat_id = c.id 
                   AND m.created_at > cp.last_read_at 
                   AND m.is_deleted = false 
                   AND m.user_id != $1) as unread_count
             FROM chats c
             JOIN chat_participants cp ON cp.chat_id = c.id AND cp.user_id = $1
             ORDER BY c.last_message_at DESC`,
            [userId]
        );

        const chats = result.rows;

        // Для личных чатов получаем данные собеседника
        for (const chat of chats) {
            if (!chat.is_group && !chat.name) {
                const participants = await query(
                    `SELECT u.id, u.surname, u.name, u.avatar_uri
                     FROM users u
                     JOIN chat_participants cp ON cp.user_id = u.id
                     WHERE cp.chat_id = $1 AND u.id != $2`,
                    [chat.id, userId]
                );
                if (participants.rows[0]) {
                    const p = participants.rows[0];
                    chat.name = `${p.surname} ${p.name}`;
                    chat.avatar_uri = chat.avatar_uri || p.avatar_uri;
                    chat.other_user_id = p.id;
                }
            }
        }

        return chats;
    }

    // Получение информации о чате
    static async getChatById(chatId, userId) {
        const result = await query(
            `SELECT c.* 
             FROM chats c
             JOIN chat_participants cp ON cp.chat_id = c.id
             WHERE c.id = $1 AND cp.user_id = $2`,
            [chatId, userId]
        );

        const chat = result.rows[0];
        if (!chat) return null;

        // Получаем участников
        const participants = await query(
            `SELECT u.id, u.surname, u.name, u.avatar_uri, u.status,
                    (EXTRACT(EPOCH FROM (NOW() - u.last_seen_at)) / 60) < $2 as is_online
             FROM chat_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.chat_id = $1`,
            [chatId, process.env.OFFLINE_TIMEOUT_MINUTES || 5]
        );
        chat.participants = participants.rows;

        return chat;
    }

    // Обновление последнего прочитанного сообщения
    static async updateLastRead(chatId, userId) {
        await query(
            `UPDATE chat_participants 
             SET last_read_at = CURRENT_TIMESTAMP 
             WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
    }

    // Добавление участника в групповой чат
    static async addParticipant(chatId, userId, addedBy) {
        const chat = await this.getChatById(chatId, addedBy);
        if (!chat || !chat.is_group) throw new Error('Invalid chat');

        await query(
            `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [chatId, userId]
        );

        return true;
    }

    // Удаление участника из чата
    static async removeParticipant(chatId, userId, removedBy) {
        const chat = await this.getChatById(chatId, removedBy);
        if (!chat) throw new Error('Chat not found');

        if (chat.created_by === userId) {
            throw new Error('Cannot remove chat creator');
        }

        await query(
            `DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );

        return true;
    }

    // Получение количества непрочитанных сообщений
    static async getUnreadCount(userId) {
        const result = await query(
            `SELECT 
                COUNT(*) as total_unread,
                COUNT(DISTINCT m.chat_id) as chats_with_unread
             FROM messages m
             JOIN chat_participants cp ON cp.chat_id = m.chat_id AND cp.user_id = $1
             WHERE m.created_at > cp.last_read_at
               AND m.is_deleted = false
               AND m.user_id != $1`,
            [userId]
        );
        return result.rows[0];
    }
}

module.exports = Chat;