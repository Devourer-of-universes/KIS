const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const multer = require('multer');

dotenv.config();

// =====================================================
// 1. СОЗДАЁМ APP И HTTP СЕРВЕР
// =====================================================
const app = express();
const server = http.createServer(app); // ← app уже определён

// =====================================================
// 2. НАСТРОЙКИ CORS
// =====================================================
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400
};

app.use(cors(corsOptions));

// =====================================================
// 3. MIDDLEWARE
// =====================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));
app.use('/html', express.static(path.join(__dirname, '../public/html')));

// =====================================================
// 4. ПОДКЛЮЧЕНИЕ МАРШРУТОВ
// =====================================================
const { query } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const taskRoutes = require('./routes/taskRoutes');
const taskTemplateRoutes = require('./routes/taskTemplateRoutes');
const noteRoutes = require('./routes/noteRoutes');
const counterpartyRoutes = require('./routes/counterpartyRoutes');
const documentTypeRoutes = require('./routes/documentTypeRoutes');
const documentTemplateRoutes = require('./routes/documentTemplateRoutes');
const documentWorkflowRoutes = require('./routes/documentWorkflowRoutes');
const workflowTemplateRoutes = require('./routes/workflowTemplateRoutes');
const documentSignatureRoutes = require('./routes/documentSignatureRoutes');
const documentAccessRoutes = require('./routes/documentAccessRoutes');
const documentRoutes = require('./routes/documentRoutes');

// Проверка статуса
app.get('/api/status', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', taskRoutes);
app.use('/api', taskTemplateRoutes);
app.use('/api', noteRoutes);
app.use('/api', documentTypeRoutes);
app.use('/api', counterpartyRoutes);
app.use('/api', documentTemplateRoutes);
app.use('/api', documentWorkflowRoutes);
app.use('/api', workflowTemplateRoutes);
app.use('/api', documentSignatureRoutes);
app.use('/api', documentAccessRoutes);
app.use('/api', documentRoutes);          // ← добавить

// Статические файлы (uploads)
const uploadsPath = path.join(__dirname, '../uploads');
console.log('Uploads path:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Настройка multer
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
    limits: { fileSize: 10 * 1024 * 1024 }
});
app.locals.upload = upload;

// =====================================================
// 5. LOGGING MIDDLEWARE
// =====================================================
app.use('/api', async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300 && 
            ['POST', 'PUT', 'DELETE'].includes(req.method)) {
            
            const logData = {
                user_id: req.userId || null,
                action: `${req.method} ${req.route?.path || req.path}`,
                entity_type: req.path.split('/')[1],
                old_data: req.body ? JSON.stringify(req.body).substring(0, 500) : null,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            };
            
            const { query } = require('./config/database');
            query(
                `INSERT INTO audit_logs (user_id, action, entity_type, old_data, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [logData.user_id, logData.action, logData.entity_type, logData.old_data, logData.ip_address, logData.user_agent]
            ).catch(err => console.error('Logging error:', err));
        }
        
        originalSend.call(this, data);
    };
    
    next();
});

// =====================================================
// 6. ОБРАБОТЧИКИ ОШИБОК
// =====================================================
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// =====================================================
// 7. WEBSOCKET
// =====================================================
const clients = new Map();

const wss = new WebSocket.Server({ 
    server: server,
    path: '/' 
});

wss.on('connection', async (ws, req) => {
    console.log('🔌 New WebSocket connection');
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
        ws.close(1008, 'Token required');
        return;
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        const userId = decoded.id;
        
        const result = await query(
            `SELECT id, status FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [userId]
        );
        
        if (result.rows.length === 0 || result.rows[0].status === 'blocked') {
            ws.close(1008, 'User not found or blocked');
            return;
        }
        
        ws.userId = userId;
        clients.set(userId, ws);
        
        console.log(`✅ User ${userId} connected via WebSocket`);
        
        ws.send(JSON.stringify({
            type: 'connection-confirmed',
            userId: userId
        }));
        
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                console.log(`📨 Message from ${userId}:`, data);
                await handleWebSocketMessage(ws, userId, data);
            } catch (error) {
                console.error('WebSocket message error:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: error.message
                }));
            }
        });
        
        ws.on('close', () => {
            console.log(`🔌 User ${userId} disconnected`);
            clients.delete(userId);
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
    } catch (error) {
        console.error('WebSocket auth error:', error);
        ws.close(1008, 'Authentication failed');
    }
});

// Обработка WebSocket сообщений
async function handleWebSocketMessage(ws, userId, data) {
    switch (data.type) {
        case 'send-message': {
            const result = await query(
                `INSERT INTO messages (chat_id, user_id, content) 
                 VALUES ($1, $2, $3) 
                 RETURNING id, chat_id, user_id, content, created_at`,
                [data.chatId, userId, data.content]
            );
            
            const message = result.rows[0];
            
            const userResult = await query(
                `SELECT surname, name, avatar_uri FROM users WHERE id = $1`,
                [userId]
            );
            
            const messageData = {
                ...message,
                surname: userResult.rows[0].surname,
                name: userResult.rows[0].name,
                avatar_uri: userResult.rows[0].avatar_uri
            };
            
            await query(
                `UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [data.chatId]
            );
            
            const participants = await query(
                `SELECT user_id FROM chat_participants WHERE chat_id = $1`,
                [data.chatId]
            );
            
            for (const p of participants.rows) {
                const client = clients.get(p.user_id);
                if (client && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'new-message',
                        message: messageData
                    }));
                }
            }
            break;
        }
            
        case 'typing': {
            const typingParticipants = await query(
                `SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id != $2`,
                [data.chatId, userId]
            );
            
            for (const p of typingParticipants.rows) {
                const client = clients.get(p.user_id);
                if (client && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'user-typing',
                        userId: userId,
                        isTyping: data.isTyping
                    }));
                }
            }
            break;
        }
            
        case 'join-chats':
            ws.send(JSON.stringify({
                type: 'joined-chats',
                chatIds: data.chatIds
            }));
            break;
            
        default:
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type'
            }));
    }
}

function sendToUser(userId, data) {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
        return true;
    }
    return false;
}

// =====================================================
// 8. ЗАПУСК СЕРВЕРА
// =====================================================
const { initSuperAdmin } = require('./utils/initAdmin');
const { startBackupScheduler } = require('./utils/backupScheduler');

(async () => {
    await initSuperAdmin();
    startBackupScheduler();
})();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0',() => {
    console.log(`
    ╔════════════════════════════════════════════════════════════════╗
    ║                    🚀 CORPORATE MESSENGER                      ║
    ╠════════════════════════════════════════════════════════════════╣
    ║  HTTP Server:  http://localhost:${PORT}                        ║
    ║  WebSocket:    ws://localhost:${PORT}                          ║
    ║  Environment:  ${process.env.NODE_ENV || 'development'}        ║
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

// =====================================================
// 9. ЭКСПОРТ
// =====================================================
module.exports = { app, server, wss, sendToUser };