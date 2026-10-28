const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { checkDocumentPermission } = require('../middleware/documentPermissions');
const { query } = require('../config/database');
const docxService = require('../services/docxService');

// =====================================================
// НАСТРОЙКА MULTER ДЛЯ .DOCX-ШАБЛОНОВ
// =====================================================

const docTemplatesDir = path.join(__dirname, '../../public/uploads/doc-templates');
if (!fs.existsSync(docTemplatesDir)) {
    fs.mkdirSync(docTemplatesDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, docTemplatesDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.docx') {
            return cb(new Error('Разрешены только .docx файлы'));
        }
        cb(null, true);
    }
});

// =====================================================
// CRUD ШАБЛОНОВ ДОКУМЕНТОВ
// =====================================================

// Получение списка шаблонов (для всех авторизованных)
router.get('/document-templates', authMiddleware, async (req, res) => {
    try {
        const { 
            document_type_id, 
            search = '',
            active_only = 'true',
            limit = 50, 
            offset = 0
        } = req.query;
        
        let sql = `
            SELECT 
                dt.id, dt.name, dt.description, dt.document_type_id,
                dt.template_file_uri, dt.template_file_name, dt.template_file_size,
                dt.access_mode, dt.usage_count, dt.version,
                dt.is_active, dt.created_by, dt.department_id,
                dt.created_at, dt.updated_at,
                dt.default_workflow_template_id,
                doctype.name as document_type_name,
                doctype.code as document_type_code,
                u.surname as created_by_surname,
                u.name as created_by_name,
                wt.name as default_workflow_name
            FROM document_templates dt
            LEFT JOIN document_types doctype ON dt.document_type_id = doctype.id
            LEFT JOIN users u ON dt.created_by = u.id
            LEFT JOIN workflow_templates wt ON dt.default_workflow_template_id = wt.id
            WHERE dt.deleted_at IS NULL
        `;
        
        const params = [];
        let idx = 1;
        
        if (active_only === 'true') {
            sql += ` AND dt.is_active = true`;
        }
        
        if (document_type_id) {
            sql += ` AND dt.document_type_id = $${idx++}`;
            params.push(parseInt(document_type_id));
        }
        
        if (search) {
            sql += ` AND (dt.name ILIKE $${idx} OR dt.description ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        
        sql += ` ORDER BY dt.updated_at DESC`;
        sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(sql, params);
        
        // Считаем общее количество
        let countSql = `SELECT COUNT(*) FROM document_templates WHERE deleted_at IS NULL`;
        const countParams = [];
        let countIdx = 1;
        
        if (active_only === 'true') {
            countSql += ` AND is_active = true`;
        }
        if (document_type_id) {
            countSql += ` AND document_type_id = $${countIdx++}`;
            countParams.push(parseInt(document_type_id));
        }
        if (search) {
            countSql += ` AND (name ILIKE $${countIdx} OR description ILIKE $${countIdx})`;
            countParams.push(`%${search}%`);
        }
        
        const countResult = await query(countSql, countParams);
        
        const templates = result.rows.map(t => ({
            ...t,
            created_by_name: t.created_by_surname 
                ? `${t.created_by_surname} ${t.created_by_name || ''}`.trim() 
                : null
        }));
        
        res.json({ 
            templates, 
            total: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get document templates error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение одного шаблона (с полным template_data)
router.get('/document-templates/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT dt.*, 
                    doctype.name as document_type_name,
                    doctype.code as document_type_code,
                    u.surname as created_by_surname,
                    u.name as created_by_name
             FROM document_templates dt
             LEFT JOIN document_types doctype ON dt.document_type_id = doctype.id
             LEFT JOIN users u ON dt.created_by = u.id
             WHERE dt.id = $1 AND dt.deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        
        const template = result.rows[0];
        template.created_by_name = template.created_by_surname 
            ? `${template.created_by_surname} ${template.created_by_name || ''}`.trim() 
            : null;
        
        res.json({ template });
    } catch (error) {
        console.error('Get document template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание шаблона (только manage_templates)
router.post('/document-templates',
    authMiddleware,
    checkDocumentPermission('manage_templates'),
    upload.single('template_file'),
    async (req, res) => {
    try {
        const {
            name,
            description,
            document_type_id,
            template_data,
            default_workflow_template_id,
            access_mode = 'all',
            access_user_ids,
            access_department_ids,
            access_role_ids
        } = req.body;
        
        // Валидация
        if (!name || !document_type_id) {
            return res.status(400).json({ 
                error: 'Укажите название и тип документа' 
            });
        }
        
        // Проверяем тип
        const typeCheck = await query(
            `SELECT id FROM document_types WHERE id = $1`,
            [document_type_id]
        );
        if (typeCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Тип документа не найден' });
        }
        
        // Парсим template_data
        let parsedTemplateData = { fields: [], placeholders: {}, settings: {} };
        if (template_data) {
            try {
                parsedTemplateData = typeof template_data === 'string' 
                    ? JSON.parse(template_data) 
                    : template_data;
            } catch (e) {
                return res.status(400).json({ error: 'Некорректный template_data' });
            }
        }
        
        // Файл шаблона
        let fileUri = null;
        let fileName = null;
        let fileSize = null;
        
        if (req.file) {
            fileUri = `/uploads/doc-templates/${req.file.filename}`;
            fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
            fileSize = req.file.size;
            
            // Валидируем .docx и извлекаем плейсхолдеры
            const filePath = req.file.path;
            const validation = await docxService.validateDocx(filePath);
            
            if (!validation.valid) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ 
                    error: 'Некорректный .docx: ' + validation.error 
                });
            }
            
            try {
                const placeholders = await docxService.extractPlaceholders(filePath);
                parsedTemplateData.detectedPlaceholders = placeholders;
            } catch (e) {
                console.warn('Could not extract placeholders:', e.message);
            }
        }
        
        // Парсим массивы ID
        const parseArray = (val) => {
            if (!val) return null;
            if (Array.isArray(val)) return val.map(Number);
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed.map(Number);
            } catch (e) {}
            return String(val).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        };
        
        const result = await query(
            `INSERT INTO document_templates (
                name, description, document_type_id,
                template_file_uri, template_file_name, template_file_size,
                template_data, default_workflow_template_id,
                access_mode, access_user_ids, access_department_ids, access_role_ids,
                created_by, department_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                name.trim(), description, parseInt(document_type_id),
                fileUri, fileName, fileSize,
                JSON.stringify(parsedTemplateData),
                default_workflow_template_id || null,
                access_mode,
                parseArray(access_user_ids),
                parseArray(access_department_ids),
                parseArray(access_role_ids),
                req.userId, null
            ]
        );
        
        res.status(201).json({ template: result.rows[0] });
    } catch (error) {
        console.error('Create document template error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Парсинг плейсхолдеров из .docx БЕЗ сохранения шаблона
// Используется при выборе файла в UI
router.post('/document-templates/parse-docx',
    authMiddleware,
    checkDocumentPermission('manage_templates'),
    upload.single('template_file'),
    async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const filePath = req.file.path;
        
        // Валидация
        const validation = await docxService.validateDocx(filePath);
        if (!validation.valid) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ 
                error: 'Некорректный .docx: ' + validation.error 
            });
        }
        
        // Парсинг плейсхолдеров
        const placeholders = await docxService.extractPlaceholders(filePath);
        
        // Удаляем временный файл — он нужен только для парсинга
        // Финальный файл загрузится заново при сохранении шаблона
        fs.unlinkSync(filePath);
        
        res.json({ 
            placeholders,
            file_name: Buffer.from(req.file.originalname, 'latin1').toString('utf8')
        });
    } catch (error) {
        console.error('Parse docx error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});
// Обновление шаблона
router.put('/document-templates/:id',
    authMiddleware,
    checkDocumentPermission('manage_templates'),
    upload.single('template_file'),
    async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, description, document_type_id,
            template_data, default_workflow_template_id,
            access_mode, access_user_ids, access_department_ids, access_role_ids,
            is_active
        } = req.body;
        
        // Проверяем существование
        const existing = await query(
            `SELECT * FROM document_templates WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
        if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
        if (document_type_id !== undefined) { updates.push(`document_type_id = $${idx++}`); values.push(parseInt(document_type_id)); }
        if (default_workflow_template_id !== undefined) { 
            updates.push(`default_workflow_template_id = $${idx++}`); 
            values.push(default_workflow_template_id || null); 
        }
        if (access_mode !== undefined) { updates.push(`access_mode = $${idx++}`); values.push(access_mode); }
        if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active); }
        
        // Массивы
        const parseArray = (val) => {
            if (!val) return null;
            if (Array.isArray(val)) return val.map(Number);
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed.map(Number);
            } catch (e) {}
            return String(val).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        };
        
        if (access_user_ids !== undefined) {
            updates.push(`access_user_ids = $${idx++}`);
            values.push(parseArray(access_user_ids));
        }
        if (access_department_ids !== undefined) {
            updates.push(`access_department_ids = $${idx++}`);
            values.push(parseArray(access_department_ids));
        }
        if (access_role_ids !== undefined) {
            updates.push(`access_role_ids = $${idx++}`);
            values.push(parseArray(access_role_ids));
        }
        
        // template_data
        if (template_data !== undefined) {
            let parsedTemplateData;
            try {
                parsedTemplateData = typeof template_data === 'string' 
                    ? JSON.parse(template_data) 
                    : template_data;
            } catch (e) {
                return res.status(400).json({ error: 'Некорректный template_data' });
            }
            updates.push(`template_data = $${idx++}`);
            values.push(JSON.stringify(parsedTemplateData));
        }
        
        // Новый файл
        if (req.file) {
            // Удаляем старый
            if (existing.rows[0].template_file_uri) {
                const oldPath = path.join(__dirname, '../../public', existing.rows[0].template_file_uri);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            
            const fileUri = `/uploads/doc-templates/${req.file.filename}`;
            const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
            const fileSize = req.file.size;
            
            // Валидация
            const validation = await docxService.validateDocx(req.file.path);
            if (!validation.valid) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ 
                    error: 'Некорректный .docx: ' + validation.error 
                });
            }
            
            updates.push(`template_file_uri = $${idx++}`);
            values.push(fileUri);
            updates.push(`template_file_name = $${idx++}`);
            values.push(fileName);
            updates.push(`template_file_size = $${idx++}`);
            values.push(fileSize);
            
            // Извлекаем плейсхолдеры
            try {
                const placeholders = await docxService.extractPlaceholders(req.file.path);
                // Обновляем template_data.detectedPlaceholders
                let tData = typeof template_data === 'string' ? JSON.parse(template_data) : (template_data || existing.rows[0].template_data);
                tData.detectedPlaceholders = placeholders;
                // Заменяем template_data в updates (если ещё не добавлен)
                const tDataIdx = updates.findIndex(u => u.startsWith('template_data ='));
                if (tDataIdx !== -1) {
                    values[tDataIdx] = JSON.stringify(tData);
                } else {
                    updates.push(`template_data = $${idx++}`);
                    values.push(JSON.stringify(tData));
                }
            } catch (e) {
                console.warn('Could not extract placeholders:', e.message);
            }
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        updates.push(`version = version + 1`);
        values.push(id);
        
        const result = await query(
            `UPDATE document_templates SET ${updates.join(', ')} 
             WHERE id = $${idx} RETURNING *`,
            values
        );
        
        res.json({ template: result.rows[0] });
    } catch (error) {
        console.error('Update document template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление шаблона (мягкое)
router.delete('/document-templates/:id',
    authMiddleware,
    checkDocumentPermission('manage_templates'),
    async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, есть ли документы по этому шаблону
        const docsCount = await query(
            `SELECT COUNT(*) FROM documents 
             WHERE template_id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (parseInt(docsCount.rows[0].count) > 0) {
            // Деактивируем
            await query(
                `UPDATE document_templates SET is_active = false, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [id]
            );
            return res.json({ 
                success: true, 
                message: 'Шаблон деактивирован (по нему есть документы)' 
            });
        }
        
        // Мягко удаляем
        await query(
            `UPDATE document_templates SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [id]
        );
        
        res.json({ success: true, message: 'Шаблон удалён' });
    } catch (error) {
        console.error('Delete document template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// РАБОТА С .DOCX
// =====================================================

// Парсинг плейсхолдеров из .docx-файла шаблона
router.get('/document-templates/:id/placeholders', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT template_file_uri FROM document_templates 
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0 || !result.rows[0].template_file_uri) {
            return res.status(404).json({ error: 'Файл шаблона не найден' });
        }
        
        const filePath = path.join(__dirname, '../../public', result.rows[0].template_file_uri);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Файл шаблона не найден на диске' });
        }
        
        const placeholders = await docxService.extractPlaceholders(filePath);
        res.json({ placeholders });
    } catch (error) {
        console.error('Get placeholders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получить HTML-превью шаблона (для редактора)
router.get('/document-templates/:id/preview', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT template_file_uri FROM document_templates 
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0 || !result.rows[0].template_file_uri) {
            return res.status(404).json({ error: 'Файл шаблона не найден' });
        }
        
        const filePath = path.join(__dirname, '../../public', result.rows[0].template_file_uri);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Файл шаблона не найден на диске' });
        }
        
        const { html, messages } = await docxService.docxToHtml(filePath);
        res.json({ html, messages });
    } catch (error) {
        console.error('Preview template error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Скачать файл шаблона
router.get('/document-templates/:id/download', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT template_file_uri, template_file_name FROM document_templates 
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0 || !result.rows[0].template_file_uri) {
            return res.status(404).json({ error: 'Файл шаблона не найден' });
        }
        
        const filePath = path.join(__dirname, '../../public', result.rows[0].template_file_uri);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Файл не найден на диске' });
        }
        
        res.download(filePath, result.rows[0].template_file_name || 'template.docx');
    } catch (error) {
        console.error('Download template error:', error);
        res.status(500).json({ error: error.message });
    }
});
// =====================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: сборка данных для подстановки
// (Дубликат из documentRoutes.js, потом вынесем в сервис)
// =====================================================

/**
 * Сборка данных для подстановки в .docx.
 * @param {Object} template — { template_data: { fields, placeholders } }
 * @param {Object} fieldValues — { fieldKey: value }
 * @returns {Object} { placeholderName: stringValue }
 */
async function buildPlaceholderData(template, fieldValues) {
    const templateData = template?.template_data || template || {};
    if (!templateData.placeholders) return {};
    
    const placeholders = templateData.placeholders;
    const fields = templateData.fields || [];
    
    // Карта: key -> field (чтобы знать тип поля)
    const fieldsMap = {};
    for (const f of fields) {
        if (f && f.key) fieldsMap[f.key] = f;
    }
    
    const result = {};
    
    for (const [placeholderName, sourceKey] of Object.entries(placeholders)) {
        // sourceKey = "counterparty_id" | "counterparty.name" | "signer_id.fullName" | "amount"
        const parts = sourceKey.split('.');
        const fieldKey = parts[0];
        const subfield = parts[1];
        
        const rawValue = fieldValues[fieldKey];
        const field = fieldsMap[fieldKey];
        
        if (rawValue === undefined || rawValue === null || rawValue === '') {
            result[placeholderName] = '';
            continue;
        }
        
        // Разворот по типу поля
        if (field?.type === 'counterparty') {
            const cpResult = await query(
                `SELECT name, full_name, inn, kpp, address, phone, email, 
                        contact_person, contact_position
                 FROM counterparties WHERE id = $1`,
                [rawValue]
            );
            
            if (cpResult.rows.length > 0) {
                const cp = cpResult.rows[0];
                const map = {
                    name: cp.name,
                    fullName: cp.full_name,
                    inn: cp.inn,
                    kpp: cp.kpp,
                    address: cp.address,
                    phone: cp.phone,
                    email: cp.email,
                    contactPerson: cp.contact_person,
                    contactPosition: cp.contact_position
                };
                result[placeholderName] = subfield ? (map[subfield] ?? '') : (cp.name || '');
            } else {
                result[placeholderName] = '';
            }
            continue;
        }
        
        if (field?.type === 'user') {
            const userResult = await query(
                `SELECT u.surname, u.name, u.patronymic, u.email, u.tel_num,
                        p.name as post_name, d.name as department_name
                 FROM users u
                 LEFT JOIN posts p ON u.post_id = p.id
                 LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.id = $1`,
                [rawValue]
            );
            
            if (userResult.rows.length > 0) {
                const u = userResult.rows[0];
                const fullName = `${u.surname || ''} ${u.name || ''} ${u.patronymic || ''}`.trim();
                const shortName = `${u.surname || ''} ${(u.name || '').charAt(0)}.${u.patronymic ? (u.patronymic.charAt(0) + '.') : ''}`.trim();
                const map = {
                    fullName: fullName,
                    shortName: shortName,
                    surname: u.surname,
                    name: u.name,
                    patronymic: u.patronymic,
                    email: u.email,
                    phone: u.tel_num,
                    post: u.post_name,
                    department: u.department_name
                };
                result[placeholderName] = subfield ? (map[subfield] ?? '') : fullName;
            } else {
                result[placeholderName] = '';
            }
            continue;
        }
        
        // Дата
        if (field?.type === 'date' && rawValue) {
            try {
                const d = new Date(rawValue);
                result[placeholderName] = d.toLocaleDateString('ru-RU');
            } catch (e) {
                result[placeholderName] = String(rawValue);
            }
            continue;
        }
        
        // Простое значение
        if (typeof rawValue === 'object') {
            result[placeholderName] = JSON.stringify(rawValue);
        } else if (typeof rawValue === 'boolean') {
            result[placeholderName] = rawValue ? 'Да' : 'Нет';
        } else {
            result[placeholderName] = String(rawValue);
        }
    }
    
    return result;
}
// =====================================================
// ПРЕДПРОСМОТР ШАБЛОНА С ДАННЫМИ (live-preview)
// =====================================================

/**
 * POST /api/document-templates/:id/preview-with-data
 * Body: { field_values: {...} }
 * Возвращает: { html }
 * 
 * Генерирует временный .docx с подстановкой, конвертит в HTML, удаляет временный файл.
 */
router.post('/document-templates/:id/preview-with-data',
    authMiddleware,
    async (req, res) => {
    try {
        const { id } = req.params;
        const { field_values = {} } = req.body;
        
        // Получаем шаблон
        const result = await query(
            `SELECT id, name, template_file_uri, template_data
             FROM document_templates
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        
        const template = result.rows[0];
        
        if (!template.template_file_uri) {
            return res.status(400).json({ 
                error: 'У шаблона нет .docx-файла',
                html: null
            });
        }
        
        const templatePath = path.join(
            __dirname, '../../public',
            template.template_file_uri
        );
        
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ 
                error: 'Файл шаблона не найден на диске',
                html: null
            });
        }
        
        // Собираем данные для подстановки
        // Используем ту же логику, что и в documentRoutes.js → buildPlaceholderData
        const placeholderData = await buildPlaceholderDataFromTemplate(
            template.template_data,
            field_values
        );
        
        // Генерируем во временный файл
        const tempFilename = `preview_${uuidv4()}.docx`;
        const tempPath = path.join(
            __dirname, '../../public/uploads/doc-templates',
            tempFilename
        );
        
        // Директория для временных файлов должна существовать
        const tempDir = path.dirname(tempPath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        await docxService.generateDocx(templatePath, placeholderData, tempPath);
        
        // Конвертируем в HTML
        let html = '';
        try {
            const convResult = await docxService.docxToHtml(tempPath);
            html = convResult.html || '';
        } finally {
            // Удаляем временный файл
            setTimeout(() => {
                if (fs.existsSync(tempPath)) {
                    try { fs.unlinkSync(tempPath); } catch (e) {}
                }
            }, 2000);
        }
        
        res.json({ html });
        
    } catch (error) {
        console.error('Preview template with data error:', error);
        res.status(500).json({ 
            error: error.message,
            html: null
        });
    }
});
module.exports = router;