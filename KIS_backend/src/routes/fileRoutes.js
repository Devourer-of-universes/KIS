const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');

// Настройка папки и multer
const storageDir = path.join(__dirname, '../../public/uploads/user-files');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, storageDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${uuidv4()}${ext}`);
        }
    }),
    limits: { fileSize: 100 * 1024 * 1024 } // 100 МБ на файл
});

// Получить статистику (занято/свободно, кол-во по типам)
router.get('/files/stats', authMiddleware, async (req, res) => {
    try {
        const userRes = await query(`SELECT storage_limit FROM users WHERE id = $1`, [req.userId]);
        const limit = parseInt(userRes.rows[0]?.storage_limit) || 5368709120;

        // Считаем занятое место и статистику по типам
        const statsRes = await query(
            `SELECT file_type, COUNT(*) as count, SUM(file_size) as size
             FROM user_files WHERE user_id = $1 GROUP BY file_type`,
            [req.userId]
        );

        let used = 0;
        const byType = {};
        for (const row of statsRes.rows) {
            const size = parseInt(row.size) || 0;
            used += size;
            byType[row.file_type] = { count: parseInt(row.count), size };
        }

        res.json({
            limit,
            used,
            free: Math.max(0, limit - used),
            byType
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить список файлов
router.get('/files', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM user_files WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.userId]
        );
        res.json({ files: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Загрузка файла
router.post('/files/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

        // 1. Проверка лимита
        const userRes = await query(`SELECT storage_limit FROM users WHERE id = $1`, [req.userId]);
        const limit = parseInt(userRes.rows[0]?.storage_limit) || 5368709120;

        const usedRes = await query(
            `SELECT SUM(file_size) as total FROM user_files WHERE user_id = $1`,
            [req.userId]
        );
        const used = parseInt(usedRes.rows[0]?.total) || 0;

        if (used + req.file.size > limit) {
            fs.unlinkSync(req.file.path); // Удаляем загруженный файл
            return res.status(400).json({ error: 'Превышен лимит хранилища' });
        }

        // 2. Определяем тип файла
        const ext = path.extname(req.file.originalname).toLowerCase();
        let fileType = 'other';
        if (['.doc', '.docx'].includes(ext)) fileType = 'doc';
        else if (['.xls', '.xlsx', '.csv'].includes(ext)) fileType = 'excel';
        else if (['.ppt', '.pptx'].includes(ext)) fileType = 'ppt';
        else if (['.pdf'].includes(ext)) fileType = 'pdf';
        else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) fileType = 'image';
        else if (['.zip', '.rar', '.7z'].includes(ext)) fileType = 'archive';

        const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const fileUri = `/uploads/user-files/${req.file.filename}`;
        const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;

        // 3. Сохраняем в БД
        const result = await query(
            `INSERT INTO user_files (user_id, file_name, file_uri, file_size, mime_type, file_type, folder_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.userId, fileName, fileUri, req.file.size, req.file.mimetype, fileType, folderId]
        );

        res.status(201).json({ file: result.rows[0] });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// Удаление файла
router.delete('/files/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            `DELETE FROM user_files WHERE id = $1 AND user_id = $2 RETURNING file_uri`,
            [id, req.userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Файл не найден' });

        const filePath = path.join(__dirname, '../../public', result.rows[0].file_uri);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// =====================================================
// ПАПКИ
// =====================================================


// 1. Получить файлы в КОРНЕ (без папки)
router.get('/files/folder', authMiddleware, async (req, res) => {
    try {
        const folderId = null; // Корень
        
        // Папки в корне
        const folders = await query(
            `SELECT * FROM user_folders WHERE user_id = $1 AND parent_id IS NULL ORDER BY name`,
            [req.userId]
        );
        
        // Файлы в корне
        const files = await query(
            `SELECT * FROM user_files WHERE user_id = $1 AND folder_id IS NULL ORDER BY created_at DESC`,
            [req.userId]
        );
        
        res.json({ folders: folders.rows, files: files.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Получить файлы в КОНКРЕТНОЙ папке
router.get('/files/folder/:folderId', authMiddleware, async (req, res) => {
    try {
        const folderId = parseInt(req.params.folderId);
        
        // Проверка, что папка принадлежит пользователю
        const check = await query(`SELECT id FROM user_folders WHERE id = $1 AND user_id = $2`, [folderId, req.userId]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Нет доступа' });
        
        // Папки внутри текущей
        const folders = await query(
            `SELECT * FROM user_folders WHERE user_id = $1 AND parent_id = $2 ORDER BY name`,
            [req.userId, folderId]
        );
        
        // Файлы внутри текущей
        const files = await query(
            `SELECT * FROM user_files WHERE user_id = $1 AND folder_id = $2 ORDER BY created_at DESC`,
            [req.userId, folderId]
        );
        
        res.json({ folders: folders.rows, files: files.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать папку
router.post('/files/folder', authMiddleware, async (req, res) => {
    try {
        const { name, parentId } = req.body;
        if (!name) return res.status(400).json({ error: 'Введите имя папки' });
        
        const result = await query(
            `INSERT INTO user_folders (user_id, name, parent_id) VALUES ($1, $2, $3) RETURNING *`,
            [req.userId, name.trim(), parentId || null]
        );
        
        res.status(201).json({ folder: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Переместить (файл или папку)
router.put('/files/move', authMiddleware, async (req, res) => {
    try {
        const { id, type, targetFolderId } = req.body; // type: 'file' | 'folder'
        
        const table = type === 'folder' ? 'user_folders' : 'user_files';
        
        // Нельзя переместить папку в саму себя (проверка на цикл)
        if (type === 'folder' && id === targetFolderId) {
            return res.status(400).json({ error: 'Нельзя переместить папку в себя' });
        }
        
        await query(
            `UPDATE ${table} SET ${type === 'folder' ? 'parent_id' : 'folder_id'} = $1 WHERE id = $2 AND user_id = $3`,
            [targetFolderId || null, id, req.userId]
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/files/folder/:id', authMiddleware, async (req, res) => {
    await query(`DELETE FROM user_folders WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    res.json({ success: true });
});
module.exports = router;