const { query } = require('../config/database');

// Поля, которые никогда не попадают в историю действий
const SENSITIVE_KEY = /(password|passwd|pwd|token|secret|currentpassword|newpassword|pin|apikey|api_key)/i;

function sanitize(value, depth = 0) {
    if (value === null || value === undefined) return null;
    if (depth > 5) return '[длинно]';
    if (Array.isArray(value)) {
        return value.slice(0, 50).map(item => sanitize(item, depth + 1));
    }
    if (typeof value === 'object') {
        if (Buffer.isBuffer(value) || value.buffer) return '[файл]';
        const result = {};
        Object.entries(value).forEach(([key, item]) => {
            result[key] = SENSITIVE_KEY.test(key) ? '[скрыто]' : sanitize(item, depth + 1);
        });
        return result;
    }
    if (typeof value === 'string') return value.slice(0, 2000);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    return String(value).slice(0, 2000);
}

const ENTITY_MAP = {
    users: 'users',
    user: 'users',
    employees: 'users',
    roles: 'roles',
    role: 'roles',
    departments: 'departments',
    department: 'departments',
    structure: 'structure',
    posts: 'posts',
    post: 'posts',
    documents: 'documents',
    document: 'documents',
    'document-types': 'document_types',
    'document-templates': 'document_templates',
    'workflow-templates': 'workflow_templates',
    tasks: 'tasks',
    task: 'tasks',
    'task-templates': 'task_templates',
    chats: 'chats',
    chat: 'chats',
    messages: 'messages',
    message: 'messages',
    moderation: 'moderation',
    reports: 'moderation',
    warnings: 'moderation',
    notes: 'notes',
    note: 'notes',
    contacts: 'contacts',
    contact: 'contacts',
    counterparties: 'counterparties',
    counterparty: 'counterparties',
    notifications: 'notifications',
    notification: 'notifications',
    files: 'files',
    file: 'files',
    folders: 'folders',
    folder: 'folders',
    settings: 'settings',
    backup: 'backups',
    backups: 'backups',
    auth: 'auth',
    admin: 'admin',
    api: 'system'
};

// Отмечаем чтение/просмотры — это не «основные действия» и не должно засорять историю
const SKIP_AUDIT_PATH = /\/api\/(notifications\/\d+\/read|notifications\/read-all|chats\/\d+\/read)$/i;

function inferAuditInfo(req) {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const segments = path.split('/').filter(Boolean);

    let entityType = null;
    let entityId = null;

    for (let i = segments.length - 1; i >= 0; i--) {
        const segment = segments[i];
        if (/^\d+$/.test(segment)) {
            if (entityId === null) entityId = Number(segment);
            continue;
        }
        const normalized = segment.toLowerCase();
        if (ENTITY_MAP[normalized]) {
            entityType = ENTITY_MAP[normalized];
            break;
        }
    }

    if (!entityType) entityType = 'system';
    if (entityId === null) {
        const numeric = segments.find(segment => /^\d+$/.test(segment));
        if (numeric) entityId = Number(numeric);
    }

    return { entityType, entityId };
}

function inferAction(req, info) {
    if (req.audit && req.audit.action) return req.audit.action;

    const path = (req.originalUrl || '').toLowerCase();
    const special = [
        ['/auth/register', 'REGISTER'],
        ['/auth/login', 'LOGIN'],
        ['/auth/logout', 'LOGOUT'],
        ['/change-password', 'CHANGE_PASSWORD'],
        ['/reset-password', 'RESET_PASSWORD'],
        ['/remove-avatar', 'DELETE avatar'],
        ['/upload-avatar', 'UPDATE avatar'],
        ['/warnings', 'WARN user'],
        ['/report', 'REPORT message'],
        ['/approve', 'APPROVE'],
        ['/reject', 'REJECT'],
        ['/sign', 'SIGN'],
        ['/submit', 'SUBMIT'],
        ['/cancel', 'CANCEL'],
        ['/restore', 'RESTORE'],
        ['/duplicate', 'DUPLICATE'],
        ['/generate', 'GENERATE'],
        ['/upload', 'UPLOAD'],
        ['/download', 'DOWNLOAD'],
        ['/move', 'MOVE'],
        ['/register', 'REGISTER']
    ];
    for (const [fragment, action] of special) {
        if (path.includes(fragment)) return action;
    }

    const methodMap = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };
    const verb = methodMap[req.method] || req.method;
    return `${verb} ${info.entityType}`;
}

async function writeAuditLog(req) {
    const source = req.audit || {};
    const userId = source.userId || req.userId || null;
    if (!userId) return;

    const info = inferAuditInfo(req);
    const action = inferAction(req, info);

    const hasBody = req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0;
    const newData = source.newData !== undefined ? source.newData : (hasBody ? req.body : null);
    const oldData = source.oldData !== undefined ? source.oldData : null;
    const userAgent = req.headers && req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : null;

    await query(
        `INSERT INTO audit_logs
            (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
        [
            userId,
            String(action).slice(0, 100),
            String(source.entityType || info.entityType).slice(0, 50),
            source.entityId !== undefined ? source.entityId : info.entityId,
            oldData ? JSON.stringify(sanitize(oldData)) : null,
            newData ? JSON.stringify(sanitize(newData)) : null,
            req.ip || null,
            userAgent
        ]
    );
}

function auditMiddleware(req, res, next) {
    req.audit = req.audit || {};

    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return;
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
        if (req.audit && req.audit.skip) return;
        if (SKIP_AUDIT_PATH.test((req.originalUrl || '').split('?')[0])) return;

        setImmediate(() => {
            writeAuditLog(req).catch(error => {
                console.error('Audit log error:', error.message);
            });
        });
    });

    next();
}

module.exports = { auditMiddleware, writeAuditLog, sanitize };
