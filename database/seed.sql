-- =====================================================
-- ТЕСТОВЫЕ ДАННЫЕ ДЛЯ РАЗРАБОТКИ
-- =====================================================

-- Подразделения
INSERT INTO departments (name) VALUES 
('Головной офис'),
('ИТ отдел'),
('Отдел разработки'),
('Отдел тестирования'),
('Отдел продаж')
ON CONFLICT (id) DO NOTHING;

-- Должности
INSERT INTO posts (department_id, name) VALUES 
(1, 'Генеральный директор'),
(2, 'Системный администратор'),
(3, 'Team Lead'),
(3, 'Разработчик'),
(3, 'Frontend разработчик'),
(3, 'Backend разработчик'),
(4, 'QA Инженер'),
(5, 'Менеджер по продажам')
ON CONFLICT (id) DO NOTHING;

-- Тестовые пользователи (пароль: 123456)
INSERT INTO users (username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, role_id, status) VALUES 
('ivanov.i', 'Иванов', 'Иван', 'Иванович', '1990-01-15', 2, 2, 'ivanov@company.ru', '+79001234567', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active'),
('petrova.m', 'Петрова', 'Мария', 'Сергеевна', '1992-03-20', 4, 3, 'petrova@company.ru', '+79007654321', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active'),
('sidorov.a', 'Сидоров', 'Алексей', 'Владимирович', '1988-07-10', 3, 3, 'sidorov@company.ru', '+79005556677', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active'),
('kozlova.e', 'Козлова', 'Елена', 'Владимировна', '1985-11-25', 3, 3, 'kozlova@company.ru', '+79008889900', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active'),
('testuser', 'Тестов', 'Тест', 'Тестович', '1995-05-05', 4, 3, 'test@example.com', '+79009999999', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrLq5x5eE5qK7qXvFwJcZqQqQqQqQq', 2, 'active')
ON CONFLICT (id) DO NOTHING;

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