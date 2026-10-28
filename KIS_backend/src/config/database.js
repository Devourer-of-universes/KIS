const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'corporate_messenger',
    user: process.env.DB_USER || 'messenger_user',
    password: process.env.DB_PASSWORD || 'mes123user',
});

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Database error:', err);
});

// Обычный запрос
const query = (text, params) => pool.query(text, params);

// Транзакция: принимает async-функцию, которая получает client
// Использование:
//   const result = await transaction(async (client) => {
//       await client.query(...);
//       return data;
//   });
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { pool, query, transaction };