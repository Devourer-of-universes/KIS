const { query } = require('./src/config/database');

async function checkMedia() {
    try {
        // Проверяем вложения
        const attachments = await query('SELECT id, message_id, file_name, file_type FROM message_attachments');
        console.log('Attachments:', attachments.rows);
        
        // Проверяем, к каким чатам относятся
        const media = await query(`
            SELECT m.chat_id, ma.file_name, ma.file_type
            FROM message_attachments ma
            JOIN messages m ON ma.message_id = m.id
        `);
        console.log('Media by chat:', media.rows);
        
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkMedia();