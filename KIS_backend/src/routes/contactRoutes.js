const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');

// =====================================================
// ПОЛУЧЕНИЕ СПИСКА КОНТАКТОВ
// =====================================================
router.get('/contacts', authMiddleware, async (req, res) => {
    try {
        // Принятые контакты (в обе стороны)
        const accepted = await query(
            `SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri, u.status as user_status,
                    (EXTRACT(EPOCH FROM (NOW() - u.last_seen_at)) / 60) < 5 as is_online
             FROM contacts c
             JOIN users u ON c.contact_id = u.id
             WHERE c.user_id = $1 AND c.status = 'accepted'
             UNION
             SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri, u.status as user_status,
                    (EXTRACT(EPOCH FROM (NOW() - u.last_seen_at)) / 60) < 5 as is_online
             FROM contacts c
             JOIN users u ON c.user_id = u.id
             WHERE c.contact_id = $1 AND c.status = 'accepted'`,
            [req.userId]
        );

        // Входящие заявки
        const incoming = await query(
            `SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri, c.created_at
             FROM contacts c
             JOIN users u ON c.user_id = u.id
             WHERE c.contact_id = $1 AND c.status = 'pending'`,
            [req.userId]
        );

        // Исходящие заявки
        const outgoing = await query(
            `SELECT u.id, u.surname, u.name, u.patronymic, u.avatar_uri, c.created_at
             FROM contacts c
             JOIN users u ON c.contact_id = u.id
             WHERE c.user_id = $1 AND c.status = 'pending'`,
            [req.userId]
        );

        res.json({
            contacts: accepted.rows,
            incoming: incoming.rows,
            outgoing: outgoing.rows
        });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ОТПРАВИТЬ ЗАЯВКУ В КОНТАКТЫ
// =====================================================
router.post('/contacts/request/:id', authMiddleware, async (req, res) => {
    try {
        const targetId = parseInt(req.params.id);
        const myId = req.userId;

        if (targetId === myId) {
            return res.status(400).json({ error: 'Нельзя добавить себя' });
        }

        // Проверяем, нет ли уже записи
        const existing = await query(
            `SELECT status FROM contacts WHERE 
             (user_id = $1 AND contact_id = $2) OR 
             (user_id = $2 AND contact_id = $1)`,
            [myId, targetId]
        );

        if (existing.rows.length > 0) {
            const status = existing.rows[0].status;
            if (status === 'accepted') return res.status(400).json({ error: 'Вы уже в контактах' });
            if (status === 'pending') return res.status(400).json({ error: 'Заявка уже отправлена' });
            if (status === 'declined') {
                // Если отклонили ранее, можно попробовать снова
                await query(
                    `UPDATE contacts SET status = 'pending', created_at = CURRENT_TIMESTAMP 
                     WHERE user_id = $1 AND contact_id = $2`,
                    [myId, targetId]
                );
                return res.json({ success: true });
            }
        }

        // Создаем заявку
        await query(
            `INSERT INTO contacts (user_id, contact_id, status) VALUES ($1, $2, 'pending')`,
            [myId, targetId]
        );

        // Отправляем уведомление
        await query(
            `INSERT INTO notifications (user_id, category, title, content, link_type, link_id)
             VALUES ($1, 'system', 'Заявка в контакты', $2, 'contact_request', $3)`,
            [targetId, `Пользователь ${req.user.surname} ${req.user.name} хочет добавить вас в контакты`, myId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Send contact request error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПРИНЯТЬ / ОТКЛОНИТЬ ЗАЯВКУ
// =====================================================
router.post('/contacts/respond/:id', authMiddleware, async (req, res) => {
    try {
        const senderId = parseInt(req.params.id); // Кто отправил заявку
        const myId = req.userId;
        const { action } = req.body; // 'accept' или 'decline'

        const newStatus = action === 'accept' ? 'accepted' : 'declined';

        const result = await query(
            `UPDATE contacts SET status = $1 
             WHERE user_id = $2 AND contact_id = $3 AND status = 'pending'
             RETURNING *`,
            [newStatus, senderId, myId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заявка не найдена' });
        }

        // Если приняли — создаем встречную запись для симметрии
        if (action === 'accept') {
            const existingReverse = await query(
                `SELECT 1 FROM contacts WHERE user_id = $1 AND contact_id = $2`,
                [myId, senderId]
            );
            if (existingReverse.rows.length === 0) {
                await query(
                    `INSERT INTO contacts (user_id, contact_id, status) VALUES ($1, $2, 'accepted')`,
                    [myId, senderId]
                );
            } else {
                await query(
                    `UPDATE contacts SET status = 'accepted' WHERE user_id = $1 AND contact_id = $2`,
                    [myId, senderId]
                );
            }

            // Уведомление отправителю
            await query(
                `INSERT INTO notifications (user_id, category, title, content)
                 VALUES ($1, 'system', 'Заявка принята', $2)`,
                [senderId, `Пользователь ${req.user.surname} ${req.user.name} принял вашу заявку`]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Respond contact request error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// УДАЛИТЬ ИЗ КОНТАКТОВ
// =====================================================
router.delete('/contacts/:id', authMiddleware, async (req, res) => {
    try {
        const targetId = parseInt(req.params.id);
        const myId = req.userId;

        await query(
            `DELETE FROM contacts WHERE 
             (user_id = $1 AND contact_id = $2) OR 
             (user_id = $2 AND contact_id = $1)`,
            [myId, targetId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;