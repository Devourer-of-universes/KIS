-- =====================================================
-- КОРПОРАТИВНЫЙ МЕССЕНДЖЕР - ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ
-- Версия: 2.0
-- Дата: 2025
-- =====================================================

-- Включение расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ОРГСТРУКТУРА
-- =====================================================

-- Подразделения
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    manager_id INTEGER,
    code VARCHAR(50),
    manager_position VARCHAR(100),
    description TEXT,
    email VARCHAR(100),
    phone VARCHAR(20),
    location VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE departments IS 'Подразделения организации';

-- Должности
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE posts IS 'Должности сотрудников';

-- Роли
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE roles IS 'Роли пользователей с правами доступа';

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    surname VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    patronymic VARCHAR(50),
    birthday DATE,
    post_id INTEGER REFERENCES posts(id),
    department_id INTEGER REFERENCES departments(id),
    email VARCHAR(100) UNIQUE NOT NULL,
    tel_num VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    role_id INTEGER NOT NULL REFERENCES roles(id),
    avatar_uri VARCHAR(500),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}',
    start_date DATE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE users IS 'Пользователи системы';
COMMENT ON COLUMN users.status IS 'Статус: active - активен, away - отошел, offline - не в сети, blocked - заблокирован';

-- Индексы для users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);

-- =====================================================
-- 2. ЧАТЫ И СООБЩЕНИЯ
-- =====================================================

-- Чаты
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    is_group BOOLEAN DEFAULT false,
    avatar_uri VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Участники чатов
CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_muted BOOLEAN DEFAULT false,
    PRIMARY KEY (chat_id, user_id)
);

-- Сообщения
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Прикрепленные файлы
CREATE TABLE IF NOT EXISTS message_attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_uri VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для сообщений
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_last_read ON chat_participants(last_read_at);

-- =====================================================
-- 3. ПАПКИ ЧАТОВ
-- =====================================================

-- Папки чатов
CREATE TABLE IF NOT EXISTS chat_folders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Связь чатов с папками
CREATE TABLE IF NOT EXISTS chat_folder_items (
    folder_id INTEGER NOT NULL REFERENCES chat_folders(id) ON DELETE CASCADE,
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (folder_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_folders_user_id ON chat_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_folder_items_folder_id ON chat_folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_chat_folder_items_chat_id ON chat_folder_items(chat_id);

-- =====================================================
-- 4. СЕССИИ И УВЕДОМЛЕНИЯ
-- =====================================================

-- Сессии
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    device VARCHAR(100),
    application VARCHAR(100),
    location VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    is_current BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Уведомления
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_current ON sessions(is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- 5. КОНТАКТЫ
-- =====================================================

CREATE TABLE IF NOT EXISTS contacts (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- =====================================================
-- 6. АУДИТ И БЭКАПЫ
-- =====================================================

-- Таблица аудита действий
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Таблица бэкапов
CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    size_bytes BIGINT,
    type VARCHAR(20) DEFAULT 'full',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed'
);

CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);

-- =====================================================
-- 7. СИСТЕМНЫЕ НАСТРОЙКИ
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- =====================================================
-- 8. ТЕСТОВЫЕ ДАННЫЕ
-- =====================================================

-- Базовые роли (пароль для admin и user: 123456)
INSERT INTO roles (id, name, permissions) VALUES 
(1, 'admin', '{"all": true}'),
(2, 'user', '{"chats": {"create": true, "delete_own_messages": true}, "contacts": {"add": true}}')
ON CONFLICT (id) DO NOTHING;

-- Базовые настройки
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('org_name', 'ООО "ТехноПрогресс"', 'string', 'Название организации'),
('org_email', 'info@company.ru', 'string', 'Контактный email'),
('org_phone', '+7 (495) 000-00-00', 'string', 'Контактный телефон'),
('auto_numbering', 'auto', 'string', 'Автонумерация документов'),
('session_timeout', '8', 'number', 'Время жизни сессии в часах'),
('password_min_length', '6', 'number', 'Минимальная длина пароля'),
('password_require_special', 'false', 'boolean', 'Требовать спецсимволы'),
('enable_2fa', 'false', 'boolean', 'Двухфакторная аутентификация'),
('notify_email', 'admin@company.ru', 'string', 'Email для уведомлений'),
('auto_archive_days', '365', 'number', 'Автоархивация документов'),
('max_file_size', '50', 'number', 'Максимальный размер файла (МБ)'),
('storage_path', './uploads', 'string', 'Путь к хранилищу'),
('backup_schedule', 'daily', 'string', 'Расписание бэкапов'),
('backup_time', '02:00', 'string', 'Время бэкапа'),
('backup_retention_days', '30', 'number', 'Хранение бэкапов'),
('log_level', 'info', 'string', 'Уровень логирования'),
('log_retention_days', '90', 'number', 'Хранение логов'),
('notify_critical_errors', 'true', 'boolean', 'Уведомления об ошибках'),
('notify_suspicious', 'true', 'boolean', 'Уведомления о подозрительной активности')
ON CONFLICT (setting_key) DO NOTHING;

-- Тестовый пользователь (пароль: 123456)
INSERT INTO users (id, username, surname, name, patronymic, email, tel_num, password_hash, role_id, status) VALUES 
(1, 'admin', 'Администратор', 'Системный', NULL, 'admin@company.ru', '+79000000001', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 1, 'active')
ON CONFLICT (id) DO NOTHING;

-- Сброс последовательностей
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('system_settings_id_seq', (SELECT MAX(id) FROM system_settings));