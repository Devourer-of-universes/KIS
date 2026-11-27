// =====================================================
// АВТОАРХИВАЦИЯ ДОКУМЕНТОВ
// =====================================================
const cron = require('node-cron');
const { query } = require('../config/database');
const { getDocflowSettings } = require('./systemSettings');

/**
 * Переводит в архив подписанные и зарегистрированные документы,
 * срок хранения которых истёк согласно настройкам документооборота.
 */
async function runAutoArchive() {
    const settings = await getDocflowSettings();
    if (!settings.auto_archive_enabled) {
        return { archived: 0, enabled: false, days: settings.auto_archive_days };
    }

    const result = await query(
        `UPDATE documents
         SET status = 'archived', updated_at = CURRENT_TIMESTAMP
         WHERE deleted_at IS NULL
           AND status IN ('signed', 'registered')
           AND COALESCE(reg_date::timestamp, updated_at::timestamp)
               < (NOW()::timestamp - ($1::int || ' days')::interval)
         RETURNING id`,
        [settings.auto_archive_days]
    );

    const ids = result.rows.map(row => row.id);
    if (ids.length) {
        await query(
            `INSERT INTO audit_logs (action, entity_type, entity_id, new_data)
             SELECT 'AUTO_ARCHIVE document', 'document', d.id, '{"status":"archived"}'::jsonb
             FROM documents d WHERE d.id = ANY($1::int[])`,
            [ids]
        );
        console.log(`🗄 Автоархивация: переведено документов в архив: ${ids.length}`);
    }
    return { archived: ids.length, enabled: true, days: settings.auto_archive_days, ids };
}

function startDocumentArchiveScheduler() {
    // Проверка раз в час
    cron.schedule('0 * * * *', () => {
        runAutoArchive().catch(error => console.error('Auto archive error:', error));
    });
    console.log('⏰ Планировщик автоархивации документов запущен (ежечасно)');
}

module.exports = { runAutoArchive, startDocumentArchiveScheduler };
