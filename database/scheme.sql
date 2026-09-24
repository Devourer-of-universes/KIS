-- =====================================================
-- КОРПОРАТИВНАЯ ИНФОРМАЦИОННАЯ СИСТЕМА
-- Полная схема базы данных
-- Версия: 2.0
-- СУБД: PostgreSQL 13+
-- =====================================================

-- =====================================================
-- 0. РАСШИРЕНИЯ И НАСТРОЙКИ
-- =====================================================

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

-- =====================================================
-- 2. ПОЛЬЗОВАТЕЛИ
-- =====================================================

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
    is_super_admin BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE users IS 'Пользователи системы';
COMMENT ON COLUMN users.status IS 'Статус: active, away, offline, blocked';

-- Индексы для users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id) WHERE deleted_at IS NULL;

-- =====================================================
-- 3. ЧАТЫ И СООБЩЕНИЯ
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

-- Вложения сообщений
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

-- Индексы для чатов
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_last_read ON chat_participants(last_read_at);
CREATE INDEX IF NOT EXISTS idx_chat_folders_user_id ON chat_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_folder_items_folder_id ON chat_folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_chat_folder_items_chat_id ON chat_folder_items(chat_id);

-- =====================================================
-- 4. ЗАДАЧИ
-- =====================================================

-- Задачи
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress INTEGER DEFAULT 0,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    template_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE tasks IS 'Задачи пользователей';
COMMENT ON COLUMN tasks.status IS 'pending, in_progress, completed, cancelled';
COMMENT ON COLUMN tasks.priority IS 'low, medium, high, critical';
COMMENT ON COLUMN tasks.custom_fields IS 'Кастомные поля из шаблона: { "key": { type, value, label } }';

-- Комментарии к задачам
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Шаблоны задач
CREATE TABLE IF NOT EXISTS task_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'custom',
    template_data JSONB NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    is_shared BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE task_templates IS 'Шаблоны задач с кастомными полями';

-- История изменений задач
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Напоминания о задачах
CREATE TABLE IF NOT EXISTS task_reminders (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для задач
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_template_id ON tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_user_id ON task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_department ON task_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_user_id ON task_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_remind_at ON task_reminders(remind_at) WHERE is_sent = false;

-- =====================================================
-- 5. ЗАМЕТКИ
-- =====================================================

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'personal',
    title VARCHAR(200),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE notes IS 'Личные и групповые заметки';

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- 6. СЕССИИ И УВЕДОМЛЕНИЯ
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
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Уведомления (расширенная версия)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) DEFAULT 'system',
    priority VARCHAR(20) DEFAULT 'normal',
    title VARCHAR(255) NOT NULL,
    content TEXT,
    link_url VARCHAR(500),
    link_type VARCHAR(50),
    link_id INTEGER,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    is_global BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notifications IS 'Уведомления пользователей';
COMMENT ON COLUMN notifications.category IS 'admin, task, document, deadline, message, workflow, mention, reminder, system';
COMMENT ON COLUMN notifications.priority IS 'low, normal, high, critical';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_current ON sessions(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);

-- =====================================================
-- 7. КОНТАКТЫ
-- =====================================================

CREATE TABLE IF NOT EXISTS contacts (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- =====================================================
-- 8. WORKFLOW (ПРОЦЕССЫ)
-- =====================================================

-- Шаблоны процессов
CREATE TABLE IF NOT EXISTS workflow_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE workflow_templates IS 'Шаблоны бизнес-процессов';
COMMENT ON COLUMN workflow_templates.steps IS 'JSON массив шагов процесса';

-- Экземпляры процессов
CREATE TABLE IF NOT EXISTS workflow_instances (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES workflow_templates(id) ON DELETE SET NULL,
    started_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    current_step_index INTEGER DEFAULT 0,
    data JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE workflow_instances IS 'Запущенные экземпляры процессов';
COMMENT ON COLUMN workflow_instances.status IS 'active, completed, cancelled';

CREATE INDEX IF NOT EXISTS idx_workflow_templates_created_by ON workflow_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_instances_template ON workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_started_by ON workflow_instances(started_by);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);

-- =====================================================
-- 9. АУДИТ И БЭКАПЫ
-- =====================================================

-- Логи действий
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

-- Резервные копии
CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    size_bytes BIGINT,
    type VARCHAR(20) DEFAULT 'full',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed'
);

CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);

-- =====================================================
-- 10. СИСТЕМНЫЕ НАСТРОЙКИ
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- =====================================================
-- 11. НАСТРОЙКИ УВЕДОМЛЕНИЙ ПОЛЬЗОВАТЕЛЯ
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

-- =====================================================
-- 12. БАЗОВЫЕ ДАННЫЕ
-- =====================================================

-- Роли
INSERT INTO roles (id, name, permissions) VALUES 
(1, 'admin', '{"all": true, "admin_panel": true}'),
(2, 'user', '{"chats": {"create": true}, "tasks": {"create": true}, "contacts": {"add": true}}')
ON CONFLICT (id) DO NOTHING;

-- Системные настройки
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

-- =====================================================
-- 13. СБРОС ПОСЛЕДОВАТЕЛЬНОСТЕЙ
-- =====================================================

SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('system_settings_id_seq', (SELECT MAX(id) FROM system_settings));

-- =====================================================
-- КОНЕЦ СХЕМЫ
-- =====================================================

-- Проверка созданных таблиц
\echo '✅ Схема БД успешно создана!'
\echo ''
\echo 'Созданные таблицы:'
\dt