-- Создаем базу данных
DROP DATABASE IF EXISTS corporate_messenger;
CREATE DATABASE corporate_messenger;

-- Создаем пользователя (если существует - удаляем)
DROP USER IF EXISTS messenger_user;
CREATE USER messenger_user WITH PASSWORD 'mes123user';

-- Даем права
GRANT ALL PRIVILEGES ON DATABASE corporate_messenger TO messenger_user;

-- Подключаемся к новой базе
\c corporate_messenger;

-- Даем права на схему
GRANT ALL ON SCHEMA public TO messenger_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO messenger_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO messenger_user;