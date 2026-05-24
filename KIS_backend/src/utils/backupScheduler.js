const cron = require('node-cron');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const execPromise = util.promisify(exec);

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

async function createAutoBackup() {
    try {
        console.log('🤖 Автоматическое создание бэкапа...');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const backupDir = path.join(__dirname, '../../backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const dbName = process.env.DB_NAME || 'corporate_messenger';
        const dbUser = process.env.DB_USER || 'messenger_user';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 5432;
        
        const backupFilename = `auto_backup_${timestamp}.sql`;
        const backupPath = path.join(backupDir, backupFilename);
        
        const dumpCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} \
            --clean --if-exists \
            --no-owner --no-privileges \
            -f "${backupPath}"`;
        
        process.env.PGPASSWORD = process.env.DB_PASSWORD;
        
        const { stdout, stderr } = await execPromise(dumpCmd);
        
        const stats = fs.statSync(backupPath);
        const fileSize = stats.size;
        
        // Сохраняем информацию о бэкапе
        await query(
            `INSERT INTO backups (filename, filepath, size_bytes, type, status)
             VALUES ($1, $2, $3, 'auto', 'completed')`,
            [backupFilename, backupPath, fileSize]
        );
        
        // Удаляем старые авто-бэкапы (оставляем только 10 последних)
        const oldBackups = await query(
            `SELECT id, filepath FROM backups WHERE type = 'auto' ORDER BY created_at DESC OFFSET 10`
        );
        
        for (const old of oldBackups.rows) {
            if (fs.existsSync(old.filepath)) {
                fs.unlinkSync(old.filepath);
            }
            await query(`DELETE FROM backups WHERE id = $1`, [old.id]);
        }
        
        console.log(`✅ Авто-бэкап создан: ${backupFilename} (${formatFileSize(fileSize)})`);
        
    } catch (error) {
        console.error('❌ Auto backup error:', error);
    }
}

// Запуск планировщика
function startBackupScheduler() {
    // Каждый день в 02:00
    cron.schedule('0 2 * * *', () => {
        createAutoBackup();
    });
    
    console.log('⏰ Планировщик бэкапов запущен (ежедневно в 02:00)');
}

module.exports = { startBackupScheduler, createAutoBackup };