const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { checkDocumentPermission } = require('../middleware/documentPermissions');
const { query, transaction } = require('../config/database');
const docxService = require('../services/docxService');
const { formatNumber, getPeriodKey } = require('./documentTypeRoutes');
const { resolveAllSteps } = require('../services/assigneeResolver');
// =====================================================
// ПАПКИ
// =====================================================

const documentsDir = path.join(__dirname, '../../public/uploads/documents');
const attachmentsDir = path.join(__dirname, '../../public/uploads/doc-attachments');

[documentsDir, attachmentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// =====================================================
// MULTER ДЛЯ ВЛОЖЕНИЙ
// =====================================================

const attachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, attachmentsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
    }
});

const uploadAttachment = multer({
    storage: attachmentStorage,
    limits: { fileSize: 20 * 1024 * 1024 }
});

// =====================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================

/**
 * Проверка доступа пользователя к документу
 * Возвращает: 'full' | 'edit' | 'view' | null (нет доступа)
 */
async function getUserAccessLevel(documentId, userId, isSuperAdmin = false, permissions = {}) {
    // Супер-админ всегда full
    if (isSuperAdmin) return 'full';
    
    const docResult = await query(
        `SELECT created_by, department_id, status FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId]
    );
    
    if (docResult.rows.length === 0) return null;
    
    const doc = docResult.rows[0];
    
    // Автор — всегда full
    if (doc.created_by === userId) return 'full';
    
    // Проверка явного доступа
    const userResult = await query(
        `SELECT access_level FROM document_access 
         WHERE document_id = $1 AND user_id = $2
         ORDER BY CASE access_level WHEN 'full' THEN 3 WHEN 'edit' THEN 2 WHEN 'view' THEN 1 ELSE 0 END DESC
         LIMIT 1`,
        [documentId, userId]
    );
    
    if (userResult.rows.length > 0) {
        return userResult.rows[0].access_level;
    }
    
    // Проверка доступа через подразделение пользователя
    const userDept = await query(
        `SELECT department_id FROM users WHERE id = $1`,
        [userId]
    );
    
    if (userDept.rows.length > 0 && userDept.rows[0].department_id) {
        const deptResult = await query(
            `SELECT access_level FROM document_access 
             WHERE document_id = $1 AND department_id = $2
             ORDER BY CASE access_level WHEN 'full' THEN 3 WHEN 'edit' THEN 2 WHEN 'view' THEN 1 ELSE 0 END DESC
             LIMIT 1`,
            [documentId, userDept.rows[0].department_id]
        );
        
        if (deptResult.rows.length > 0) {
            return deptResult.rows[0].access_level;
        }
    }
    
    // Проверка: пользователь — участник маршрута
    const routeResult = await query(
        `SELECT route_data FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
        [documentId]
    );
    
    if (routeResult.rows.length > 0) {
        const steps = routeResult.rows[0].route_data?.steps || [];
        const isParticipant = steps.some(s => s.user_id === userId);
        if (isParticipant) {
            return 'view'; // участники маршрута — только просмотр, если не указано иное
        }
    }
    
    // Проверка глобального права view = 'all'
    if (permissions.view === 'all') return 'view';
    
    return null;
}

/**
 * Внутренний вызов нумерации для регистрации документа
 */
async function generateRegNumber(client, type, userId) {
    const periodKey = getPeriodKey(type.numbering_reset_period);
    
    // Блокируем строку счётчика для атомарности
    let counterResult = await client.query(
        `SELECT id, last_number FROM document_numbering_counters 
         WHERE document_type_id = $1 AND period_key = $2
         FOR UPDATE`,
        [type.id, periodKey]
    );
    
    let lastNumber;
    if (counterResult.rows.length === 0) {
        // Первый документ в этом периоде
        lastNumber = (type.numbering_next || 1) - 1;
        
        await client.query(
            `INSERT INTO document_numbering_counters (document_type_id, period_key, last_number)
             VALUES ($1, $2, $3)`,
            [type.id, periodKey, lastNumber + 1]
        );
    } else {
        lastNumber = counterResult.rows[0].last_number;
        
        await client.query(
            `UPDATE document_numbering_counters SET last_number = last_number + 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [counterResult.rows[0].id]
        );
    }
    
    const nextNumber = lastNumber + 1;
    return formatNumber(type.numbering_pattern, nextNumber, type.code);
}

/**
 * Обогащение field_values для генерации docx
 * Преобразует { counterparty_id: 5, signer_id: 3 } в { Контрагент: "ООО Ромашка", Подписант: "Иванов И.И." }
 */
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
// CRUD ДОКУМЕНТОВ
// =====================================================

// Получение списка документов (с фильтрами)
router.get('/documents', authMiddleware, async (req, res) => {
    try {
        const { 
            search = '', 
            document_type_id,
            status,
            created_by_me = 'false',
            limit = 50, 
            offset = 0,
            sort_by = 'created_at',
            sort_dir = 'desc'
        } = req.query;
        
        const allowedSortFields = ['created_at', 'updated_at', 'reg_number', 'title', 'status'];
        const safeSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
        const safeSortDir = sort_dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        let sql = `
            SELECT 
                d.id, d.title, d.document_type_id, d.template_id,
                d.reg_number, d.reg_date, d.status, d.priority,
                d.current_version, d.generated_file_uri,
                d.created_by, d.created_at, d.updated_at,
                dt.name as document_type_name,
                dt.code as document_type_code,
                dt.icon as document_type_icon,
                u.surname as created_by_surname,
                u.name as created_by_name,
                dpt.name as department_name
            FROM documents d
            LEFT JOIN document_types dt ON d.document_type_id = dt.id
            LEFT JOIN users u ON d.created_by = u.id
            LEFT JOIN departments dpt ON d.department_id = dpt.id
            WHERE d.deleted_at IS NULL
        `;
        
        const params = [];
        let idx = 1;
        
        // Если не супер-админ и не has 'view' = 'all' — фильтруем
        if (!req.user?.is_super_admin) {
            const permResult = await query(
                `SELECT permissions FROM roles WHERE id = (SELECT role_id FROM users WHERE id = $1)`,
                [req.userId]
            );
            const perms = permResult.rows[0]?.permissions?.documents || {};
            
            if (perms.view !== 'all') {
                // Показываем: свои + где есть явный доступ + где участник маршрута
                sql += ` AND (
                    d.created_by = $${idx}
                    OR EXISTS (SELECT 1 FROM document_access da 
                               WHERE da.document_id = d.id AND da.user_id = $${idx})
                    OR EXISTS (SELECT 1 FROM document_access da 
                               JOIN users u2 ON u2.department_id = da.department_id
                               WHERE da.document_id = d.id AND u2.id = $${idx})
                    OR EXISTS (SELECT 1 FROM document_routes dr 
                               WHERE dr.document_id = d.id 
                               AND dr.route_data::text LIKE '%"user_id":' || $${idx} || '%')
                )`;
                params.push(req.userId);
                idx++;
            }
        }
        
        if (document_type_id) {
            sql += ` AND d.document_type_id = $${idx++}`;
            params.push(parseInt(document_type_id));
        }
        
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            const placeholders = statuses.map(() => `$${idx++}`).join(', ');
            sql += ` AND d.status IN (${placeholders})`;
            params.push(...statuses);
        }
        
        if (created_by_me === 'true') {
            sql += ` AND d.created_by = $${idx++}`;
            params.push(req.userId);
        }
        
        if (search) {
            sql += ` AND (d.title ILIKE $${idx} OR d.reg_number ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        
        sql += ` ORDER BY d.${safeSortBy} ${safeSortDir}`;
        sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await query(sql, params);
        
        const documents = result.rows.map(d => ({
            ...d,
            created_by_name: d.created_by_surname 
                ? `${d.created_by_surname} ${d.created_by_name || ''}`.trim() 
                : null
        }));
        
        // Считаем total (упрощённо, без учёта прав)
        const countResult = await query(
            `SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL`
        );
        
        res.json({ 
            documents, 
            total: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение одного документа
router.get('/documents/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверка доступа
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (!accessLevel) {
            return res.status(403).json({ error: 'Нет доступа к документу' });
        }
        
        const result = await query(
            `SELECT d.*, 
                    dt.name as document_type_name,
                    dt.code as document_type_code,
                    dt.icon as document_type_icon,
                    dt.numbering_pattern,
                    dt.numbering_reset_period,
                    u.surname as created_by_surname,
                    u.name as created_by_name,
                    dpt.name as department_name,
                    tmpl.name as template_name,
                    tmpl.template_data,
                    tmpl.template_file_uri
             FROM documents d
             LEFT JOIN document_types dt ON d.document_type_id = dt.id
             LEFT JOIN users u ON d.created_by = u.id
             LEFT JOIN departments dpt ON d.department_id = dpt.id
             LEFT JOIN document_templates tmpl ON d.template_id = tmpl.id
             WHERE d.id = $1 AND d.deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        
        const doc = result.rows[0];
        doc.created_by_name = doc.created_by_surname 
            ? `${doc.created_by_surname} ${doc.created_by_name || ''}`.trim() 
            : null;
        doc.access_level = accessLevel;
        
        // Получаем маршрут
        const routeResult = await query(
            `SELECT * FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
            [id]
        );
        doc.route = routeResult.rows[0] || null;
        
        // Доступ
        const accessResult = await query(
            `SELECT da.*, u.surname, u.name, dpt.name as department_name
             FROM document_access da
             LEFT JOIN users u ON da.user_id = u.id
             LEFT JOIN departments dpt ON da.department_id = dpt.id
             WHERE da.document_id = $1`,
            [id]
        );
        doc.access_list = accessResult.rows;
        
        // Вложения
        const attachResult = await query(
            `SELECT * FROM document_attachments WHERE document_id = $1 ORDER BY uploaded_at DESC`,
            [id]
        );
        doc.attachments = attachResult.rows;
        
        // Подписи
        const sigResult = await query(
            `SELECT ds.*, u.surname, u.name
             FROM document_signatures ds
             LEFT JOIN users u ON ds.user_id = u.id
             WHERE ds.document_id = $1 ORDER BY ds.signed_at DESC`,
            [id]
        );
        doc.signatures = sigResult.rows;
        // Версии документа
        const versionsResult = await query(
            `SELECT dv.*, u.surname, u.name
             FROM document_versions dv
             LEFT JOIN users u ON dv.created_by = u.id
             WHERE dv.document_id = $1
             ORDER BY dv.version_number DESC`,
            [id]
        );
        doc.versions = versionsResult.rows;
        res.json({ document: doc });
    } catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание документа
router.post('/documents',
    authMiddleware,
    checkDocumentPermission('create'),
    async (req, res) => {
    try {
        const {
            title,
            document_type_id,
            template_id,
            field_values = {},
            access_user_ids = [],
            access_department_ids = [],
            route_data = null,
            workflow_template_id = null
        } = req.body;
        
        if (!title) {
            return res.status(400).json({ 
                error: 'Укажите название документа' 
            });
        }
        
        // Определяем тип: если не передан — используем системный "simple"
        let finalTypeId = document_type_id;
        let type = null;
        
        if (finalTypeId) {
            const typeResult = await query(
                `SELECT * FROM document_types WHERE id = $1 AND is_active = true`,
                [finalTypeId]
            );
            if (typeResult.rows.length === 0) {
                return res.status(400).json({ error: 'Тип документа не найден' });
            }
            type = typeResult.rows[0];
        } else {
            // Ищем системный тип "Простой документ"
            const simpleTypeResult = await query(
                `SELECT * FROM document_types WHERE code = 'simple' LIMIT 1`
            );
            if (simpleTypeResult.rows.length === 0) {
                return res.status(500).json({ 
                    error: 'Системный тип "Простой документ" не найден. Обратитесь к администратору.' 
                });
            }
            type = simpleTypeResult.rows[0];
            finalTypeId = type.id;
        }
        
        // Если указан шаблон — проверяем
        let template = null;
        if (template_id) {
            const tmplResult = await query(
                `SELECT * FROM document_templates WHERE id = $1 AND deleted_at IS NULL`,
                [template_id]
            );
            if (tmplResult.rows.length === 0) {
                return res.status(400).json({ error: 'Шаблон не найден' });
            }
            template = tmplResult.rows[0];
        }
        
        // Получаем отдел автора
        const userDept = await query(
            `SELECT department_id FROM users WHERE id = $1`,
            [req.userId]
        );
        const departmentId = userDept.rows[0]?.department_id;
        
        // Начинаем транзакцию
        const result = await transaction(async (client) => {
            // Создаём документ
            const docResult = await client.query(
                `INSERT INTO documents (
                    title, document_type_id, template_id,
                    field_values, status, priority,
                    created_by, department_id
                )
                VALUES ($1, $2, $3, $4, 'draft', 'normal', $5, $6)
                RETURNING *`,
                [
                    title.trim(),
                    finalTypeId,
                    template_id || null,
                    JSON.stringify(field_values),
                    req.userId,
                    departmentId
                ]
            );
            
            const doc = docResult.rows[0];
            
            // Явный доступ
            for (const userId of access_user_ids) {
                await client.query(
                    `INSERT INTO document_access (document_id, user_id, access_level, granted_by)
                     VALUES ($1, $2, 'view', $3)`,
                    [doc.id, userId, req.userId]
                );
            }
            
            for (const deptId of access_department_ids) {
                await client.query(
                    `INSERT INTO document_access (document_id, department_id, access_level, granted_by)
                     VALUES ($1, $2, 'view', $3)`,
                    [doc.id, deptId, req.userId]
                );
            }
            
            // Маршрут
            let routePayload = route_data;
            
            // Если route_data не передан, но есть workflow_template_id — берём из шаблона
            if (!routePayload && workflow_template_id) {
                const wtResult = await client.query(
                    `SELECT steps FROM workflow_templates WHERE id = $1`,
                    [workflow_template_id]
                );
                if (wtResult.rows.length > 0) {
                    routePayload = {
                        steps: wtResult.rows[0].steps || [],
                        allow_parallel: false,
                        auto_start: true
                    };
                }
            }
            
            // Если route_data всё ещё пусто — берём из типа документа по умолчанию
            if (!routePayload && type.default_workflow_template_id) {
                const wtResult = await client.query(
                    `SELECT steps FROM workflow_templates WHERE id = $1`,
                    [type.default_workflow_template_id]
                );
                if (wtResult.rows.length > 0) {
                    routePayload = {
                        steps: wtResult.rows[0].steps || [],
                        allow_parallel: false,
                        auto_start: true
                    };
                }
            }
            
            if (routePayload && routePayload.steps && Array.isArray(routePayload.steps)) {
                const { resolveAllSteps } = require('../services/assigneeResolver');
                
                // Резолвим исполнителей на момент создания документа
                const documentForResolve = {
                    created_by: req.userId,
                    department_id: departmentId
                };
                
                const resolvedSteps = await resolveAllSteps(routePayload.steps, documentForResolve);
                
                const finalSteps = resolvedSteps.map((s, i) => ({
                    id: s.id || uuidv4(),
                    order: i + 1,
                    type: s.type || 'approval',
                    user_id: s.user_id,
                    role: s.role_label || s.role || '',
                    status: 'pending',
                    comment: null,
                    completed_at: null,
                    // Сохраняем оригинальный тип назначения
                    assignee_type: s.assignee_type,
                    assignee_user_id: s.assignee_user_id,
                    assignee_post_id: s.assignee_post_id,
                    assignee_department_id: s.assignee_department_id,
                    assignee_role_id: s.assignee_role_id,
                    unresolved: s.unresolved || false
                }));
                
                // Проверяем, есть ли нерезолвнутые шаги
                const unresolvedCount = finalSteps.filter(s => s.unresolved).length;
                if (unresolvedCount > 0) {
                    console.warn(`⚠️ ${unresolvedCount} шагов маршрута не удалось зарезолвить`);
                }
                
                const finalRouteData = {
                    ...routePayload,
                    steps: finalSteps
                };
                
                await client.query(
                    `INSERT INTO document_routes (document_id, workflow_template_id, route_data, created_by)
                    VALUES ($1, $2, $3, $4)`,
                    [doc.id, workflow_template_id || null, JSON.stringify(finalRouteData), req.userId]
                );
            }
            
            // Начальная версия
            await client.query(
                `INSERT INTO document_versions (document_id, version_number, field_values, comment, created_by)
                 VALUES ($1, 1, $2, 'Создание документа', $3)`,
                [doc.id, JSON.stringify(field_values), req.userId]
            );
            
            return doc;
        });
        
        res.status(201).json({ document: result });
    } catch (error) {
        console.error('Create document error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление документа (поля, доступ, маршрут)
router.put('/documents/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            field_values,
            access_user_ids,
            access_department_ids,
            route_data,
            priority,
            status
        } = req.body;
        
        // Проверка доступа
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (!accessLevel || (accessLevel !== 'full' && accessLevel !== 'edit')) {
            return res.status(403).json({ error: 'Нет прав на редактирование' });
        }
        
        // Проверяем текущее состояние документа
        const docResult = await query(
            `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        
        const currentDoc = docResult.rows[0];
        
        // Нельзя редактировать поля после запуска маршрута
        const canEditFields = ['draft', 'revision'].includes(currentDoc.status);
        
        await transaction(async (client) => {
            const updates = [];
            const values = [];
            let idx = 1;
            
            if (title !== undefined && canEditFields) {
                updates.push(`title = $${idx++}`);
                values.push(title);
            }
            
            if (priority !== undefined) {
                updates.push(`priority = $${idx++}`);
                values.push(priority);
            }
                        // Смена статуса (только для разрешённых переходов)
            if (status !== undefined) {
                const allowedStatuses = [
                    'draft', 'on_approval', 'revision', 'approved', 
                    'signed', 'registered', 'archived', 'cancelled'
                ];
                if (!allowedStatuses.includes(status)) {
                    throw new Error('Недопустимый статус');
                }
                updates.push(`status = $${idx++}`);
                values.push(status);
            }
            // Изменение полей
            let fieldValuesChanged = false;
            if (field_values !== undefined && canEditFields) {
                updates.push(`field_values = $${idx++}`);
                values.push(JSON.stringify(field_values));
                updates.push(`current_version = current_version + 1`);
                fieldValuesChanged = true;
            }
            
            if (updates.length > 0) {
                updates.push(`updated_at = CURRENT_TIMESTAMP`);
                values.push(id);
                
                await client.query(
                    `UPDATE documents SET ${updates.join(', ')} WHERE id = $${idx}`,
                    values
                );
            }
            
            // Создаём версию если поля изменились
            if (fieldValuesChanged) {
                const newVersion = currentDoc.current_version + 1;
                await client.query(
                    `INSERT INTO document_versions (document_id, version_number, field_values, comment, created_by)
                     VALUES ($1, $2, $3, 'Изменение полей', $4)`,
                    [id, newVersion, JSON.stringify(field_values), req.userId]
                );
            }
            
            // Обновление доступа
            if (access_user_ids !== undefined || access_department_ids !== undefined) {
                // Удаляем старый явный доступ (кроме авто-доступов)
                await client.query(
                    `DELETE FROM document_access WHERE document_id = $1`,
                    [id]
                );
                
                for (const userId of (access_user_ids || [])) {
                    await client.query(
                        `INSERT INTO document_access (document_id, user_id, access_level, granted_by)
                         VALUES ($1, $2, 'view', $3)`,
                        [id, userId, req.userId]
                    );
                }
                
                for (const deptId of (access_department_ids || [])) {
                    await client.query(
                        `INSERT INTO document_access (document_id, department_id, access_level, granted_by)
                         VALUES ($1, $2, 'view', $3)`,
                        [id, deptId, req.userId]
                    );
                }
            }
            
            // Обновление маршрута (только пока не запущен)
            if (route_data !== undefined) {
                const routeCheck = await client.query(
                    `SELECT is_started FROM document_routes WHERE document_id = $1 ORDER BY id DESC LIMIT 1`,
                    [id]
                );
                
                if (routeCheck.rows.length > 0 && routeCheck.rows[0].is_started) {
                    throw new Error('Маршрут уже запущен, изменение запрещено');
                }
                
                // Проставляем order
                const steps = (route_data.steps || []).map((s, i) => ({
                    id: s.id || uuidv4(),
                    order: i + 1,
                    type: s.type || 'approval',
                    user_id: s.user_id,
                    role: s.role || '',
                    status: s.status || 'pending',
                    comment: s.comment || null,
                    completed_at: s.completed_at || null
                }));
                
                const newRouteData = {
                    steps,
                    allow_parallel: route_data.allow_parallel || false,
                    auto_start: route_data.auto_start !== false
                };
                
                // Удаляем старый и создаём новый (пока не запущен)
                await client.query(
                    `DELETE FROM document_routes WHERE document_id = $1`,
                    [id]
                );
                
                await client.query(
                    `INSERT INTO document_routes (document_id, route_data, created_by)
                     VALUES ($1, $2, $3)`,
                    [id, JSON.stringify(newRouteData), req.userId]
                );
            }
        });
        
        // Возвращаем обновлённый документ
        const updatedResult = await query(
            `SELECT * FROM documents WHERE id = $1`,
            [id]
        );
        
        res.json({ document: updatedResult.rows[0] });
    } catch (error) {
        console.error('Update document error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление документа (мягкое)
router.delete('/documents/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (accessLevel !== 'full') {
            return res.status(403).json({ error: 'Нет прав на удаление' });
        }
        
        await query(
            `UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ГЕНЕРАЦИЯ .DOCX
// =====================================================

// Сгенерировать .docx из шаблона
router.post('/documents/:id/generate', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (!accessLevel || (accessLevel !== 'full' && accessLevel !== 'edit')) {
            return res.status(403).json({ error: 'Нет прав на генерацию' });
        }
        
        // Получаем документ
        const docResult = await query(
            `SELECT d.*, 
                    tmpl.template_data as template_data,
                    tmpl.template_file_uri
             FROM documents d
             LEFT JOIN document_templates tmpl ON d.template_id = tmpl.id
             WHERE d.id = $1 AND d.deleted_at IS NULL`,
            [id]
        );
        
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        
        const doc = docResult.rows[0];
        
        if (!doc.template_file_uri) {
            return res.status(400).json({ error: 'У документа нет .docx-шаблона' });
        }
        
        const templatePath = path.join(__dirname, '../../public', doc.template_file_uri);
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: 'Файл шаблона не найден на диске' });
        }
        
        // Собираем данные для подстановки
        const templateMeta = { template_data: doc.template_data };
        const placeholderData = await buildPlaceholderData(templateMeta, doc.field_values || {});
        
        // Генерируем
        const outputFilename = `${uuidv4()}.docx`;
        const outputPath = path.join(documentsDir, outputFilename);
        
        await docxService.generateDocx(templatePath, placeholderData, outputPath);
        
        // Сохраняем в БД
        const fileUri = `/uploads/documents/${outputFilename}`;
        const fileName = `${doc.title || 'document'}.docx`;
        
        await query(
            `UPDATE documents 
             SET generated_file_uri = $1, generated_file_name = $2, generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [fileUri, fileName, id]
        );
        
        res.json({ 
            success: true, 
            file_uri: fileUri,
            file_name: fileName,
            placeholders_used: Object.keys(placeholderData).length
        });
    } catch (error) {
        console.error('Generate document error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Скачать сгенерированный файл
router.get('/documents/:id/download', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (!accessLevel) {
            return res.status(403).json({ error: 'Нет доступа' });
        }
        
        const result = await query(
            `SELECT generated_file_uri, generated_file_name FROM documents WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        
        if (result.rows.length === 0 || !result.rows[0].generated_file_uri) {
            return res.status(404).json({ error: 'Файл не сгенерирован' });
        }
        
        const filePath = path.join(__dirname, '../../public', result.rows[0].generated_file_uri);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Файл не найден на диске' });
        }
        
        res.download(filePath, result.rows[0].generated_file_name || 'document.docx');
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// РЕГИСТРАЦИЯ (присвоение номера)
// =====================================================

router.post('/documents/:id/register', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (accessLevel !== 'full' && !req.documentsPermissions?.register && !req.user?.is_super_admin) {
            return res.status(403).json({ error: 'Нет прав на регистрацию' });
        }
        
        const result = await transaction(async (client) => {
            const docResult = await client.query(
                `SELECT d.*, dt.numbering_pattern, dt.numbering_reset_period, dt.numbering_next, dt.code
                 FROM documents d
                 JOIN document_types dt ON d.document_type_id = dt.id
                 WHERE d.id = $1 AND d.deleted_at IS NULL
                 FOR UPDATE`,
                [id]
            );
            
            if (docResult.rows.length === 0) {
                throw new Error('Документ не найден');
            }
            
            const doc = docResult.rows[0];
            
            if (doc.reg_number) {
                throw new Error('Документ уже зарегистрирован');
            }
            
            // Генерируем номер
            const regNumber = await generateRegNumber(client, {
                id: doc.document_type_id,
                numbering_pattern: doc.numbering_pattern,
                numbering_reset_period: doc.numbering_reset_period,
                numbering_next: doc.numbering_next,
                code: doc.code
            }, req.userId);
            
            // Обновляем документ
            const updateResult = await client.query(
                `UPDATE documents 
                 SET reg_number = $1, reg_date = CURRENT_DATE, 
                     registered_by = $2, status = 'registered', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3
                 RETURNING *`,
                [regNumber, req.userId, id]
            );
            
            return updateResult.rows[0];
        });
        
        res.json({ document: result, reg_number: result.reg_number });
    } catch (error) {
        console.error('Register document error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Предпросмотр следующего номера (без регистрации)
router.get('/documents/:id/preview-reg-number', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT dt.numbering_pattern, dt.numbering_reset_period, dt.numbering_next, dt.code, dt.id as type_id
             FROM documents d
             JOIN document_types dt ON d.document_type_id = dt.id
             WHERE d.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        
        const type = result.rows[0];
        const periodKey = getPeriodKey(type.numbering_reset_period);
        
        const counterResult = await query(
            `SELECT last_number FROM document_numbering_counters 
             WHERE document_type_id = $1 AND period_key = $2`,
            [type.type_id, periodKey]
        );
        
        const lastNumber = counterResult.rows[0]?.last_number || (type.numbering_next - 1);
        const nextNumber = lastNumber + 1;
        const previewNumber = formatNumber(type.numbering_pattern, nextNumber, type.code);
        
        res.json({ next_reg_number: previewNumber });
    } catch (error) {
        console.error('Preview reg number error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ВЕРСИИ
// =====================================================

router.get('/documents/:id/versions', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (!accessLevel) {
            return res.status(403).json({ error: 'Нет доступа' });
        }
        
        const result = await query(
            `SELECT dv.*, u.surname, u.name
             FROM document_versions dv
             LEFT JOIN users u ON dv.created_by = u.id
             WHERE dv.document_id = $1
             ORDER BY dv.version_number DESC`,
            [id]
        );
        
        res.json({ versions: result.rows });
    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ВЛОЖЕНИЯ
// =====================================================

router.post('/documents/:id/attachments', 
    authMiddleware, 
    uploadAttachment.single('file'),
    async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (!accessLevel || (accessLevel !== 'full' && accessLevel !== 'edit')) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Нет прав' });
        }
        
        const fileUri = `/uploads/doc-attachments/${req.file.filename}`;
        const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(fileName).toLowerCase();
        
        const result = await query(
            `INSERT INTO document_attachments 
             (document_id, file_uri, file_name, file_size, file_type, mime_type, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                id, fileUri, fileName, req.file.size,
                ext.replace('.', ''), req.file.mimetype, req.userId
            ]
        );
        
        res.status(201).json({ attachment: result.rows[0] });
    } catch (error) {
        console.error('Upload attachment error:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/documents/:docId/attachments/:attachmentId', authMiddleware, async (req, res) => {
    try {
        const { docId, attachmentId } = req.params;
        
        const accessLevel = await getUserAccessLevel(
            parseInt(docId), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (accessLevel !== 'full' && accessLevel !== 'edit') {
            return res.status(403).json({ error: 'Нет прав' });
        }
        
        const result = await query(
            `SELECT file_uri FROM document_attachments WHERE id = $1 AND document_id = $2`,
            [attachmentId, docId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Вложение не найдено' });
        }
        
        // Удаляем файл с диска
        const filePath = path.join(__dirname, '../../public', result.rows[0].file_uri);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        await query(`DELETE FROM document_attachments WHERE id = $1`, [attachmentId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete attachment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ПРЕДПРОСМОТР С ПОДСТАНОВКОЙ (live-preview)
// =====================================================

router.post('/documents/:id/preview-with-data', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { field_values } = req.body;
        
        const accessLevel = await getUserAccessLevel(
            parseInt(id), 
            req.userId, 
            req.user?.is_super_admin, 
            req.documentsPermissions || {}
        );
        
        if (!accessLevel) {
            return res.status(403).json({ error: 'Нет доступа' });
        }
        
        const docResult = await query(
            `SELECT tmpl.template_data, tmpl.template_file_uri, d.field_values
             FROM documents d
             LEFT JOIN document_templates tmpl ON d.template_id = tmpl.id
             WHERE d.id = $1`,
            [id]
        );
        
        if (docResult.rows.length === 0 || !docResult.rows[0].template_file_uri) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        
        const doc = docResult.rows[0];
        const valuesToUse = field_values || doc.field_values || {};
        
        // Строим данные для подстановки
        const placeholderData = await buildPlaceholderData(
            { template_data: doc.template_data },
            valuesToUse
        );
        
        // Генерируем во временный файл
        const tempFilename = `preview_${uuidv4()}.docx`;
        const tempPath = path.join(documentsDir, tempFilename);
        const templatePath = path.join(__dirname, '../../public', doc.template_file_uri);
        
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: 'Файл шаблона не найден' });
        }
        
        await docxService.generateDocx(templatePath, placeholderData, tempPath);
        
        // Конвертируем в HTML
        const { html } = await docxService.docxToHtml(tempPath);
        
        // Удаляем временный файл
        setTimeout(() => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }, 5000);
        
        res.json({ html });
    } catch (error) {
        console.error('Preview with data error:', error);
        res.status(500).json({ error: error.message });
    }
});
// =====================================================
// ПРЕДПРОСМОТР ДОКУМЕНТА С ДАННЫМИ (live-preview в карточке просмотра)
// =====================================================

/**
 * POST /api/documents/:id/preview-with-data
 * Body: { field_values: {...} } — необязательно, если не передали — берём из документа
 * Возвращает: { html }
 */
router.post('/documents/:id/preview-with-data', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { field_values } = req.body;
        
        // Проверка доступа
        const accessLevel = await getUserAccessLevel(
            parseInt(id),
            req.userId,
            req.user?.is_super_admin,
            req.documentsPermissions || {}
        );
        
        if (!accessLevel) {
            return res.status(403).json({ error: 'Нет доступа к документу' });
        }
        
        // Получаем документ + шаблон
        const docResult = await query(
            `SELECT d.id, d.field_values,
                    tmpl.template_data as template_data,
                    tmpl.template_file_uri
             FROM documents d
             LEFT JOIN document_templates tmpl ON d.template_id = tmpl.id
             WHERE d.id = $1 AND d.deleted_at IS NULL`,
            [id]
        );
        
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        
        const doc = docResult.rows[0];
        
        if (!doc.template_file_uri) {
            return res.status(400).json({ 
                error: 'У документа нет .docx-шаблона',
                html: null
            });
        }
        
        const templatePath = path.join(__dirname, '../../public', doc.template_file_uri);
        
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ 
                error: 'Файл шаблона не найден на диске',
                html: null
            });
        }
        
        // Используем field_values из запроса или из документа
        const valuesToUse = field_values || doc.field_values || {};
        
        // Собираем данные для подстановки
        const placeholderData = await buildPlaceholderData(
            { template_data: doc.template_data },
            valuesToUse
        );
        
        // Генерируем во временный файл
        const tempFilename = `preview_${uuidv4()}.docx`;
        const tempPath = path.join(documentsDir, tempFilename);
        
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
        console.error('Preview document with data error:', error);
        res.status(500).json({ 
            error: error.message,
            html: null
        });
    }
});
module.exports = router;