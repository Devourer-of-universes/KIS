-- =====================================================
-- TEST DATA FOR CORPORATE MESSENGER
-- =====================================================

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
-- Note: Password '123456' hashed with bcrypt
-- You can generate your own hash using: node -e "console.log(require('bcryptjs').hashSync('123456', 10))"
INSERT INTO users (username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, role_id, status) VALUES 
('admin', 'Admin', 'System', 'Admin', '1990-01-01', 1, 1, 'admin@company.ru', '+79000000001', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 1, 'active'),
('ivanov.i', 'Ivanov', 'Ivan', 'Ivanovich', '1990-01-15', 2, 2, 'ivanov@company.ru', '+79001234567', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 2, 'active'),
('petrova.m', 'Petrova', 'Maria', 'Sergeevna', '1992-03-20', 4, 3, 'petrova@company.ru', '+79007654321', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 2, 'active'),
('sidorov.a', 'Sidorov', 'Alexey', 'Vladimirovich', '1988-07-10', 4, 3, 'sidorov@company.ru', '+79005556677', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 2, 'active'),
('kozlova.e', 'Kozlova', 'Elena', 'Vladimirovna', '1985-11-25', 3, 3, 'kozlova@company.ru', '+79008889900', '$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q', 2, 'active')
ON CONFLICT (id) DO NOTHING;

-- 5. Create test private chat between admin and ivanov
INSERT INTO chats (is_group, created_by) VALUES (false, 1)
ON CONFLICT (id) DO NOTHING;

-- Get the chat id (assuming it's 1)
INSERT INTO chat_participants (chat_id, user_id) VALUES 
(1, 1),
(1, 2)
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- 6. Create test group chat "Developers"
INSERT INTO chats (name, is_group, created_by) VALUES ('Developers', true, 3)
ON CONFLICT (id) DO NOTHING;

-- Get the chat id (assuming it's 2)
INSERT INTO chat_participants (chat_id, user_id) VALUES 
(2, 2),
(2, 3),
(2, 4)
ON CONFLICT (chat_id, user_id) DO NOTHING;

-- 7. Test messages
INSERT INTO messages (chat_id, user_id, content, created_at) VALUES 
(1, 1, 'Hello Maria! How are you?', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(1, 2, 'Hi Ivan! All good, working on new project', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(2, 2, 'Good morning everyone!', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(2, 3, 'Good morning!', CURRENT_TIMESTAMP - INTERVAL '2.5 hours'),
(2, 4, 'Hello everyone!', CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;