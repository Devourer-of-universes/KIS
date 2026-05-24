const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// Параметры супер-админа
const SUPER_ADMIN = {
    username: 'admin',
    email: 'admin@company.ru',
    telNum: '+79000000001',
    surname: 'Системный',
    name: 'Администратор',
    patronymic: '',
    password: 'admin123',  // Стандартный пароль
    roleId: 1  // admin
};

// Проверка и создание супер-админа
async function initSuperAdmin() {
    try {
        // Проверяем, существует ли уже пользователь с role_id = 1
        const existingAdmin = await query(
            `SELECT id, username FROM users WHERE role_id = 1 LIMIT 1`
        );
        
        if (existingAdmin.rows.length > 0) {
            console.log('✅ Администратор уже существует:', existingAdmin.rows[0].username);
            console.log('   Если забыли пароль, используйте восстановление');
            return;
        }
        
        console.log('🔧 Создание супер-администратора...');
        
        // 1. Убеждаемся, что роль admin существует
        const roleCheck = await query(`SELECT id FROM roles WHERE id = 1`);
        if (roleCheck.rows.length === 0) {
            await query(
                `INSERT INTO roles (id, name, permissions) VALUES (1, 'admin', '{"all": true}')`
            );
            console.log('   ✅ Роль admin создана');
        }
        
        // 2. Создаём должность (без ON CONFLICT)
        let postId = null;
        const postCheck = await query(`SELECT id FROM posts WHERE name = 'Супер-администратор'`);
        if (postCheck.rows.length === 0) {
            const postResult = await query(
                `INSERT INTO posts (name) VALUES ('Супер-администратор') RETURNING id`
            );
            postId = postResult.rows[0].id;
            console.log('   ✅ Должность создана');
        } else {
            postId = postCheck.rows[0].id;
        }
        
        // 3. Создаём подразделение
        let deptId = null;
        const deptCheck = await query(`SELECT id FROM departments WHERE name = 'Администрирование'`);
        if (deptCheck.rows.length === 0) {
            const deptResult = await query(
                `INSERT INTO departments (name) VALUES ('Администрирование') RETURNING id`
            );
            deptId = deptResult.rows[0].id;
            console.log('   ✅ Подразделение создано');
        } else {
            deptId = deptCheck.rows[0].id;
        }
        
        // 4. Создаём супер-админа
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, salt);
        
        const result = await query(
            `INSERT INTO users (username, surname, name, patronymic, email, tel_num, password_hash, role_id, post_id, department_id, status, is_super_admin)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', true)
            RETURNING id, username, email, role_id, is_super_admin`,
            [SUPER_ADMIN.username, SUPER_ADMIN.surname, SUPER_ADMIN.name, SUPER_ADMIN.patronymic, 
             SUPER_ADMIN.email, SUPER_ADMIN.telNum, passwordHash, SUPER_ADMIN.roleId, postId, deptId]
        );
        
        console.log('\n✅ СУПЕР-АДМИНИСТРАТОР СОЗДАН!');
        console.log('═══════════════════════════════════════════════');
        console.log(`   Логин: ${SUPER_ADMIN.username}`);
        console.log(`   Пароль: ${SUPER_ADMIN.password}`);
        console.log('═══════════════════════════════════════════════');
        console.log('   ⚠️ Пожалуйста, смените пароль при первом входе!\n');
        
    } catch (error) {
        console.error('❌ Ошибка создания супер-администратора:', error.message);
        console.error('Детали:', error);
    }
}

module.exports = { initSuperAdmin };