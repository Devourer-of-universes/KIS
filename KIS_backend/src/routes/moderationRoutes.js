const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

const modView = [authMiddleware, checkPermission('moderation', 'view')];
const modManage = [authMiddleware, checkPermission('moderation', 'manage')];

// List reports
router.get('/reports', ...modView, async (req, res) => {
  try {
    const { status = 'open', limit = 50, offset = 0 } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (status && status !== 'all') {
      params.push(status);
      where += ` AND r.status = $${params.length}`;
    }
    params.push(Math.min(parseInt(limit) || 50, 200));
    params.push(parseInt(offset) || 0);

    const result = await query(`
      SELECT r.*,
             m.content AS message_content,
             m.is_deleted AS message_deleted,
             m.created_at AS message_created_at,
             c.name AS chat_name,
             c.is_group AS chat_is_group,
             ru.surname AS reported_surname, ru.name AS reported_name, ru.username AS reported_username,
             rp.surname AS reporter_surname, rp.name AS reporter_name, rp.username AS reporter_username,
             rb.surname AS resolved_surname, rb.name AS resolved_name
      FROM message_reports r
      JOIN messages m ON m.id = r.message_id
      JOIN chats c ON c.id = r.chat_id
      JOIN users ru ON ru.id = r.reported_user_id
      JOIN users rp ON rp.id = r.reporter_id
      LEFT JOIN users rb ON rb.id = r.resolved_by
      ${where}
      ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END, r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, status && status !== 'all' ? 1 : 0);
    const countWhere = status && status !== 'all' ? 'WHERE status = $1' : '';
    const count = await query(`SELECT COUNT(*)::int AS total FROM message_reports ${countWhere}`, countParams);

    const countsResult = await query(`
      SELECT status, COUNT(*)::int AS total
      FROM message_reports
      GROUP BY status
    `);
    const counts = { open: 0, reviewed: 0, resolved: 0, dismissed: 0 };
    countsResult.rows.forEach(row => { counts[row.status] = row.total; });
    counts.all = Object.values(counts).reduce((sum, value) => sum + value, 0);

    res.json({ reports: result.rows, total: count.rows[0]?.total || 0, counts });
  } catch (error) {
    console.error('Get moderation reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get any chat messages as moderator
router.get('/chats/:chatId/messages', ...modView, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const offset = parseInt(req.query.offset) || 0;

    const chat = await query(`SELECT id, name, is_group, created_at FROM chats WHERE id = $1`, [chatId]);
    if (chat.rows.length === 0) return res.status(404).json({ error: 'Чат не найден' });

    const participants = await query(`
      SELECT u.id, u.surname, u.name, u.username, u.avatar_uri
      FROM chat_participants cp JOIN users u ON u.id = cp.user_id
      WHERE cp.chat_id = $1
    `, [chatId]);

    const messages = await query(`
      SELECT m.id, m.chat_id, m.user_id, m.content, m.created_at, m.updated_at, m.is_edited, m.is_deleted, m.deleted_at,
             u.surname, u.name, u.username, u.avatar_uri
      FROM messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.chat_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [chatId, limit, offset]);

    res.json({ chat: chat.rows[0], participants: participants.rows, messages: messages.rows.reverse() });
  } catch (error) {
    console.error('Get moderation chat messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve/dismiss report
router.put('/reports/:id', ...modManage, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status = 'reviewed', resolutionNote = '' } = req.body;
    const allowed = ['open', 'reviewed', 'resolved', 'dismissed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Некорректный статус' });

    const isFinalStatus = status === 'resolved' || status === 'dismissed';
    const note = isFinalStatus ? String(resolutionNote || '').trim() : '';
    if (isFinalStatus && !note) return res.status(400).json({ error: 'Укажите комментарий к решению' });

    const markResolved = status !== 'open';
    const result = await query(`
      UPDATE message_reports
      SET status = $1,
          resolved_by = $2,
          resolved_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END,
          resolution_note = $4
      WHERE id = $5 RETURNING *
    `, [status, markResolved ? req.userId : null, markResolved, note, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Жалоба не найдена' });
    res.json({ success: true, report: result.rows[0] });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Warn user
router.post('/warnings', ...modManage, async (req, res) => {
  try {
    const { userId, messageId, reportId, reason } = req.body;
    if (!userId || !reason?.trim()) return res.status(400).json({ error: 'Укажите пользователя и причину' });

    const user = await query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });

    // Avoid requiring USAGE on user_warnings_id_seq (owned by postgres in some installations).
    const nextWarningId = await query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM user_warnings`);
    const warning = await query(`
      INSERT INTO user_warnings (id, user_id, moderator_id, message_id, report_id, reason)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [nextWarningId.rows[0].next_id, userId, req.userId, messageId || null, reportId || null, reason.trim()]);

    await query(`
      INSERT INTO notifications (user_id, category, priority, title, content, link_type, link_id, sender_id)
      VALUES ($1,'system','high','Предупреждение от модератора',$2,'chat_message',$3,$4)
    `, [userId, reason.trim(), messageId || null, req.userId]);

    if (reportId) {
      await query(`UPDATE message_reports SET status='reviewed', resolved_by=$1, resolved_at=CURRENT_TIMESTAMP WHERE id=$2 AND status='open'`, [req.userId, reportId]);
    }

    res.json({ success: true, warning: warning.rows[0] });
  } catch (error) {
    console.error('Create warning error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Moderator delete message
router.delete('/messages/:id', ...modManage, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const { reason = '', reportId = null } = req.body || {};

    const msgResult = await query(`SELECT * FROM messages WHERE id = $1`, [messageId]);
    if (msgResult.rows.length === 0) return res.status(404).json({ error: 'Сообщение не найдено' });
    const message = msgResult.rows[0];
    if (message.is_deleted) return res.json({ success: true, alreadyDeleted: true });

    const attachments = await query(`SELECT * FROM message_attachments WHERE message_id = $1`, [messageId]);
    for (const att of attachments.rows) {
      const filePath = path.join(__dirname, '../../', att.file_uri);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
    if (attachments.rows.length > 0) {
      await query(`DELETE FROM message_attachments WHERE message_id = $1`, [messageId]);
    }

    await query(`UPDATE messages SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, content = '[Сообщение удалено модератором]' WHERE id = $1`, [messageId]);

    const lastMessage = await query(
      `SELECT created_at FROM messages WHERE chat_id = $1 AND is_deleted = false ORDER BY created_at DESC LIMIT 1`,
      [message.chat_id]
    );
    await query(`UPDATE chats SET last_message_at = $1 WHERE id = $2`, [lastMessage.rows[0]?.created_at || null, message.chat_id]);

    // notify author if deleted by moderator and not self
    if (message.user_id !== req.userId) {
      const reasonText = reason?.trim() ? ` Причина: ${reason.trim()}` : '';
      await query(`
        INSERT INTO notifications (user_id, category, priority, title, content, link_type, link_id, sender_id)
        VALUES ($1,'system','high','Ваше сообщение удалено модератором',$2,'chat_message',$3,$4)
      `, [message.user_id, `Сообщение в чате было удалено модератором.${reasonText}`, message.id, req.userId]);
    }

    if (reportId) {
      await query(`UPDATE message_reports SET status='reviewed', resolved_by=$1, resolved_at=CURRENT_TIMESTAMP, resolution_note=COALESCE(NULLIF($2,''), resolution_note) WHERE id=$3`, [req.userId, reason || '', reportId]);
    } else {
      await query(`UPDATE message_reports SET status='reviewed', resolved_by=$1, resolved_at=CURRENT_TIMESTAMP, resolution_note=COALESCE(NULLIF($2,''), resolution_note) WHERE message_id=$3 AND status IN ('open','reviewed')`, [req.userId, reason || '', messageId]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Moderator delete message error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
