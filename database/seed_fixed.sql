-- =====================================================
-- FIXED TEST DATA FOR CORPORATE MESSENGER
-- =====================================================

BEGIN;

-- 1. Insert basic roles
INSERT INTO roles (name, permissions) VALUES 
('admin', '{"all": true}'),
('user', '{"chats": {"create": true, "delete_own_messages": true}, "contacts": {"add": true}}')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert departments
INSERT INTO departments (name) VALUES 
('Head Office'),
('IT Department'),
('Development Department'),
('Testing Department')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert positions
INSERT INTO posts (department_id, name) VALUES 
(1, 'System Administrator'),
(2, 'Programmer'),
(3, 'Team Lead'),
(3, 'Developer'),
(4, 'QA Engineer')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert users
-- Password: '123456' (bcrypt hash)
INSERT INTO users (username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, role_id, status) VALUES 
('admin', 'Admin', 'System', 'Admin', '1990-01-01', 1, 1, 'admin@company.ru', '+79000000001', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 1, 'active'),
('ivanov.i', 'Ivanov', 'Ivan', 'Ivanovich', '1990-01-15', 2, 2, 'ivanov@company.ru', '+79001234567', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 2, 'active'),
('petrova.m', 'Petrova', 'Maria', 'Sergeevna', '1992-03-20', 4, 3, 'petrova@company.ru', '+79007654321', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 2, 'active'),
('sidorov.a', 'Sidorov', 'Alexey', 'Vladimirovich', '1988-07-10', 4, 3, 'sidorov@company.ru', '+79005556677', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 2, 'active'),
('kozlova.e', 'Kozlova', 'Elena', 'Vladimirovna', '1985-11-25', 3, 3, 'kozlova@company.ru', '+79008889900', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 2, 'active')
ON CONFLICT (id) DO NOTHING;

-- 5. Create test private chat between admin and ivanov
-- Используем RETURNING, чтобы получить ID чата
WITH new_chat AS (
    INSERT INTO chats (is_group, created_by) 
    VALUES (false, 1)
    RETURNING id
)
-- Добавляем участников, используя полученный ID
INSERT INTO chat_participants (chat_id, user_id)
SELECT id, user_id
FROM new_chat
CROSS JOIN (VALUES (1), (2)) AS users(user_id);

-- 6. Create test group chat "Developers"
WITH new_group AS (
    INSERT INTO chats (name, is_group, created_by) 
    VALUES ('Developers', true, 3)
    RETURNING id
)
-- Добавляем участников
INSERT INTO chat_participants (chat_id, user_id)
SELECT id, user_id
FROM new_group
CROSS JOIN (VALUES (2), (3), (4)) AS users(user_id);

-- 7. Теперь добавим сообщения, зная ID чатов (1 и 2)
-- Но чтобы быть уверенными, сначала получим реальные ID чатов
DO $$
DECLARE
    private_chat_id INTEGER;
    group_chat_id INTEGER;
BEGIN
    -- Получаем ID личного чата (между admin и ivanov)
    SELECT c.id INTO private_chat_id
    FROM chats c
    JOIN chat_participants cp ON cp.chat_id = c.id
    WHERE c.is_group = false
    GROUP BY c.id
    HAVING COUNT(DISTINCT cp.user_id) = 2
    LIMIT 1;
    
    -- Получаем ID группового чата
    SELECT id INTO group_chat_id
    FROM chats
    WHERE name = 'Developers'
    LIMIT 1;
    
    -- Вставляем сообщения в личный чат
    INSERT INTO messages (chat_id, user_id, content, created_at) VALUES 
    (private_chat_id, 1, 'Hello Maria! How are you?', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    (private_chat_id, 2, 'Hi Ivan! All good, working on new project', CURRENT_TIMESTAMP - INTERVAL '1 hour');
    
    -- Вставляем сообщения в групповой чат
    INSERT INTO messages (chat_id, user_id, content, created_at) VALUES 
    (group_chat_id, 2, 'Good morning everyone!', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    (group_chat_id, 3, 'Good morning!', CURRENT_TIMESTAMP - INTERVAL '2.5 hours'),
    (group_chat_id, 4, 'Hello everyone!', CURRENT_TIMESTAMP - INTERVAL '2 hours');
    
    RAISE NOTICE 'Private chat ID: %, Group chat ID: %', private_chat_id, group_chat_id;
END $$;

COMMIT;

-- Проверка результатов
SELECT '=== USERS ===' as info;
SELECT id, username, surname, name, email FROM users;

SELECT '=== CHATS ===' as info;
SELECT id, name, is_group, created_by FROM chats;

SELECT '=== CHAT PARTICIPANTS ===' as info;
SELECT chat_id, user_id FROM chat_participants ORDER BY chat_id, user_id;

SELECT '=== MESSAGES ===' as info;
SELECT id, chat_id, user_id, content, created_at FROM messages ORDER BY chat_id, created_at;