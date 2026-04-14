const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const http = require('http');

dotenv.config();

const app = express();

// ⚠️ ВАЖНО: Эти middleware должны быть ПЕРВЫМИ и ПРАВИЛЬНО подключены
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
// Статические файлы (фронтенд)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/html', express.static(path.join(__dirname, '../public/html')));
// Подключаем маршруты ПОСЛЕ middleware
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Проверка статуса
app.get('/api/status', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Подключаем маршруты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
const uploadsPath = path.join(__dirname, '../uploads');
console.log('Uploads path:', uploadsPath); // Для проверки
app.use('/uploads', express.static(uploadsPath));
// 404 обработчик
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

const multer = require('multer');

// Настройка multer для сохранения файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/chat-files'));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Делаем upload доступным в routes
app.locals.upload = upload;
// =====================================================
// ЗАПУСК СЕРВЕРА
// =====================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════════════════════════╗
    ║                    🚀 CORPORATE MESSENGER                      ║
    ╠════════════════════════════════════════════════════════════════╣
    ║  HTTP Server:  http://localhost:${PORT}                        ║
    ║  WebSocket:    ws://localhost:${PORT}                          ║
    ║  Environment:  ${process.env.NODE_ENV || 'development'}                        ║
    ╠════════════════════════════════════════════════════════════════╣
    ║  API Endpoints:                                                ║
    ║  POST   /api/auth/register    - Registration                   ║
    ║  POST   /api/auth/login       - Login                          ║
    ║  POST   /api/auth/logout      - Logout                         ║
    ║  GET    /api/auth/me          - Current user                   ║
    ║  GET    /api/users            - Users list                     ║
    ║  GET    /api/chats            - Chats list                     ║
    ║  POST   /api/chats            - Create chat                    ║
    ║  GET    /api/chats/:id/messages - Chat messages                ║
    ║  POST   /api/chats/:chatId/messages - Send message             ║
    ╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;