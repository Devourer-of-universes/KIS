-- =====================================================
-- КОРПОРАТИВНЫЙ МЕССЕНДЖЕР - СХЕМА БАЗЫ ДАННЫХ
-- Версия: 1.0
-- Дата: 26.03.2026
-- =====================================================

-- Включение расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ОРГСТРУКТУРА
-- =====================================================

-- Подразделения
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE departments IS 'Подразделения организации';
COMMENT ON COLUMN departments.parent_department_id IS 'Ссылка на родительское подразделение (для иерархии)';

-- Должности
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE posts IS 'Должности сотрудников';

-- Роли
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE roles IS 'Роли пользователей с правами доступа';

-- Пользователи
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    surname VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    patronymic VARCHAR(50),
    birthday DATE NOT NULL,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    department_id INTEGER NOT NULL REFERENCES departments(id),
    email VARCHAR(100) UNIQUE NOT NULL,
    tel_num VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'inactive', 'blocked'
    role_id INTEGER NOT NULL REFERENCES roles(id),
    avatar_uri VARCHAR(500),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}',
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE users IS 'Пользователи системы';
COMMENT ON COLUMN users.status IS 'Статус: active - активен, inactive - неактивен, blocked - заблокирован';
COMMENT ON COLUMN users.last_seen_at IS 'Время последней активности (для определения онлайн)';

-- Индексы для users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);

-- =====================================================
-- 2. ЧАТЫ И СООБЩЕНИЯ
-- =====================================================

-- Чаты
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    is_group BOOLEAN DEFAULT false,
    avatar_uri VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE chats IS 'Чаты (личные и групповые)';
COMMENT ON COLUMN chats.is_group IS 'true - групповой чат, false - личный диалог';

-- Участники чатов
CREATE TABLE chat_participants (
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_muted BOOLEAN DEFAULT false,
    PRIMARY KEY (chat_id, user_id)
);

COMMENT ON TABLE chat_participants IS 'Участники чатов';
COMMENT ON COLUMN chat_participants.last_read_at IS 'Время последнего прочтения сообщений в этом чате';
COMMENT ON COLUMN chat_participants.is_muted IS 'Отключены ли уведомления для этого чата';

-- Сообщения
CREATE TABLE messages (
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

COMMENT ON TABLE messages IS 'Сообщения в чатах';
COMMENT ON COLUMN messages.is_edited IS 'Было ли отредактировано';
COMMENT ON COLUMN messages.is_deleted IS 'Удалено (soft delete)';

-- Прикрепленные файлы
CREATE TABLE message_attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_uri VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE message_attachments IS 'Файлы, прикрепленные к сообщениям';
COMMENT ON COLUMN message_attachments.file_type IS 'Тип: image, document, video, audio';

-- Индексы для сообщений
CREATE INDEX idx_messages_chat_id ON messages(chat_id) WHERE is_deleted = false;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_last_read ON chat_participants(last_read_at);

-- =====================================================
-- 3. СЕССИИ И УВЕДОМЛЕНИЯ
-- =====================================================

-- Сессии
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    device VARCHAR(100),
    application VARCHAR(100),  -- 'web', 'mobile_android', 'mobile_ios'
    location VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    is_current BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE sessions IS 'Активные сессии пользователей';

-- Уведомления
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- 'message', 'report', 'deleted_message', 'mention'
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notifications IS 'Уведомления пользователей';
COMMENT ON COLUMN notifications.data IS 'Дополнительные данные в JSON (chat_id, message_id, и т.д.)';

-- Индексы
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_is_current ON sessions(is_current) WHERE is_current = true;

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- 4. КОНТАКТЫ
-- =====================================================

CREATE TABLE contacts (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, contact_id)
);

COMMENT ON TABLE contacts IS 'Избранные контакты пользователей';

CREATE INDEX idx_contacts_user_id ON contacts(user_id);

-- =====================================================
-- 5. ТЕСТОВЫЕ ДАННЫЕ
-- =====================================================

-- Вставляем базовые роли
INSERT INTO roles (name, permissions) VALUES 
('admin', '{"all": true}'),
('user', '{"chats": {"create": true, "delete_own_messages": true}, "contacts": {"add": true}}');

-- Вставляем подразделения
INSERT INTO departments (name) VALUES 
('Головной офис'),
('ИТ отдел'),
('Отдел разработки'),
('Отдел тестирования');

-- Вставляем должности
INSERT INTO posts (department_id, name) VALUES 
(2, 'Системный администратор'),
(2, 'Программист'),
(3, 'Team Lead'),
(3, 'Разработчик'),
(4, 'QA Инженер');

-- Хэш пароля для '123456' (bcrypt)
-- Для реального использования сгенерируйте свой хэш через bcrypt
-- Временный хэш для тестирования
INSERT INTO users (username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, role_id, status) VALUES 
('admin', 'Администратор', 'Системный', 'Admin', '1990-01-01', 1, 1, 'admin@company.ru', '+79000000001', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 1, 'active'),
('ivanov.i', 'Иванов', 'Иван', 'Иванович', '1990-01-15', 1, 2, 'ivanov@company.ru', '+79001234567', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active'),
('petrova.m', 'Петрова', 'Мария', 'Сергеевна', '1992-03-20', 4, 3, 'petrova@company.ru', '+79007654321', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active'),
('sidorov.a', 'Сидоров', 'Алексей', 'Владимирович', '1988-07-10', 4, 3, 'sidorov@company.ru', '+79005556677', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active'),
('kozlova.e', 'Козлова', 'Елена', 'Владимировна', '1985-11-25', 3, 3, 'kozlova@company.ru', '+79008889900', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active');

-- Тестовый личный чат
INSERT INTO chats (is_group, created_by) VALUES (false, 1);
INSERT INTO chat_participants (chat_id, user_id) VALUES (1, 1), (1, 2);

-- Тестовая группа "Разработчики"
INSERT INTO chats (name, is_group, created_by) VALUES ('Разработчики', true, 3);
INSERT INTO chat_participants (chat_id, user_id) VALUES (2, 2), (2, 3), (2, 4);

-- Тестовые сообщения
INSERT INTO messages (chat_id, user_id, content, created_at) VALUES 
(1, 1, 'Привет, Мария! Как дела?', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(1, 2, 'Привет, Иван! Всё отлично, работаю над новым проектом', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(2, 2, 'Коллеги, доброе утро!', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(2, 3, 'Доброе утро!', CURRENT_TIMESTAMP - INTERVAL '2.5 hours'),
(2, 4, 'Всем привет!', CURRENT_TIMESTAMP - INTERVAL '2 hours');