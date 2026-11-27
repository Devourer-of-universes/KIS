// =====================================================
// CENTRALIZED SYSTEM SETTINGS
// =====================================================
const { query } = require('../config/database');

// Значения по умолчанию. Совпадают с начальными данными в backup.sql.
const SETTING_DEFAULTS = Object.freeze({
    org_name: 'ООО Тест',
    auto_numbering: 'auto',
    org_email: 'info@company.ru',
    org_phone: '+7 (495) 000-00-00',
    auto_archive_enabled: true,
    auto_archive_days: 365,
    deadline_control_days: 14,
    max_file_size: 50,
    allowed_file_types: [],
    storage_path: './uploads',
    session_timeout: 8,
    password_min_length: 6,
    password_require_special: true,
    enable_2fa: false,
    backup_schedule: 'daily',
    backup_time: '02:00',
    backup_retention_days: 30,
    notify_email: 'admin@company.ru',
    notify_critical_errors: true,
    notify_suspicious: true,
    log_level: 'info',
    log_retention_days: 90
});

const ALLOWED_KEYS = new Set(Object.keys(SETTING_DEFAULTS));

function parseDbValue(row) {
    const raw = row.setting_value;
    if (raw === null || raw === undefined) return SETTING_DEFAULTS[row.setting_key];
    if (row.setting_type === 'boolean') return raw === true || String(raw) === 'true';
    if (row.setting_type === 'number') {
        const n = Number(raw);
        return Number.isFinite(n) ? n : SETTING_DEFAULTS[row.setting_key];
    }
    if (row.setting_type === 'json') {
        try { return JSON.parse(raw); } catch (e) { return SETTING_DEFAULTS[row.setting_key]; }
    }
    return raw;
}

function inferType(value) {
    if (typeof value === 'boolean') return { type: 'boolean', value: value ? 'true' : 'false' };
    if (typeof value === 'number' && Number.isFinite(value)) return { type: 'number', value: String(value) };
    if (value && typeof value === 'object') return { type: 'json', value: JSON.stringify(value) };
    return { type: 'string', value: String(value ?? '') };
}

async function getSystemSettings() {
    const result = await query('SELECT setting_key, setting_value, setting_type FROM system_settings');
    const settings = { ...SETTING_DEFAULTS };
    for (const row of result.rows) {
        if (ALLOWED_KEYS.has(row.setting_key)) {
            settings[row.setting_key] = parseDbValue(row);
        }
    }
    return settings;
}

async function upsertSystemSettings(updates, userId = null) {
    const safe = {};
    for (const [key, value] of Object.entries(updates || {})) {
        if (ALLOWED_KEYS.has(key)) safe[key] = value;
    }
    for (const [key, value] of Object.entries(safe)) {
        const inferred = inferType(value);
        await query(
            `INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at, updated_by)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
             ON CONFLICT (setting_key)
             DO UPDATE SET setting_value = EXCLUDED.setting_value,
                           setting_type = EXCLUDED.setting_type,
                           updated_at = CURRENT_TIMESTAMP,
                           updated_by = EXCLUDED.updated_by`,
            [key, inferred.value, inferred.type, userId]
        );
    }
    return safe;
}

async function resetSystemSettings(userId = null) {
    for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
        const inferred = inferType(value);
        await query(
            `INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at, updated_by)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
             ON CONFLICT (setting_key)
             DO UPDATE SET setting_value = EXCLUDED.setting_value,
                           setting_type = EXCLUDED.setting_type,
                           updated_at = CURRENT_TIMESTAMP,
                           updated_by = EXCLUDED.updated_by`,
            [key, inferred.value, inferred.type, userId]
        );
    }
}

function clamp(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
}

async function getDocflowSettings() {
    const settings = await getSystemSettings();
    const enabledRaw = settings.auto_archive_enabled;
    const enabled = enabledRaw !== false && String(enabledRaw).toLowerCase() !== 'false';
    const allowed = Array.isArray(settings.allowed_file_types)
        ? settings.allowed_file_types.map(x => String(x).toLowerCase())
        : [];
    return {
        auto_archive_enabled: enabled,
        auto_archive_days: clamp(settings.auto_archive_days, 30, 3650, 365),
        deadline_control_days: clamp(settings.deadline_control_days, 1, 365, 14),
        max_file_size: clamp(settings.max_file_size, 1, 500, 50),
        allowed_file_types: allowed
    };
}

module.exports = {
    SETTING_DEFAULTS,
    getSystemSettings,
    upsertSystemSettings,
    resetSystemSettings,
    getDocflowSettings
};
