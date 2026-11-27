// Управление чатами на фронтенде
class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.currentFolderId = 'all';
        this.chats = [];
        this.messages = [];
        this.files = [];      // Добавляем
        this.images = [];     // Добавляем
        this.ws = null;
        this.init();
        this.editingMessageId = null;
        this.editingOriginalContent = '';
        this.pendingAttachments = [];
        this.chatSettings = null;
        this.chatSettingsInitial = null;
        this.chatSettingsPending = this.emptyChatSettingsPending();
        this.chatSettingsUsers = [];
        this.chatSettingsView = 'main';
        this.chatSearchQuery = '';
        this.searchMatches = new Map();

    }
    
    async init() {
        await this.loadCurrentUser();
        this.resetChatView();
        await this.loadFolders();
        await this.loadChats();
        this.initEventListeners();
        this.initWebSocket();
    }
    
    // Загрузка списка чатов
    async loadChats() {
        try {
            const result = await api.chats.getAll();
            this.chats = result.chats || [];
            this.renderChatList();
        } catch (error) {
            console.error('Failed to load chats:', error);
        }
    }
    
    // Загрузка сообщений чата
    async loadMessages(chatId) {
        console.log('Loading messages for chat:', chatId);
        
        try {
            const token = localStorage.getItem('token');
            const timestamp = Date.now();
            
            const response = await fetch(`/api/chats/${chatId}/messages?limit=50&offset=0&_=${timestamp}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) throw new Error(`Failed to load messages: ${response.status}`);
            
            const data = await response.json();
            console.log('Messages received:', data.messages?.length || 0);
            
            this.messages = data.messages || [];
            this.currentChatId = chatId;
            
            // ВЫЗЫВАЕМ ОТРИСОВКУ
            this.renderMessages();
            
            // УБИРАЕМ this.loadChats() ОТСЮДА
            // this.loadChats();  // ← ЗАКОММЕНТИРОВАТЬ ИЛИ УДАЛИТЬ
            
            this.markAsRead(chatId);
            
        } catch (error) {
            console.error('Failed to load messages:', error);
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">❌ Ошибка загрузки сообщений</div>';
            }
        }
    }
    
    // Отправка сообщения
    async sendMessage(chatId, content) {
        if (!content.trim()) return;
        
        const messageText = content.trim();
        
        // Оптимистично добавляем сообщение в UI
        const tempMessage = {
            id: 'temp_' + Date.now(),
            chat_id: chatId,
            user_id: window.currentUser?.id,
            content: messageText,
            created_at: new Date().toISOString(),
            surname: window.currentUser?.surname,
            name: window.currentUser?.name,
            avatar_uri: window.currentUser?.avatar_uri,
            is_temp: true
        };
        this.messages.push(tempMessage);
        this.renderMessages();
        this.scrollToBottom();
        
        try {
            // Отправляем через WebSocket (мгновенно)
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'send-message',
                    chatId: chatId,
                    content: messageText
                }));
                
                // Убираем временное сообщение через 300мс (когда придет new-message от сервера)
                setTimeout( () => {
                    this.messages = this.messages.filter(m => !m.is_temp);
                    this.renderMessages();
                }, 300);
                
            } else {
                // Fallback через REST, если WebSocket не подключен
                const result = await api.chats.sendMessage(chatId, messageText);
                if (result.success) {
                    this.messages = this.messages.filter(m => !m.is_temp);
                    await this.loadMessages(chatId);
                    await this.loadChats();
                }
            }
        } catch (error) {
            console.error('Send message error:', error);
            showToast('Ошибка отправки', 'error');
            this.messages = this.messages.filter(m => !m.is_temp);
            this.renderMessages();
        }
    }
    
    // Создание чата
    async createChat(userIds, name = null, isGroup = false) {
        try {
            const result = await api.chats.create(userIds, name, isGroup);
            if (result.success) {
                await this.loadChats();
                return result.chatId;
            }
        } catch (error) {
            console.error('Failed to create chat:', error);
        }
    }
    
    // WebSocket соединение
    initWebSocket() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('❌ No token, WebSocket not initialized');
            return;
        }
        
        // Определяем URL WebSocket
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host || 'localhost:3000';
        const wsUrl = `${wsProtocol}//${wsHost}?token=${token}`;
        
        console.log('🔌 Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));
        
        try {
            this.ws = new WebSocket(wsUrl);
        } catch (error) {
            console.error('❌ WebSocket constructor error:', error);
            return;
        }
        
        this.ws.onopen = () => {
            console.log('✅ WebSocket connected');
            
            // Отправляем событие подключения
            this.ws.send(JSON.stringify({
                type: 'connection',
                userId: window.currentUser?.id
            }));
            
            // Присоединяемся к чатам
            this.joinChats();
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 WebSocket message:', data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
        
        this.ws.onclose = (event) => {
            console.log('🔌 WebSocket disconnected, code:', event.code, 'reason:', event.reason);
            // Попытка переподключения через 3 секунды
            setTimeout(() => {
                if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                    console.log('🔄 Reconnecting WebSocket...');
                    this.initWebSocket();
                }
            }, 3000);
        };
    }

    // Присоединение к чатам после загрузки
    async joinChats() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const chatIds = this.chats.map(c => c.id);
            if (chatIds.length > 0) {
                this.ws.send(JSON.stringify({
                    type: 'join-chats',
                    chatIds: chatIds
                }));
                console.log('📡 Joined chats:', chatIds);
            }
        }
    }
    
    handleWebSocketMessage(data) {
        console.log('📨 WebSocket message received:', data);
        
        switch (data.type) {
            case 'new-message':
                if (data.message) {
                    const msg = data.message;

                    // Обновляем последнее сообщение в объекте чата — список перерисуется без перезагрузки
                    const chat = this.chats.find(c => c.id === msg.chat_id);
                    if (chat) {
                        chat.last_message = msg;
                        chat.last_message_at = msg.created_at;
                    }

                    if (msg.chat_id === this.currentChatId) {
                        const exists = this.messages.some(m => m.id === msg.id);
                        if (!exists) {
                            this.messages.push(msg);
                            this.renderMessages();
                            this.scrollToBottom();
                        }

                        // Если это НЕ наше собственное сообщение — сразу помечаем как прочитанное
                        if (msg.user_id !== window.currentUser?.id) {
                            this.markAsRead(msg.chat_id);
                        }
                    } else if (chat && msg.user_id !== window.currentUser?.id) {
                        // Сообщение в другом чате — увеличиваем счётчик непрочитанных
                        chat.unread_count = Number(chat.unread_count || 0) + 1;
                    }

                    // Перерисовываем список: последнее сообщение и счётчики обновятся сразу
                    this.renderChatList();
                }
                break;

            case 'message-edited':
                if (data.messageId) {
                    const msg = this.messages.find(m => m.id === data.messageId);
                    if (msg) {
                        msg.content = data.content;
                        msg.is_edited = true;
                        this.renderMessages();
                    }
                    // Обновляем список чатов
                    this.loadChats();
                }
                break;
                
            case 'message-deleted':
                if (data.messageId) {
                    const msg = this.messages.find(m => m.id === data.messageId);
                    if (msg) {
                        msg.content = '[Сообщение удалено]';
                        msg.is_deleted = true;
                        this.renderMessages();
                    }
                    this.loadChats();
                }
                break;
                
            case 'message-read':
                // Обновляем счётчик непрочитанных
                if (data.chatId) {
                    const chat = this.chats.find(c => c.id === data.chatId);
                    if (chat) {
                        chat.unread_count = 0;
                        this.renderChatList();
                    }
                }
                break;
                
            case 'user-status-change':
                this.updateUserStatus(data.userId, data.isOnline);
                break;
                
            case 'user-typing':
                this.showTypingIndicator(data.userId, data.userName, data.isTyping);
                break;
                
            case 'connection-confirmed':
                console.log('✅ WebSocket connection confirmed for user:', data.userId);
                break;
            case 'joined-chats':
                console.log('✅ Joined chats:', data.chatIds);
                break;    
            case 'error':
                console.error('WebSocket error from server:', data.message);
                break;
                
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }
        // Обновление статуса пользователя в UI
    updateUserStatus(userId, isOnline) {
        // Обновляем в списке участников (правая панель)
        const userItems = document.querySelectorAll(`.user-item[data-user-id="${userId}"]`);
        userItems.forEach(item => {
            item.classList.toggle('online', isOnline);
            item.classList.toggle('offline', !isOnline);
        });
        
        // Если это личный чат с этим пользователем — обновляем статус в шапке
        const currentChat = this.chats.find(c => c.id === this.currentChatId);
        if (currentChat && !currentChat.is_group) {
            const otherUser = currentChat.participants?.find(p => p.id === userId);
            if (otherUser) {
                const statusEl = document.querySelector('.chat-status');
                if (statusEl) {
                    statusEl.textContent = isOnline ? 'В сети' : 'Не в сети';
                    statusEl.style.color = isOnline ? '#10b981' : '#999';
                }
            }
        }
    }

    // Индикатор «Печатает...»
    showTypingIndicator(userId, userName, isTyping) {
        if (userId === window.currentUser?.id) return;
        
        // Ищем контейнер, в который будем вставлять индикатор (подвал чата)
        const chatInputSection = document.querySelector('.chat-input-section');
        if (!chatInputSection) return;
        
        let indicator = document.getElementById('typingIndicator');
        
        if (isTyping) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'typingIndicator';
                indicator.className = 'typing-indicator';
                // Вставляем ПЕРЕД полем ввода (в самое начало секции ввода)
                chatInputSection.insertBefore(indicator, chatInputSection.firstChild);
            }
            
            indicator.innerHTML = `
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
                <span class="typing-text">${escapeHtml(userName || 'Кто-то')} печатает...</span>
            `;
            
            clearTimeout(this._typingTimeout);
            this._typingTimeout = setTimeout(() => {
                const ind = document.getElementById('typingIndicator');
                if (ind) ind.remove();
            }, 3000);
            
        } else {
            if (indicator) indicator.remove();
        }
    }
    // Обновление списка чатов при новом сообщении
    async updateChatListOnNewMessage(message) {
        // Перезагружаем список чатов, чтобы обновить последнее сообщение и счётчик
        await this.loadChats();
        
        // Если текущий чат — помечаем как прочитанное
        if (message.chat_id === this.currentChatId) {
            this.markAsRead(this.currentChatId);
        }
    }

    // Прокрутка вниз
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 50);
        }
    }
    
    // Отрисовка списка чатов
    renderChatList() {
        const chatListContainer = document.querySelector('.chat-list-elements');
        if (!chatListContainer) return;
        this.updateSearchCount();
        
        if (this.chats.length === 0) {
            chatListContainer.innerHTML = '<div class="empty-chats">У вас пока нет чатов</div>';
            return;
        }

        const visibleChats = this.chatSearchQuery
            ? this.chats.filter(chat => this.searchMatches.has(chat.id))
            : this.chats;
        if (visibleChats.length === 0) {
            chatListContainer.innerHTML = `<div class="empty-chats">Ничего не найдено по запросу «${this.escapeHtml(this.chatSearchQuery)}»</div>`;
            return;
        }
        
        chatListContainer.innerHTML = visibleChats.map(chat => {
            // Для личного чата - берем имя собеседника
            let avatarHtml;
            let displayName = chat.name || 'Чат';
            // Проверка на "Избранное" (один участник - сам пользователь)
            const participants = chat.participants || [];
            const isSaved = !chat.is_group && participants.length === 1 && participants[0].id === window.currentUser?.id;
            
            if (isSaved) {
                avatarHtml = `
                    <img src="../materials/icons8-избранное-96.png" 
                         alt="Избранное" 
                         style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--c_acc);color:white;font-size:24px;\'>📌</div>';">
                `;
                displayName = 'Избранное';
            } else if (chat.is_group) {
                avatarHtml = this.getGroupAvatar(chat);
            } else {
                const otherUser = participants.find(p => p.id !== window.currentUser?.id);
                if (otherUser) {
                    avatarHtml = this.getAvatar(otherUser.avatar_uri, otherUser.name, otherUser.surname);
                    displayName = `${otherUser.surname} ${otherUser.name}`;
                } else {
                    avatarHtml = this.getAvatar(chat.avatar_uri, displayName);
                }
            }
            if (chat.is_group) {
                // Групповой чат
                avatarHtml = this.getGroupAvatar(chat);
            } else {
                // Личный чат - аватар пользователя
                const otherUser = chat.participants?.find(p => p.id !== window.currentUser?.id);
                if (otherUser) {
                    avatarHtml = this.getAvatar(otherUser.avatar_uri, otherUser.name, otherUser.surname);
                    displayName = `${otherUser.surname} ${otherUser.name}`;
                } else {
                    avatarHtml = this.getAvatar(chat.avatar_uri, displayName);
                }
            }
            
            return `
                        <div class="chat-list-element${chat.id === this.currentChatId ? ' active' : ''}" 
                            data-chat-id="${chat.id}" 
                            data-name="${this.escapeHtml(displayName)}"
                            data-search-message-id="${this.chatSearchQuery ? (this.searchMatches.get(chat.id)?.id || '') : ''}"
                            onclick="chatManager.openChat(${chat.id}, this.dataset.name, this.dataset.searchMessageId)"
                            oncontextmenu="chatManager.showChatContextMenu(event, ${chat.id}, this.dataset.name)">
                            <div class="chat-list-element-icon">
                                ${avatarHtml}
                            </div>
                            <div class="chat-list-element-info">
                                <div class="chat-list-element-header">${this.highlightMatch(displayName, this.chatSearchQuery)}</div>
                                <div class="chat-list-element-lasttxt">${this.highlightMatch(this.searchMatches.get(chat.id)?.text || this.getLastMessageText(chat.last_message), this.chatSearchQuery)}</div>
                            </div>
                            ${chat.unread_count > 0 ? `<div class="chat-list-element-notifications">${chat.unread_count}</div>` : ''}
                        </div>
                    `;
                }).join('');
    }
    getLastMessageText(message) {
        if (!message) return 'Нет сообщений';
        if (message.attachments?.length) return '📎 Файл';
        if (message.content && message.content.startsWith('📷')) return '📷 Фото';
        if (message.content && message.content.startsWith('📎')) return '📎 Файл';
        if (message.content && (message.content.startsWith('[FORWARDED_FROM:') || message.content.startsWith('↪️ Переслано от:'))) {
            try {
                let data;
                if (message.content.startsWith('↪️ Переслано от:')) {
                    const lines = message.content.split('\n');
                    data = {
                        from: lines[0].replace('↪️ Переслано от:', '').trim(),
                        text: lines.slice(1).join('\n').trim()
                    };
                } else {
                    data = JSON.parse(message.content.substring(16, message.content.length - 1));
                }
                const from = data.from || 'неизвестного';
                const text = (data.text || '').trim();
                const preview = text && !text.startsWith('📷') && !text.startsWith('📎')
                    ? `: ${text.substring(0, 30)}`
                    : '';
                return `Переслано от: ${from}${preview}`;
            } catch (e) {
                return 'Пересланное сообщение';
            }
        }
        return String(message.content || '').substring(0, 40);
    }
    formatLastMessage(message) {
        return this.escapeHtml(this.getLastMessageText(message));
    }

    updateSearchCount() {
        const el = document.getElementById('chatSearchCount');
        if (!el) return;
        if (!this.chatSearchQuery) {
            el.textContent = '';
            el.classList.remove('visible');
            return;
        }
        el.textContent = `Найдено: ${this.searchMatches.size}`;
        el.classList.add('visible');
    }

    parseForwardedContent(content) {
        if (!content) return null;
        if (content.startsWith('[FORWARDED_FROM:')) {
            try {
                return JSON.parse(content.substring(16, content.length - 1));
            } catch (e) {
                return null;
            }
        }
        if (content.startsWith('↪️ Переслано от:')) {
            const lines = content.split('\n');
            return {
                from: lines[0].replace('↪️ Переслано от:', '').trim(),
                text: lines.slice(1).join('\n').trim()
            };
        }
        return null;
    }

    highlightMatch(text, query) {
        const source = String(text || '');
        const q = String(query || '');
        if (!q) return this.escapeHtml(source);
        const lowerSource = source.toLocaleLowerCase('ru');
        const lowerQ = q.toLocaleLowerCase('ru');
        let out = '';
        let from = 0;
        let idx;
        while ((idx = lowerSource.indexOf(lowerQ, from)) !== -1) {
            out += this.escapeHtml(source.slice(from, idx));
            out += `<mark class="search-highlight">${this.escapeHtml(source.slice(idx, idx + q.length))}</mark>`;
            from = idx + q.length;
        }
        out += this.escapeHtml(source.slice(from));
        return out;
    }

    messageSearchText(message) {
        const forwarded = this.parseForwardedContent(message.content);
        return [
            message.content,
            forwarded && forwarded.text,
            forwarded && forwarded.from,
            message.name,
            message.surname
        ].filter(Boolean).join(' ');
    }

    getMessageSnippet(message) {
        if (this.parseForwardedContent(message.content)) {
            return this.getLastMessageText({ content: message.content });
        }
        const content = String(message.content || '');
        if (content.startsWith('📎')) return `${content.split('\n')[0]} — файл`;
        if (content.startsWith('📷')) return '📷 Фото';
        return content;
    }

    async searchChats(query) {
        const q = String(query || '').trim();
        this.chatSearchQuery = q;
        this.searchMatches = new Map();
        if (!q) {
            this.renderChatList();
            return;
        }

        const lowerQ = q.toLocaleLowerCase('ru');
        for (const chat of this.chats) {
            const haystack = [
                chat.name,
                this.getLastMessageText(chat.last_message),
                ...(chat.participants || []).flatMap(p => [p.surname, p.name, p.username])
            ].filter(Boolean).join(' ').toLocaleLowerCase('ru');
            if (haystack.includes(lowerQ)) {
                this.searchMatches.set(chat.id, { text: null, id: null });
            }
        }
        this.renderChatList();

        try {
            const token = localStorage.getItem('token');
            await Promise.all(this.chats.map(async chat => {
                const response = await fetch(`/api/chats/${chat.id}/messages?limit=500&offset=0`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) return;
                const data = await response.json();
                for (const msg of data.messages || []) {
                    if (this.messageSearchText(msg).toLocaleLowerCase('ru').includes(lowerQ)) {
                        this.searchMatches.set(chat.id, { text: this.getMessageSnippet(msg).substring(0, 80), id: msg.id });
                        break;
                    }
                }
            }));
            this.renderChatList();
        } catch (error) {
            console.error('Search failed:', error);
        }
    }
    downloadFile(url, fileName) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    // Отрисовка сообщений
    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        if (!this.messages || this.messages.length === 0) {
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Нет сообщений<br>Напишите что-нибудь...</div>';
            return;
        }
        
        const currentUserId = window.currentUser?.id;
        let lastDate = null;
        let html = '';
        
        for (let i = 0; i < this.messages.length; i++) {
            const msg = this.messages[i];
            const msgDate = new Date(msg.created_at);
            const currentDate = msgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            
            // Проверяем, нужно ли добавить разделитель даты
            if (lastDate !== currentDate) {
                html += `
                    <div class="date-divider">
                        <span class="date-divider-text">${this.formatDateDivider(msgDate)}</span>
                    </div>
                `;
                lastDate = currentDate;
            }
            
            const isOwn = msg.user_id === currentUserId;
            
            // Проверяем тип сообщения
            const isImage = msg.content && msg.content.startsWith('📷');
            const isFile = msg.content && msg.content.startsWith('📎');
            
                        let contentHtml = '';
            
            // Проверяем, не пересланное ли это сообщение (новый формат или старый текст с эмодзи)
            const legacyForward = msg.content && msg.content.startsWith('↪️ Переслано от:');
            if ((msg.content && msg.content.startsWith('[FORWARDED_FROM:')) || legacyForward) {
                try {
                    let forwardData;
                    if (legacyForward) {
                        const lines = msg.content.split('\n');
                        forwardData = {
                            from: lines[0].replace('↪️ Переслано от:', '').trim(),
                            text: lines.slice(1).join('\n').trim()
                        };
                    } else {
                        // Извлекаем JSON
                        const jsonStr = msg.content.substring(16, msg.content.length - 1); // 16 = длина '[FORWARDED_FROM:'
                        forwardData = JSON.parse(jsonStr);
                    }
                    
                    // Рендерим оригинальный контент (текст или картинку)
                    let originalHtml = '';
                    const origText = forwardData.text || '';
                    
                    if (origText.startsWith('📷')) {
                        const imageUrl = origText.split('\n')[1];
                        if (imageUrl) {
                            originalHtml = `<img src="${this.escapeHtml(imageUrl)}" class="message-image" data-url="${this.escapeHtml(imageUrl)}" onclick="chatManager.openImageViewerFromElement(this)" loading="lazy" alt="Пересланное изображение">`;
                        }
                    } else if (origText.startsWith('📎')) {
                        const lines = origText.split('\n');
                        const fileName = lines[0].replace('📎 ', '');
                        const fileUrl = lines[1] || '';
                        originalHtml = `
                            <div class="message-file" data-url="${this.escapeHtml(fileUrl)}" data-name="${this.escapeHtml(fileName)}" onclick="chatManager.downloadFileFromElement(this)">
                                <span class="message-file-icon"><img src="../materials/icons8-документ-96.png" alt=""></span>
                                <span class="message-file-body">
                                    <span class="message-file-name">${this.escapeHtml(fileName)}</span>
                                    <span class="message-file-hint">Документ · нажмите, чтобы скачать</span>
                                </span>
                                <img class="message-file-action" src="../materials/icons8-скачать-96.png" alt="">
                            </div>
                        `;
                    } else {
                        originalHtml = `<div style="font-size: 14px; margin-top: 4px; white-space: pre-wrap;">${this.formatLinks(this.escapeHtml(origText))}</div>`;
                    }
                    
                    contentHtml = `
                        <div class="forwarded-message">
                            <div class="forwarded-label">
                                <img src="../materials/icons8-поделиться-96.png" alt="">
                                <span>Переслано от: ${this.escapeHtml(forwardData.from)}</span>
                            </div>
                            ${originalHtml}
                        </div>
                    `;
                } catch (e) {
                    console.error('Failed to parse forwarded message:', e);
                    contentHtml = `<div class="message-text">${this.escapeHtml(msg.content)}</div>`;
                }
            } else {
                // Обычная логика для старых сообщений
                const isImage = msg.content && msg.content.startsWith('📷');
                const isFile = msg.content && msg.content.startsWith('📎');
                
                if (isImage) {
                    const lines = msg.content.split('\n');
                    const imageUrl = lines[1] || '';
                    contentHtml = `<img src="${this.escapeHtml(imageUrl)}" class="message-image" data-url="${this.escapeHtml(imageUrl)}" onclick="chatManager.openImageViewerFromElement(this)" loading="lazy" alt="Изображение">`;
                } else if (isFile) {
                    const lines = msg.content.split('\n');
                    const fileName = lines[0].replace('📎 ', '');
                    const fileUrl = lines[1] || '';
                    contentHtml = `
                        <div class="message-file" data-url="${this.escapeHtml(fileUrl)}" data-name="${this.escapeHtml(fileName)}" onclick="chatManager.downloadFileFromElement(this)">
                            <span class="message-file-icon"><img src="../materials/icons8-документ-96.png" alt=""></span>
                            <span class="message-file-body">
                                <span class="message-file-name">${this.escapeHtml(fileName)}</span>
                                <span class="message-file-hint">Документ · нажмите, чтобы скачать</span>
                            </span>
                            <img class="message-file-action" src="../materials/icons8-скачать-96.png" alt="">
                        </div>
                    `;
                } else {
                    const formattedText = this.formatLinks(this.escapeHtml(msg.content));
                    contentHtml = `<div class="message-text">${formattedText}</div>`;
                }
            }
            
            // Аватар для чужих сообщений
            const avatarHtml = !isOwn ? this.getAvatar(msg.avatar_uri, msg.name, msg.surname) : '';
            const isMediaOnly = contentHtml.includes('class="message-image"') && !contentHtml.includes('forwarded-message');
            
            html += `
                <div class="message ${isOwn ? 'sent' : 'received'}" data-message-id="${msg.id}" data-message-user="${msg.user_id}" data-message-content="${this.escapeHtml(msg.content)}">
                    <div class="message-content${isMediaOnly ? ' message-media-only' : ''}">
                        ${!isOwn ? `
                            <div class="message-av-container">
                                <div class="message-avatar">${avatarHtml}</div>
                            </div>
                        ` : ''}
                        <div class="message-maincontent">
                            ${!isOwn ? `
                                <div class="message-header">
                                    <span class="message-sender">${this.escapeHtml(msg.surname || '')} ${this.escapeHtml(msg.name || '')}</span>
                                </div>
                            ` : ''}
                            ${contentHtml}
                            <div class="message-footer">
                                <span class="message-time">${this.formatTime(msg.created_at)}</span>
                                ${msg.is_edited ? '<span class="message-edited">(ред.)</span>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        messagesContainer.innerHTML = html;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    // Показать контекстное меню для сообщения
    showContextMenu(event, messageId, isOwn, content) {
        event.preventDefault();
        
        this.closeContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'message-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--c_surf, white);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 180px;
            overflow: hidden;
        `;
        
        let menuItems = `
            <div class="context-menu-item" onclick="chatManager.forwardMessage(${messageId})">
                <img src="../materials/icons8-поделиться-96.png" class="ui-icon ui-icon-inline" alt=""> Переслать
            </div>
            <div class="context-menu-item" onclick="chatManager.reportMessage(${messageId})">
                <img src="../materials/icons8-предупреждение-96.png" class="ui-icon ui-icon-inline" alt=""> Пожаловаться
            </div>
        `;
        
        if (isOwn) {
            menuItems += `
                <div class="context-menu-item" onclick="chatManager.startEditing(${messageId})">
                    <img src="../materials/icons8-карандаш-96.png" class="ui-icon ui-icon-inline" alt=""> Редактировать
                </div>
                <div class="context-menu-item" onclick="chatManager.deleteMessage(${messageId})">
                    <img src="../materials/icons8-удалить-96.png" class="ui-icon ui-icon-inline" alt=""> Удалить
                </div>
            `;
        }
        
        menu.innerHTML = menuItems;
        document.body.appendChild(menu);
        
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
    async forwardMessage(messageId) {
        this.closeContextMenu();
        
        // Находим исходное сообщение
        const originalMsg = this.messages.find(m => m.id === messageId);
        if (!originalMsg) {
            showToast('Сообщение не найдено', 'error');
            return;
        }
        
        // Открываем модалку выбора чата
        this.openForwardModal(originalMsg);
    }

    openForwardModal(message) {
        const existing = document.getElementById('forwardModal');
        if (existing) existing.remove();
        
        // Список чатов (исключаем текущий)
        const availableChats = this.chats.filter(c => c.id !== this.currentChatId);
        
        const modal = document.createElement('div');
        modal.id = 'forwardModal';
        modal.className = 'custom-modal active';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; max-height: 80vh;">
                <div class="modal-header">
                    <h2>↪️ Переслать сообщение</h2>
                    <button class="modal-close" onclick="document.getElementById('forwardModal').remove()">&times;</button>
                </div>
                <div class="modal-body" style="padding: 0; overflow-y: auto;">
                    <div style="padding: 16px; background: var(--c_bg); border-bottom: 1px solid var(--c_surf_txt);">
                        <div style="font-size: 12px; color: var(--c_surf_txt); margin-bottom: 4px;">Исходное сообщение от ${escapeHtml(message.surname || '')} ${escapeHtml(message.name || '')}:</div>
                        <div style="font-size: 14px; color: var(--c_bg_txt); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(message.content.substring(0, 80))}${message.content.length > 80 ? '...' : ''}
                            ${message.attachments?.length ? ' 📎' : ''}
                        </div>
                    </div>
                    
                    <div style="padding: 12px;">
                        <div style="font-size: 12px; font-weight: 600; color: var(--c_surf_txt); text-transform: uppercase; margin-bottom: 8px;">Выберите чат</div>
                        <div class="forward-chat-list">
                            ${availableChats.map(chat => {
                                let name = chat.name || 'Чат';
                                let avatar = '💬';
                                if (chat.name === 'Избранное') {
                                    name = 'Избранное';
                                    avatar = `<img src="../materials/icons8-избранное-96.png" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                                } else if (chat.is_group) {
                                    avatar = '👥';
                                } else {
                                    const other = chat.participants?.find(p => p.id !== window.currentUser?.id);
                                    if (other) {
                                        name = `${other.surname} ${other.name}`;
                                        avatar = other.avatar_uri 
                                            ? `<img src="${other.avatar_uri}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` 
                                            : (other.name?.[0] || '?');
                                    }
                                }
                                
                                return `
                                    <div class="forward-chat-item" onclick="chatManager.doForward(${chat.id}, ${message.id})">
                                        <div class="forward-chat-avatar">${avatar}</div>
                                        <div class="forward-chat-name">${escapeHtml(name)}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async doForward(targetChatId, messageId) {
        // Закрываем модалку
        document.getElementById('forwardModal')?.remove();
        
        const originalMsg = this.messages.find(m => m.id === messageId);
        if (!originalMsg) return;
        
        const authorName = `${originalMsg.surname || ''} ${originalMsg.name || ''}`.trim() || 'Неизвестный';
        // Формируем контент для пересылки
        const forwardData = {
            from: authorName,
            text: originalMsg.content,
            attachments: (originalMsg.attachments || []).map(att => ({
                uri: att.file_uri || att.url,
                name: att.file_name || att.name,
                size: att.file_size || att.size,
                type: att.file_type,
                mimeType: att.mime_type
            }))
        };
        
        const forwardedContent = `[FORWARDED_FROM:${JSON.stringify(forwardData)}]`;
        
        try {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'send-message',
                    chatId: targetChatId,
                    content: forwardedContent,
                    attachments: forwardData.attachments
                }));
                showToast('Сообщение переслано', 'success');
            } else {
                const result = await fetch(`/api/chats/${targetChatId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        content: forwardedContent,
                        attachments: attachments
                    })
                });
                
                if (result.ok) {
                    showToast('Сообщение переслано', 'success');
                    await this.loadChats();
                    if (targetChatId === this.currentChatId) {
                        await this.loadMessages(targetChatId);
                    }
                }
            }
        } catch (error) {
            console.error('Forward error:', error);
            showToast('Ошибка пересылки', 'error');
        }
    }
    // Редактирование сообщения (через модалку)
    async editMessage(messageId, oldContent) {
        this.closeContextMenu();
        const modal = document.getElementById('editMessageModal');
        const textarea = document.getElementById('editMessageInput');
        const saveBtn = document.getElementById('saveEditBtn');
        
        textarea.value = oldContent;
        modal.style.display = 'flex';
        
        const saveHandler =  async () => {
            const newContent = textarea.value.trim();
            if (!newContent || newContent === oldContent) {
                closeEditModal();
                return;
            }
            
            try {
                const response = await fetch(`/api/chats/messages/${messageId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ content: newContent })
                });
                
                if (response.ok) {
                    await this.loadMessages(this.currentChatId);
                    await this.loadChatMedia(this.currentChatId);
                    closeEditModal();
                } else {
                    await uiAlert('Ошибка редактирования');
                }
            } catch (error) {
                console.error('Edit error:', error);
            }
        };
        
        saveBtn.onclick = saveHandler;
        textarea.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveHandler();
            }
        };
    }
    // Начать редактирование
    startEditing(messageId, currentContent) {
        this.editingMessageId = messageId;
        this.editingOriginalContent = currentContent;
        
        const messageInput = document.querySelector('.message-input');
        const editIndicator = document.querySelector('.editing-indicator');
        
        if (messageInput) {
            messageInput.value = currentContent;
            messageInput.focus();
            messageInput.placeholder = 'Редактирование...';
        }
        
        if (editIndicator) editIndicator.style.display = 'flex';
    }

    // Отменить редактирование
    cancelEditing() {
        this.editingMessageId = null;
        this.editingOriginalContent = '';
        
        const editIndicator = document.querySelector('.editing-indicator');
        if (editIndicator) editIndicator.style.display = 'none';
        
        const messageInput = document.querySelector('.message-input');
        if (messageInput) {
            messageInput.value = '';
            messageInput.placeholder = 'Введите сообщение...';
        }
    }

    // Сохранить редактирование
    async saveEditing() {
        if (!this.editingMessageId) return;
        
        const messageInput = document.querySelector('.message-input');
        const newContent = messageInput.value.trim();
        
        if (!newContent || newContent === this.editingOriginalContent) {
            this.cancelEditing();
            return;
        }
        
        try {
            const response = await fetch(`/api/chats/messages/${this.editingMessageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content: newContent })
            });
            
            if (response.ok) {
                await this.loadMessages(this.currentChatId);
                await this.loadChatMedia(this.currentChatId);
                this.cancelEditing();
            } else {
                await uiAlert('Ошибка редактирования');
            }
        } catch (error) {
            console.error('Edit error:', error);
        }
    }
    // Жалоба (через модалку с выбором причины)
    async reportMessage(messageId) {
        this.closeContextMenu();
        const modal = document.getElementById('reportMessageModal');
        const textarea = document.getElementById('reportReasonInput');
        const customWrap = document.getElementById('reportCustomReasonWrap');
        const sendBtn = document.getElementById('sendReportBtn');
        if (!modal || !sendBtn) return;

        const radios = Array.from(modal.querySelectorAll('input[name="reportReason"]'));
        radios.forEach(r => { r.checked = false; });
        textarea.value = '';
        if (customWrap) customWrap.style.display = 'none';

        const syncCustomField = () => {
            const selected = modal.querySelector('input[name="reportReason"]:checked');
            const needCustom = !!selected && selected.value === 'Другое';
            if (customWrap) customWrap.style.display = needCustom ? 'block' : 'none';
            if (needCustom) setTimeout(() => textarea.focus(), 0);
        };
        radios.forEach(r => { r.onchange = syncCustomField; });

        modal.style.display = 'flex';
        sendBtn.onclick =  async () => {
            const selected = modal.querySelector('input[name="reportReason"]:checked');
            if (!selected) {
                showToast('Выберите причину жалобы', 'error');
                return;
            }
            let reason = selected.value;
            if (reason === 'Другое') {
                reason = textarea.value.trim();
                if (!reason) {
                    showToast('Укажите свою причину жалобы', 'error');
                    textarea.focus();
                    return;
                }
            }
            try {
                const response = await fetch(`/api/chats/messages/${messageId}/report`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ reason })
                });
                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                    showToast(data.message || 'Жалоба отправлена модератору', 'success');
                    this.closeReportModal();
                } else {
                    showToast(data.error || 'Ошибка отправки жалобы', 'error');
                }
            } catch (error) {
                console.error('Report error:', error);
                showToast('Ошибка отправки жалобы', 'error');
            }
        };
    }

    // Функции закрытия модалок
    closeEditModal = () => {
        document.getElementById('editMessageModal').style.display = 'none';
    };

    closeReportModal = () => {
        document.getElementById('reportMessageModal').style.display = 'none';
    };

    // Удаление сообщения
    async deleteMessage(messageId) {
        this.closeContextMenu();
        this.showConfirmDeleteModal(messageId);
    }


    // Отрисовка ссылок в сайдбаре
    renderLinks(links) {
        console.log('🔗 Rendering links, count:', links.length);
        
        const linksContainer = document.querySelector('.sidebar-media-group-links');
        if (!linksContainer) {
            console.error('Links container not found!');
            return;
        }
        linksContainer.innerHTML = '';
        if (!links || links.length === 0) {
            linksContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Нет ссылок</div>';
            return;
        }
        
        linksContainer.innerHTML = `
            <table class="media-files">
                <tbody>
                    ${links.map(link => `
                        <tr class="media-files-element" onclick="window.open('${link.url}', '_blank')">
                            <td class="media-files-element-name">
                                <span class="file-icon">🔗</span> 
                                <span class="link-url">${this.escapeHtml(link.url.substring(0, 50))}${link.url.length > 50 ? '...' : ''}</span>
                            </td>
                            <td class="media-files-element-senddate">${this.formatDate(link.date)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }



    focusMessage(messageId) {
        const container = document.getElementById('messagesContainer');
        if (!container || !messageId) return;
        const target = [...container.querySelectorAll('.message')].find(
            el => String(el.dataset.messageId) === String(messageId)
        );
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('message-search-hit');
    }

    openImageViewerFromElement(el) {
        this.openImageViewer(el.dataset.url || el.src);
    }
    downloadFileFromElement(el) {
        this.downloadFile(el.dataset.url || '', el.dataset.name || 'file');
    }

    // Метод для открытия просмотра изображения
    openImageViewer(url) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:10px;object-fit:contain;">`;
        document.body.appendChild(modal);
    }



        async markAsRead(chatId) {
            if (!chatId) return;
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/chats/${chatId}/read`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    // Обновляем локальный массив чатов, чтобы счетчик исчез
                    const chat = this.chats.find(c => c.id === chatId);
                    if (chat) {
                        chat.unread_count = 0;
                        this.renderChatList();
                    }
                }
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        }
    
    // Индикатор набора текста
    showTypingIndicator(userId, isTyping) {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) {
            indicator.style.display = isTyping ? 'block' : 'none';
        }
    }
    
    // Отправка уведомления о наборе текста
    sendTyping(chatId, isTyping) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'typing',
                chatId: chatId,
                isTyping: isTyping
            }));
        }
    }
    initEventListeners() {
        // Создаём индикатор редактирования, если его нет
        if (!document.querySelector('.editing-indicator')) {
            const editIndicator = document.createElement('div');
            editIndicator.className = 'editing-indicator';
            editIndicator.style.cssText = 'display: none; align-items: center; gap: 10px; padding: 8px 15px; background: var(--c_acchalf); border-radius: 20px; margin-bottom: 10px;';
            editIndicator.innerHTML = `
                <span>✏️ Редактирование сообщения</span>
                <button class="cancel-edit-btn" style="background: none; border: none; cursor: pointer; color: #ff6b6b;">✖️ Отмена</button>
            `;
            const chatInputSection = document.querySelector('.chat-input-section');
            if (chatInputSection) {
                chatInputSection.insertBefore(editIndicator, chatInputSection.firstChild);
            }
        }

        // Обработчик отмены редактирования
        const cancelEditBtn = document.querySelector('.cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.cancelEditing());
        }

        // Полнотекстовый поиск по чатам и сообщениям (по подстроке)
        const chatSearchInput = document.getElementById('chatSearchInput');
        if (chatSearchInput) {
            let searchTimer;
            chatSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimer);
                const value = e.target.value;
                searchTimer = setTimeout(() => this.searchChats(value), 180);
            });
        }

        // Плавающая кнопка создания чата
        const floatingBtn = document.getElementById('floatingCreateChatBtn');
        if (floatingBtn) {
            floatingBtn.addEventListener('click', () => {
                this.showCreateChatModal();
            });
        }

        // Кнопка "Назад к списку чатов"
        const backBtn = document.getElementById('backToChatsBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.resetChatView();
            });
        }

        // Отправка сообщения по Enter
                // Отправка сообщения по Enter
        const messageInput = document.querySelector('.message-input');
        if (messageInput) {
            let typingTimeout = null;
            
            // Индикатор набора текста
            messageInput.addEventListener('input', () => {
                if (this.currentChatId) {
                    this.sendTyping(this.currentChatId, true);
                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        this.sendTyping(this.currentChatId, false);
                    }, 1000);
                }
            });
            
            // Отправка по Enter
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    
                    const text = messageInput.value.trim();
                    if ((text || this.pendingAttachments.length > 0) && this.currentChatId) {
                        this.sendMessageWithAttachments(this.currentChatId, text);
                        messageInput.value = '';
                    }
                }
            });
        }
        // Контекстное меню для папок
        document.addEventListener('contextmenu',  (e) => {
            const folderItem = e.target.closest('.folder-item');
            if (folderItem && folderItem.dataset.folderId && folderItem.dataset.folderId !== 'all') {
                e.preventDefault();
                const folderId = parseInt(folderItem.dataset.folderId);
                const folderName = folderItem.querySelector('.folder-name')?.textContent || '';
                this.showFolderContextMenu(e, folderId, folderName);
            }
        });
        // Кнопка отправки
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            const newSendBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
            
            newSendBtn.addEventListener('click', async () => {
                const messageInput = document.querySelector('.message-input');
                const text = messageInput?.value.trim();
                
                if ((text || this.pendingAttachments.length > 0) && this.currentChatId) {
                    await this.sendMessageWithAttachments(this.currentChatId, text || '');
                    if (messageInput) messageInput.value = '';
                }
            });
        }

        // Прикрепление файлов
        const attachBtn = document.querySelector('.tool-btn');
        const fileInput = document.getElementById('fileInput');

        if (attachBtn && fileInput) {
            attachBtn.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                
                for (const file of files) {
                    this.addPendingAttachment(file);
                }
                
                fileInput.value = '';
            });
        }

        // ===== КНОПКА СОЗДАНИЯ ПАПКИ (ВЫНЕСЕНА ОТДЕЛЬНО) =====
        const addFolderBtn = document.getElementById('addFolderBtn');
        if (addFolderBtn) {
            // Удаляем старые обработчики
            const newAddFolderBtn = addFolderBtn.cloneNode(true);
            addFolderBtn.parentNode.replaceChild(newAddFolderBtn, addFolderBtn);
            
            newAddFolderBtn.addEventListener('click', () => {
                this.showCreateFolderModal();
            });
        }

        // Переключение вкладок медиа в сайдбаре
        const mediaBtns = document.querySelectorAll('.sidebar-media-group-btn');
        const mediaGroups = document.querySelectorAll('.media-group');

        mediaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                mediaBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const mediaType = btn.getAttribute('data-media');
                
                mediaGroups.forEach(group => group.classList.remove('active'));
                
                if (mediaType === 'files') {
                    const filesGroup = document.querySelector('.sidebar-media-group-files');
                    if (filesGroup) filesGroup.classList.add('active');
                } else if (mediaType === 'images') {
                    const imagesGroup = document.querySelector('.sidebar-media-group-images');
                    if (imagesGroup) imagesGroup.classList.add('active');
                } else if (mediaType === 'links') {
                    const linksGroup = document.querySelector('.sidebar-media-group-links');
                    if (linksGroup) linksGroup.classList.add('active');
                }
            });
        });

        // Контекстное меню для сообщений
        document.addEventListener('contextmenu', (e) => {
            const messageDiv = e.target.closest('.message');
            if (messageDiv) {
                e.preventDefault();
                const messageId = parseInt(messageDiv.dataset.messageId);
                const isOwn = messageDiv.classList.contains('sent');
                const content = messageDiv.dataset.messageContent || '';
                this.showContextMenu(e, messageId, isOwn, content);
            }
        });
    }
    
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    // Показать модальное окно создания чата
    async showCreateChatModal() {
        const modal = document.getElementById('createChatModal');
        if (!modal) return;
        
        // Загружаем пользователей
        await this.loadUsersForChatCreation();
        
        modal.classList.add('active');
        
        // Обработчики
        document.getElementById('chatTypeSelect').onchange = () => {
            const groupNameGroup = document.getElementById('groupNameGroup');
            groupNameGroup.style.display = this.isGroupMode() ? 'block' : 'none';
        };
        
        document.getElementById('closeModalBtn').onclick = () => {
            modal.classList.remove('active');
        };
        
        document.getElementById('cancelModalBtn').onclick = () => {
            modal.classList.remove('active');
        };
        
        document.getElementById('createChatSubmitBtn').onclick =  async () => {
            await this.createNewChat();
            modal.classList.remove('active');
        };
        
        // Поиск пользователей
        document.getElementById('userSearchInput').oninput = (e) => {
            this.filterUserList(e.target.value);
        };
        // Отмена редактирования
        const cancelEditBtn = document.querySelector('.cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.cancelEditing());
        }

        // Отправка сообщения (с учётом режима редактирования)
        if (messageInput) {
            messageInput.addEventListener('keypress',  (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.editingMessageId) {
                        this.saveEditing();
                    } else if (this.currentChatId) {
                        this.sendMessage(this.currentChatId, messageInput.value);
                        messageInput.value = '';
                    }
                }
            });
        }
    }
    // Загрузка текущего пользователя
    async loadCurrentUser() {
        try {
            const result = await api.auth.getMe();
            if (result && result.user) {
                window.currentUser = result.user;
                console.log('Current user loaded:', window.currentUser);
                return window.currentUser;
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
        return null;
    }
    // Загрузка пользователей для выбора
    async loadUsersForChatCreation() {
        try {
            const result = await api.users.getAll();
            const users = result.users || [];
            const currentUserId = window.currentUser?.id;
            
            this.availableUsers = users.filter(u => u.id !== currentUserId);
            this.renderUserList(this.availableUsers);
        } catch (error) {
            console.error('Failed to load users:', error);
            document.getElementById('userListContainer').innerHTML = 
                '<div style="padding: 20px; text-align: center; color: red;">Ошибка загрузки</div>';
        }
    }

    // Отрисовка списка пользователей
    renderUserList(users) {
        const container = document.getElementById('userListContainer');
        if (!container) return;
        
        if (users.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Нет пользователей</div>';
            return;
        }
        
        this.selectedUsers = new Set();
        
        container.innerHTML = users.map(user => `
            <div class="user-item" data-user-id="${user.id}" onclick="chatManager.toggleUserSelection(${user.id})">
                <input type="checkbox" id="user_${user.id}" class="user-checkbox">
                <img src="${user.avatar_uri || '/materials/default-avatar.png'}" class="user-avatar-small" alt="avatar">
                <span class="user-name">${this.escapeHtml(user.surname)} ${this.escapeHtml(user.name)} (${this.escapeHtml(user.username)})</span>
            </div>
        `).join('');
    }

    // Фильтрация списка пользователей
    filterUserList(searchText) {
        if (!this.availableUsers) return;
        
        const filtered = this.availableUsers.filter(user => 
            user.surname.toLowerCase().includes(searchText.toLowerCase()) ||
            user.name.toLowerCase().includes(searchText.toLowerCase()) ||
            user.username.toLowerCase().includes(searchText.toLowerCase())
        );
        this.renderUserList(filtered);
    }

    // Выбор пользователя
    toggleUserSelection(userId) {
        const checkbox = document.getElementById(`user_${userId}`);
        if (!checkbox) return;
        
        if (this.selectedUsers.has(userId)) {
            this.selectedUsers.delete(userId);
            checkbox.checked = false;
        } else {
            this.selectedUsers.add(userId);
            checkbox.checked = true;
        }
        
        // Визуальное выделение
        const userItem = checkbox.closest('.user-item');
        if (userItem) {
            userItem.classList.toggle('selected', checkbox.checked);
        }
    }

    // Проверка режима группы
    isGroupMode() {
        return document.getElementById('chatTypeSelect').value === 'group';
    }

    // Создание нового чата
    async createNewChat() {
        const selectedUserIds = Array.from(this.selectedUsers);
        
        if (selectedUserIds.length === 0) {
            await uiAlert('Выберите хотя бы одного пользователя');
            return;
        }
        
        let chatId;
        
        try {
            if (this.isGroupMode()) {
                const groupName = document.getElementById('groupNameInput').value.trim();
                if (!groupName) {
                    await uiAlert('Введите название группы');
                    return;
                }
                const result = await api.chats.create(selectedUserIds, groupName, true);
                chatId = result.chatId;
            } else {
                if (selectedUserIds.length > 1) {
                    await uiAlert('Для личного чата выберите только одного пользователя');
                    return;
                }
                const result = await api.chats.create(selectedUserIds, null, false);
                chatId = result.chatId;
            }
            
            if (chatId) {
                await this.loadChats();
                this.loadMessages(chatId);
                this.selectedUsers.clear();
                document.getElementById('groupNameInput').value = '';
                document.getElementById('userSearchInput').value = '';
            }
        } catch (error) {
            // Показываем ошибку (например, "Пользователь не в контактах")
            if (typeof showToast === 'function') {
                showToast(error.message || 'Ошибка создания чата', 'error');
            } else {
                await uiAlert(error.message || 'Ошибка создания чата');
            }
        }
    }
    // Загрузка участников чата
    async loadChatParticipants(chatId) {
        try {
            const token = localStorage.getItem('token');
            const timestamp = Date.now();
            
            const response = await fetch(`/api/chats/${chatId}?_=${timestamp}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load chat info');
            
            const data = await response.json();
            const participants = data.chat?.participants || [];
            
            // Обновляем счетчик участников
            const participantsCountSpan = document.getElementById('participantsCount');
            if (participantsCountSpan) {
                participantsCountSpan.textContent = participants.length;
            }
            
            // Обновляем заголовок
            const participantsHeader = document.querySelector('.sidebar-section h3');
            if (participantsHeader && participants.length > 0) {
                participantsHeader.textContent = `Участники (${participants.length})`;
                participantsHeader.style.display = 'block';
            }
            
            this.renderParticipants(participants);
            return participants;
        } catch (error) {
            console.error('Failed to load participants:', error);
            return [];
        }
    }

    // Отрисовка списка участников в правой панели
    renderParticipants(participants) {
        const userListContainer = document.querySelector('.user-list');
        if (!userListContainer) return;
        
        if (participants.length === 0) {
            userListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Нет участников</div>';
            return;
        }
        
        const currentUserId = window.currentUser?.id;
        
        userListContainer.innerHTML = participants.map(user => {
            const avatarHtml = this.getAvatar(user.avatar_uri, user.name, user.surname);
            
            return `
                <div class="user-item ${user.is_online ? 'online' : 'offline'}">
                    <div class="user-avatar" style="width: 40px; height: 40px;">${avatarHtml}</div>
                    <span class="user-name">${this.escapeHtml(user.surname)} ${this.escapeHtml(user.name)}</span>
                    ${user.id === currentUserId ? '<span class="user-badge">(Вы)</span>' : ''}
                    <span class="user-status"></span>
                </div>
            `;
        }).join('');
        
        // Обновляем счетчик участников
        const participantsCount = document.querySelector('.sidebar-section h3');
        if (participantsCount) {
            participantsCount.textContent = `Участники (${participants.length})`;
        }
    }
    // Получение аватара пользователя или чата (с буквой если нет картинки)
    getAvatarInitial(name, surname = '') {
        if (name) return String(name).charAt(0);
        if (surname) return String(surname).charAt(0);
        return '?';
    }

    avatarError(img) {
        if (!img || !img.parentElement) return;
        const fallback = document.createElement('div');
        fallback.className = 'avatar-letter';
        fallback.textContent = img.dataset.letter || '?';
        img.replaceWith(fallback);
    }

    getAvatar(source, name, surname = '') {
        if (source && source !== 'null' && source !== 'undefined' && source !== '') {
            return `<img src="${this.escapeHtml(source)}" alt="avatar" data-letter="${this.escapeHtml(this.getAvatarInitial(name, surname))}" onerror="chatManager.avatarError(this)">`;
        }
        return this.getAvatarFallback(name, surname);
    }

    // Генерация аватара-заглушки с буквой
    getAvatarFallback(name, surname = '') {
        let letter = '';
        if (name && name.length > 0) {
            letter = name.charAt(0);
        } else if (surname && surname.length > 0) {
            letter = surname.charAt(0);
        } else {
            letter = '?';
        }
        
        return `<div class="avatar-letter">${this.escapeHtml(letter.toUpperCase())}</div>`;
    }

    // Для групповых чатов
    getGroupAvatar(chat) {
        if (chat.avatar_uri && chat.avatar_uri !== 'null' && chat.avatar_uri !== '') {
            return `<img src="${this.escapeHtml(chat.avatar_uri)}" alt="group" data-letter="👥" onerror="chatManager.avatarError(this)">`;
        }
        return `<div class="avatar-letter">👥</div>`;
    }

    resetChatView() {
        const chatContent = document.querySelector('.chat-content');
        if (chatContent) {
            chatContent.classList.add('no-chat-selected');
        }

        const backBtn = document.getElementById('backToChatsBtn');
        if (backBtn) {
            backBtn.style.display = 'none';
        }

        const chatSidebar = document.getElementById('chatSidebar');
        if (chatSidebar) {
            chatSidebar.style.display = 'none';
        }

        const chatNameHeader = document.querySelector('.chat-name');
        if (chatNameHeader) chatNameHeader.textContent = 'Выберите чат';

        const chatAvatar = document.querySelector('.chat-avatar');
        if (chatAvatar) {
            chatAvatar.outerHTML = '<div class="chat-avatar" style="width: 50px; height: 50px;"></div>';
        }

        const sidebarAvatar = document.querySelector('.sidebar-avatar');
        if (sidebarAvatar) {
            sidebarAvatar.outerHTML = '<div class="sidebar-avatar" style="width: 170px; height: 170px;"></div>';
        }

        const sidebarChatName = document.querySelector('.sidebar-chatname');
        if (sidebarChatName) {
            sidebarChatName.textContent = '';
            sidebarChatName.style.fontSize = '';
            sidebarChatName.style.fontWeight = '';
            sidebarChatName.style.marginTop = '';
            sidebarChatName.style.textAlign = '';
        }

        const participantsHeader = document.querySelector('.sidebar-section h3');
        if (participantsHeader) {
            participantsHeader.textContent = 'Участники (0)';
            participantsHeader.style.display = 'block';
        }

        const userList = document.getElementById('userList');
        if (userList) {
            userList.innerHTML = '';
            userList.style.display = 'none';
        }

        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="empty-chat-placeholder">
                    <div class="empty-icon"><img src="../materials/icons8-сообщение-64.png" alt=""></div>
                    <h3>Выберите чат</h3>
                    <p>Нажмите на чат в списке слева, чтобы начать общение</p>
                </div>
            `;
        }

        const chatInput = document.querySelector('.chat-input');
        if (chatInput) chatInput.style.display = 'none';

        document.querySelectorAll('.chat-list-element').forEach(el => el.classList.remove('active'));
        this.currentChatId = null;
    }

    // Открытие чата и загрузка сообщений
    async openChat(chatId, chatName, targetMessageId = null) {
        console.log('Opening chat:', chatId, chatName, targetMessageId);
        document.querySelectorAll('.message-search-hit').forEach(el => el.classList.remove('message-search-hit'));
        this.lastOpenedChatId = chatId;
        this.lastOpenedChatName = chatName;

        document.querySelectorAll('.chat-list-element').forEach(el => {
            el.classList.toggle('active', Number(el.dataset.chatId) === Number(chatId));
        });

        const userListContainer = document.getElementById('userList');
        if (userListContainer) {
            userListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Загрузка...</div>';
            userListContainer.style.display = 'block';
        }

        const participantsCountSpan = document.getElementById('participantsCount');
        if (participantsCountSpan) {
            participantsCountSpan.textContent = '0';
        }

        const participantsHeader = document.querySelector('.sidebar-section h3');
        if (participantsHeader) {
            participantsHeader.style.display = 'block';
        }

        const chatContent = document.querySelector('.chat-content');
        if (chatContent) {
            chatContent.classList.remove('no-chat-selected');
        }

        const backBtn = document.getElementById('backToChatsBtn');
        if (backBtn) {
            backBtn.style.display = 'flex';
        }

        const chatSidebar = document.getElementById('chatSidebar');
        if (chatSidebar) {
            chatSidebar.style.display = 'block';
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chats/${chatId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const chat = data.chat;
            const isGroup = chat.is_group;

            const chatNameHeader = document.querySelector('.chat-name');
            const chatAvatar = document.querySelector('.chat-avatar');
            const sidebarAvatar = document.querySelector('.sidebar-avatar');
            const sidebarChatName = document.querySelector('.sidebar-chatname');

            if (isGroup) {
                chatNameHeader.textContent = chat.name || 'Групповой чат';
                if (chatAvatar) {
                    chatAvatar.outerHTML = `<div class="chat-avatar" style="width: 50px; height: 50px;">${this.getGroupAvatar(chat)}</div>`;
                }
                if (sidebarAvatar) {
                    sidebarAvatar.outerHTML = `<div class="sidebar-avatar" style="width: 170px; height: 170px;">${this.getGroupAvatar(chat)}</div>`;
                }
                if (sidebarChatName) {
                    sidebarChatName.textContent = chat.name || 'Групповой чат';
                    sidebarChatName.style.fontSize = '24px';
                    sidebarChatName.style.fontWeight = 'bold';
                    sidebarChatName.style.marginTop = '15px';
                    sidebarChatName.style.textAlign = 'center';
                }

                if (participantsHeader) participantsHeader.style.display = 'block';
                if (userListContainer) userListContainer.style.display = 'block';
                await this.loadChatParticipants(chatId);
            } else {
                const participants = chat.participants || [];
                const isSaved = !chat.is_group && participants.length === 1 && participants[0].id === window.currentUser?.id;
                const otherUser = participants.find(p => p.id !== window.currentUser?.id);

                let displayName = chatName || chat.name || '';
                let avatarHtml = '';

                if (isSaved || (!otherUser && !displayName)) {
                    displayName = chat.name || chatName || 'Избранное';
                    avatarHtml = '<img src="../materials/icons8-избранное-96.png" class="saved-chat-icon" alt="">';
                } else if (otherUser) {
                    displayName = `${otherUser.surname} ${otherUser.name}`.trim() || displayName;
                    avatarHtml = this.getAvatar(otherUser.avatar_uri, otherUser.name, otherUser.surname);
                } else if (chat.avatar_uri) {
                    avatarHtml = this.getAvatar(chat.avatar_uri, displayName);
                }

                if (chatNameHeader) chatNameHeader.textContent = displayName || 'Чат';
                if (chatAvatar && avatarHtml) {
                    chatAvatar.outerHTML = `<div class="chat-avatar" style="width: 50px; height: 50px;">${avatarHtml}</div>`;
                }
                if (sidebarAvatar && avatarHtml) {
                    sidebarAvatar.outerHTML = `<div class="sidebar-avatar" style="width: 170px; height: 170px;">${avatarHtml}</div>`;
                }
                if (sidebarChatName) {
                    sidebarChatName.textContent = displayName || 'Чат';
                    sidebarChatName.style.fontSize = '';
                    sidebarChatName.style.fontWeight = '';
                    sidebarChatName.style.marginTop = '';
                    sidebarChatName.style.textAlign = '';
                }

                if (participantsHeader) participantsHeader.style.display = 'none';
                if (userListContainer) {
                    userListContainer.innerHTML = '';
                    userListContainer.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to load chat info:', error);
        }

        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Загрузка сообщений...</div>';
        }

        await this.loadMessages(chatId);
        await this.markAsRead(chatId);
        await this.loadChatMedia(chatId);

        if (targetMessageId) {
            this.focusMessage(targetMessageId);
        }

        const chatInput = document.querySelector('.chat-input');
        if (chatInput) chatInput.style.display = 'flex';
    }

    async sendFile(chatId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`/api/chats/${chatId}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        return response.json();
    }
    // Загрузка медиа чата

    async loadChatMedia(chatId) {
        try {
            const token = localStorage.getItem('token');
            const timestamp = Date.now();
            
            // Получаем медиа с сервера
            const response = await fetch(`/api/chats/${chatId}/media?_=${timestamp}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            const data = await response.json();
            console.log('📁 Media data received:', data);
            
            // Сохраняем файлы и изображения
            this.files = data.files || [];
            this.images = data.images || [];
            this.addForwardedMedia(this.messages);
            
            // === НОВЫЙ КОД: Собираем ссылки из сообщений ===
            const links = [];
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            
            for (const msg of this.messages) {
                if (msg.content && !msg.content.startsWith('📷') && !msg.content.startsWith('📎')) {
                    const urls = msg.content.match(urlRegex);
                    if (urls) {
                        for (const url of urls) {
                            links.push({
                                url: url,
                                date: msg.created_at,
                                message_id: msg.id,
                                preview: url.length > 50 ? url.substring(0, 50) + '...' : url
                            });
                        }
                    }
                }
            }
            this.links = links;
            console.log('🔗 Links found:', links.length);
            // === КОНЕЦ НОВОГО КОДА ===
            
            // Отображаем
            this.renderImages(this.images);
            this.renderFiles(this.files);
            this.renderLinks(this.links); // Добавляем отрисовку ссылок
            
        } catch (error) {
            console.error('Failed to load media:', error);
        }
    }

    addForwardedMedia(messages) {
        for (const msg of messages || []) {
            const data = this.parseForwardedContent(msg.content);
            const text = (data && data.text) || '';
            if (text.startsWith('📷')) {
                const url = text.split('\n')[1];
                if (url) {
                    this.images.push({
                        url,
                        name: `Переслано от ${data.from || 'неизвестного'}`,
                        created_at: msg.created_at,
                        message_id: msg.id
                    });
                }
            } else if (text.startsWith('📎')) {
                const lines = text.split('\n');
                const name = lines[0].replace('📎 ', '');
                const url = lines[1] || '';
                if (url) {
                    this.files.push({
                        url,
                        name,
                        size: '—',
                        created_at: msg.created_at,
                        message_id: msg.id
                    });
                }
            }
        }
        const unique = items => {
            const seen = new Set();
            return items.filter(item => {
                const key = item.url || item.file_uri || item.name;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        };
        this.images = unique(this.images);
        this.files = unique(this.files);
    }

    // Отрисовка изображений в сайдбаре

    renderImages(images) {
        console.log('🖼️ Rendering images, count:', images.length);
        
        const imagesContainer = document.querySelector('.sidebar-media-group-images');
        if (!imagesContainer) {
            console.error('Images container not found!');
            return;
        }
        imagesContainer.innerHTML = '';
        if (!images || images.length === 0) {
            imagesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Нет изображений</div>';
            return;
        }
        
        let html = '<div class="images-grid">';
        for (const img of images) {
            const imageUrl = img.url || img.file_uri;
            const imageName = img.name || img.file_name;
            html += `
                <div class="grid-image-item" data-url="${this.escapeHtml(imageUrl)}" onclick="chatManager.openImageViewerFromElement(this)">
                    <img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(imageName)}" loading="lazy">
                </div>
            `;
        }
        html += '</div>';
        
        imagesContainer.innerHTML = html;
        console.log('✅ Images rendered');
    }

    // Отрисовка файлов в сайдбаре

    renderFiles(files) {
        console.log('📄 Rendering files, count:', files.length);
        
        const filesContainer = document.querySelector('.sidebar-media-group-files .media-files');
        if (!filesContainer) {
            console.error('Files container not found!');
            return;
        }
        filesContainer.innerHTML = '';
        if (!files || files.length === 0) {
            filesContainer.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">Нет файлов</td></tr>';
            return;
        }
        
        filesContainer.innerHTML = files.map(file => `
            <tr class="media-files-element" onclick="chatManager.downloadFile('${file.url || file.file_uri}', '${file.name || file.file_name}')">
                <td class="media-files-element-name">
                    <span class="file-icon"><img src="../materials/icons8-документ-96.png" alt=""></span> ${this.escapeHtml(file.name || file.file_name)}
                </td>
                <td class="media-files-element-size">${file.size || '—'}</td>
                <td class="media-files-element-senddate">${this.formatDate(file.created_at || file.uploaded_at)}</td>
            </tr>
        `).join('');
    }

    // Открытие изображения

    openImage(url) {
        window.open(url, '_blank');
    }
    // Форматирование времени

    formatTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Форматирование даты для медиа

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
    // Функция для преобразования ссылок в HTML

    formatLinks(text) {
        if (!text) return '';
        // Регулярное выражение для поиска URL
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
        });
    }
    // Получение аватара (если нет метода)

    // Скачивание файла из сообщения (ищем файл в медиа)
    async downloadFileFromMessage(fileName) {
        // Ищем файл в загруженных медиа
        const file = this.files.find(f => f.name === fileName);
        if (file && file.url) {
            this.downloadFile(file.url, fileName);
        } else {
            await uiAlert(`Файл "${fileName}" не найден на сервере`);
        }
    }
    // Загрузка файла
    async uploadFile(chatId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`/api/chats/${chatId}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('📎 File uploaded:', result);
            
            // ← ГЛАВНОЕ: обновляем сообщения и список чатов
            await this.loadMessages(chatId);
            await this.loadChats();
            await this.loadChatMedia(chatId);
            
            return result;
            
        } catch (error) {
            console.error('Upload file error:', error);
            throw error;
        }
    }

    addPendingAttachment(file) {
        this.pendingAttachments.push(file);
        this.renderPendingAttachments();
    }

    // Удалить из очереди
    removePendingAttachment(index) {
        this.pendingAttachments.splice(index, 1);
        this.renderPendingAttachments();
    }

    // Показать превью
    renderPendingAttachments() {
        const container = document.querySelector('.attachments-preview');
        const list = document.querySelector('.attachments-list');
        
        if (!container || !list) return;
        
        if (this.pendingAttachments.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        list.innerHTML = this.pendingAttachments.map((file, idx) => `
            <div class="pending-attachment">
                <span>${file.type.startsWith('image/') ? '🖼️' : '📎'} ${this.escapeHtml(file.name)}</span>
                <button class="remove-attachment" onclick="chatManager.removePendingAttachment(${idx})">✖️</button>
            </div>
        `).join('');
    }

    // Отправить сообщение с файлами
    async sendMessageWithAttachments(chatId, text) {
        const hasText = text && text.trim().length > 0;
        const hasFiles = this.pendingAttachments.length > 0;
        
        if (!hasText && !hasFiles) return;
        
        // 1. Отправляем текст (если есть) через WebSocket/REST
        if (hasText) {
            await this.sendMessage(chatId, text);
        }
        
        // 2. Отправляем файлы
        if (hasFiles) {
            for (const file of this.pendingAttachments) {
                await this.uploadFile(chatId, file);
            }
        }
        
        // 3. Очищаем очередь
        this.pendingAttachments = [];
        this.renderPendingAttachments();
    }
    // Закрыть контекстное меню
    closeContextMenu() {
        const menu = document.querySelector('.message-context-menu');
        if (menu) menu.remove();
    }

    // Показать модалку подтверждения удаления
    showConfirmDeleteModal(messageId) {
        this.pendingDeleteMessageId = messageId;
        const modal = document.getElementById('confirmDeleteModal');
        if (modal) modal.style.display = 'flex';
        
        // Обработчик подтверждения
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const oldHandler = confirmBtn.onclick;
        confirmBtn.onclick =  async () => {
            await this.executeDelete();
            closeConfirmDeleteModal();
        };
    }

    // Выполнить удаление
    async executeDelete() {
        if (!this.pendingDeleteMessageId) return;
        
        try {
            const response = await fetch(`/api/chats/messages/${this.pendingDeleteMessageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                await this.loadMessages(this.currentChatId);
                await this.loadChatMedia(this.currentChatId); // ← ОБНОВЛЯЕМ МЕДИА
                await this.loadChats();
            } else {
                await uiAlert('Ошибка удаления');
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            this.pendingDeleteMessageId = null;
            this.closeConfirmDeleteModal();
        }
    }

    // Закрыть модалку подтверждения
    closeConfirmDeleteModal() {
        const modal = document.getElementById('confirmDeleteModal');
        if (modal) modal.style.display = 'none';
        this.pendingDeleteMessageId = null;
    }
    formatDateDivider(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (msgDate.getTime() === today.getTime()) {
            return 'Сегодня';
        } else if (msgDate.getTime() === yesterday.getTime()) {
            return 'Вчера';
        } else {
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    }
    // Загрузка папок пользователя
    async loadFolders() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chats/folders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to load folders');
            
            const data = await response.json();
            this.folders = data.folders || [];
            this.renderFolders();
        } catch (error) {
            console.error('Failed to load folders:', error);
            this.folders = [];
        }
    }

    // Отрисовка списка папок
    renderFolders() {
        const container = document.getElementById('foldersList');
        if (!container) return;
        
        let html = `
            <div class="folder-item ${this.currentFolderId === 'all' ? 'active' : ''}" data-folder-id="all" onclick="chatManager.selectFolder('all')">
                <span class="folder-icon">💬</span>
                <span class="folder-name">Все чаты</span>
            </div>
        `;
        
        for (const folder of this.folders) {
            html += `
                <div class="folder-item ${this.currentFolderId === folder.id ? 'active' : ''}" data-folder-id="${folder.id}" onclick="chatManager.selectFolder(${folder.id})">
                    <span class="folder-icon">📁</span>
                    <span class="folder-name">${this.escapeHtml(folder.name)}</span>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    // Выбор папки
    async selectFolder(folderId) {
        this.currentFolderId = folderId;
        this.renderFolders();
        
        if (folderId === 'all') {
            // Загружаем все чаты
            await this.loadChats();
        } else {
            // Загружаем чаты из папки
            await this.loadChatsFromFolder(folderId);
        }
    }

    // Загрузка чатов из папки
    async loadChatsFromFolder(folderId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chats/folders/${folderId}/chats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to load folder chats');
            
            const data = await response.json();
            this.chats = data.chats || [];
            this.renderChatList();
        } catch (error) {
            console.error('Failed to load folder chats:', error);
        }
    }

    // Создание новой папки
    async createFolder() {
        const name = await uiPrompt('Введите название папки:');
        if (!name || name.trim() === '') return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chats/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: name.trim() })
            });
            
            if (!response.ok) throw new Error('Failed to create folder');
            
            await this.loadFolders();
        } catch (error) {
            console.error('Failed to create folder:', error);
            await uiAlert('Ошибка создания папки');
        }
    }

    // Редактирование папки
    async editFolder(folderId, currentName) {
        const newName = await uiPrompt('Введите новое название папки:', currentName);
        if (!newName || newName.trim() === '' || newName === currentName) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chats/folders/${folderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName.trim() })
            });
            
            if (!response.ok) throw new Error('Failed to update folder');
            
            await this.loadFolders();
        } catch (error) {
            console.error('Failed to update folder:', error);
            await uiAlert('Ошибка переименования папки');
        }
    }

    // Удаление папки
    async deleteFolder(folderId) {
        // if (!await uiConfirm('Удалить эту папку? Чаты не будут удалены.')) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chats/folders/${folderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to delete folder');
            
            if (this.currentFolderId === folderId) {
                this.currentFolderId = 'all';
            }
            await this.loadFolders();
            await this.loadChats();
        } catch (error) {
            console.error('Failed to delete folder:', error);
            await uiAlert('Ошибка удаления папки');
        }
    }
    showCreateFolderModal() {
        const modal = document.getElementById('createFolderModal');
        const input = document.getElementById('folderNameInput');
        const confirmBtn = document.getElementById('confirmCreateFolderBtn');
        
        if (!modal) return;
        
        input.value = '';
        modal.style.display = 'flex';
        input.focus();
        
        // Убираем старый обработчик
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.onclick =  async () => {
            const name = input.value.trim();
            if (!name) {
                await uiAlert('Введите название папки');
                return;
            }
            await this.createFolder(name);
            modal.style.display = 'none';
        };
    }

    async createFolder(name) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chats/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            
            if (!response.ok) throw new Error('Failed to create folder');
            
            await this.loadFolders();
        } catch (error) {
            console.error('Failed to create folder:', error);
            await uiAlert('Ошибка создания папки');
        }
    }
    // Показать модалку редактирования папки
    showEditFolderModal(folderId, currentName) {
        const modal = document.getElementById('editFolderModal');
        const input = document.getElementById('editFolderNameInput');
        const confirmBtn = document.getElementById('confirmEditFolderBtn');
        
        if (!modal) return;
        
        input.value = currentName;
        modal.style.display = 'flex';
        input.focus();
        
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.onclick =  async () => {
            const newName = input.value.trim();
            if (!newName || newName === currentName) {
                modal.style.display = 'none';
                return;
            }
            await this.renameFolder(folderId, newName);
            modal.style.display = 'none';
        };
    }

    // Показать модалку удаления папки
    showDeleteFolderModal(folderId) {
        const modal = document.getElementById('deleteFolderModal');
        const confirmBtn = document.getElementById('confirmDeleteFolderBtn');
        
        if (!modal) return;
        
        modal.style.display = 'flex';
        
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.onclick =  async () => {
            await this.deleteFolder(folderId);
            modal.style.display = 'none';
        };
    }

    // Переименование папки
    async renameFolder(folderId, newName) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chats/folders/${folderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            });
            
            if (!response.ok) throw new Error('Failed to rename folder');
            
            await this.loadFolders();
        } catch (error) {
            console.error('Failed to rename folder:', error);
            await uiAlert('Ошибка переименования папки');
        }
    }
    showFolderContextMenu(event, folderId, folderName) {
        // Удаляем существующее меню
        this.closeContextMenu();
        
        // Создаём меню
        const menu = document.createElement('div');
        menu.className = 'message-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--c_surf, white);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 180px;
            overflow: hidden;
        `;
        
        menu.innerHTML = `
            <div class="context-menu-item" data-name="${this.escapeHtml(folderName)}" onclick="chatManager.showEditFolderModal(${folderId}, this.dataset.name)">
                <img src="../materials/icons8-карандаш-96.png" class="ui-icon ui-icon-inline" alt=""> Переименовать
            </div>
            <div class="context-menu-item" onclick="chatManager.showDeleteFolderModal(${folderId})">
                <img src="../materials/icons8-удалить-96.png" class="ui-icon ui-icon-inline" alt=""> Удалить
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Закрыть меню при клике вне
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
    showChatContextMenu(event, chatId, chatName) {
        event.preventDefault();
        event.stopPropagation();
        
        // Удаляем существующее меню
        this.closeContextMenu();
        
        // Получаем список папок
        const folders = this.folders || [];
        
        // Создаём меню
        const menu = document.createElement('div');
        menu.className = 'message-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--c_surf, white);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 200px;
            overflow: hidden;
        `;
        
        let menuItems = `
            <div class="context-menu-item" style="font-weight: 600; border-bottom: 1px solid #eee;">
                <img src="../materials/icons8-перемещение-96.png" class="ui-icon ui-icon-inline" alt=""> Переместить в папку
            </div>
        `;
        
        // Добавляем пункт "Все чаты" (убрать из папки)
        menuItems += `
            <div class="context-menu-item" onclick="chatManager.moveChatToFolder(${chatId}, null)">
                <img src="../materials/icons8-чат-96.png" class="ui-icon ui-icon-inline" alt=""> Все чаты
            </div>
        `;
        
        // Добавляем все папки пользователя
        for (const folder of folders) {
            menuItems += `
                <div class="context-menu-item" onclick="chatManager.moveChatToFolder(${chatId}, ${folder.id})">
                    <img src="../materials/icons8-папка-96.png" class="ui-icon ui-icon-inline" alt=""> ${this.escapeHtml(folder.name)}
                </div>
            `;
        }
        
        menu.innerHTML = menuItems;
        document.body.appendChild(menu);
        
        // Закрыть меню при клике вне
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
    async moveChatToFolder(chatId, folderId) {
        try {
            const token = localStorage.getItem('token');
            
            let response;
            if (folderId === null) {
                // Удаляем чат из всех папок (в "Все чаты")
                // Нужно удалить все связи чата с папками пользователя
                const userFolders = this.folders.map(f => f.id);
                for (const fId of userFolders) {
                    await fetch(`/api/chats/folders/${fId}/chats/${chatId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
                response = { ok: true };
            } else {
                // Добавляем чат в папку
                response = await fetch(`/api/chats/folders/${folderId}/chats/${chatId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
            
            if (!response.ok) throw new Error('Failed to move chat');
            
            // Обновляем отображение
            if (this.currentFolderId !== 'all') {
                // Если мы в папке, обновляем список чатов
                await this.loadChatsFromFolder(this.currentFolderId);
            } else {
                // Если во "Все чаты", просто обновляем список
                await this.loadChats();
            }
            
            // Обновляем папки (для обновления счетчиков)
            await this.loadFolders();
            
        } catch (error) {
            console.error('Failed to move chat:', error);
            await uiAlert('Ошибка перемещения чата');
        }
    }



    
    closeEditFolderModal() {
        document.getElementById('editFolderModal').style.display = 'none';
    }

    closeDeleteFolderModal() {
        document.getElementById('deleteFolderModal').style.display = 'none';
    }
    async switchTab(tab) {
        const title = document.getElementById('activeTabTitle');
        const chatsTab = document.getElementById('chatsTab');
        const contactsTab = document.getElementById('contactsTab');
        const btnChats = document.getElementById('tab-btn-chats');
        const btnContacts = document.getElementById('tab-btn-contacts');
        
        if (!title || !chatsTab || !contactsTab) return;
        
        // Сброс классов
        [btnChats, btnContacts].forEach(btn => btn?.classList.remove('active'));
        [chatsTab, contactsTab].forEach(t => t?.classList.remove('active'));
        
        if (tab === 'chats') {
            title.textContent = 'Чаты';
            btnChats?.classList.add('active');
            chatsTab.style.display = 'block';
            chatsTab.classList.add('active');
            contactsTab.style.display = 'none';
        } else {
            title.textContent = 'Контакты';
            btnContacts?.classList.add('active');
            contactsTab.style.display = 'block';
            contactsTab.classList.add('active');
            chatsTab.style.display = 'none';
            
            // Загружаем контакты
            await this.loadContacts();
        }
    }

    async loadContacts() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/contacts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            const inBlock = document.getElementById('incomingRequestsBlock');
            const inList = document.getElementById('incomingRequestsList');
            const inCount = document.getElementById('incomingCount');
            
            const contactsList = document.getElementById('contactsList');
            const contactsCount = document.getElementById('contactsCount');
            
            // 1. Входящие
            if (data.incoming && data.incoming.length > 0) {
                inBlock.style.display = 'block';
                if (inCount) inCount.textContent = data.incoming.length;
                
                inList.innerHTML = data.incoming.map(u => `
                    <div class="contact-item">
                        <div class="contact-avatar">
                            ${u.avatar_uri 
                                ? `<img src="${u.avatar_uri}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` 
                                : (u.name?.[0] || '?')}
                        </div>
                        <div class="contact-info">
                            <div class="contact-name">${escapeHtml(u.surname)} ${escapeHtml(u.name)}</div>
                            <div style="font-size: 12px; color: var(--c_surf_txt);">Хочет добавить вас</div>
                        </div>
                        <div style="display: flex; gap: 4px;">
                            <button class="btn-accept" onclick="chatManager.respondContact(${u.id}, 'accept')" title="Принять">✓</button>
                            <button class="btn-decline" onclick="chatManager.respondContact(${u.id}, 'decline')" title="Отклонить">✕</button>
                        </div>
                    </div>
                `).join('');
            } else {
                inBlock.style.display = 'none';
            }
            
            // 2. Мои контакты
            if (data.contacts && data.contacts.length > 0) {
                if (contactsCount) contactsCount.textContent = data.contacts.length;
                
                contactsList.innerHTML = data.contacts.map(u => `
                    <div class="contact-item">
                        <div class="contact-avatar">
                            ${u.avatar_uri 
                                ? `<img src="${u.avatar_uri}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` 
                                : (u.name?.[0] || '?')}
                        </div>
                        <div class="contact-info">
                            <div class="contact-name">${escapeHtml(u.surname)} ${escapeHtml(u.name)}</div>
                        </div>
                        <button class="btn-write" onclick="chatManager.startChatWith(${u.id})">Написать</button>
                    </div>
                `).join('');
            } else {
                if (contactsCount) contactsCount.textContent = '0';
                contactsList.innerHTML = '<div style="text-align:center; color:#999; padding: 20px;">Нет контактов</div>';
            }
            
        } catch (e) {
            console.error('Load contacts error:', e);
        }
    }

    async respondContact(userId, action) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/contacts/respond/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Ошибка');
            }
            
            if (typeof showToast === 'function') {
                showToast(action === 'accept' ? 'Контакт добавлен' : 'Заявка отклонена', 'success');
            }
            
            // Перезагружаем контакты (обновится и список, и счетчики)
            await this.loadContacts();
            
            // Если приняли — обновляем список чатов (чтобы можно было написать)
            if (action === 'accept') {
                await this.loadChats();
            }
            
        } catch (e) {
            console.error('Respond contact error:', e);
            if (typeof showToast === 'function') {
                showToast(e.message, 'error');
            }
        }
    }

    async startChatWith(userId) {
        try {
            const result = await api.chats.create([userId], null, false);
            if (result.chatId) {
                await this.loadChats();
                this.openChat(result.chatId, '');
                this.switchTab('chats');
            }
        } catch(e) { console.error(e); }
    }
        openFindUsersModal() {
        const modal = document.getElementById('findUsersModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('findUsersSearch').value = '';
            this.searchUsers('');
        }
    }

    async searchUsers(searchText = '') {
        const resultsContainer = document.getElementById('findUsersResults');
        if (!resultsContainer) return;

        try {
            const token = localStorage.getItem('token');
            // Ищем пользователей через существующий API (можно добавить параметр search)
            const res = await fetch(`/api/users?search=${encodeURIComponent(searchText)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            // Отфильтровываем себя
            const users = (data.users || []).filter(u => u.id !== window.currentUser?.id);

            // Получаем текущие контакты, чтобы знать статус (в контактах, заявка отправлена и т.д.)
            const contactsRes = await fetch('/api/contacts', { headers: { 'Authorization': `Bearer ${token}` } });
            const contactsData = await contactsRes.json();
            
            const acceptedIds = new Set(contactsData.contacts.map(c => c.id));
            const incomingIds = new Set(contactsData.incoming.map(c => c.id));
            const outgoingIds = new Set(contactsData.outgoing.map(c => c.id));

            if (users.length === 0) {
                resultsContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Никого не найдено</div>';
                return;
            }

            resultsContainer.innerHTML = users.map(user => {
                let actionHtml = '';
                
                if (acceptedIds.has(user.id)) {
                    actionHtml = `<span style="color: var(--c_success); font-size: 12px;">✓ В контактах</span>`;
                } else if (outgoingIds.has(user.id)) {
                    actionHtml = `<span style="color: var(--c_warning); font-size: 12px;">⏳ Заявка отправлена</span>`;
                } else if (incomingIds.has(user.id)) {
                    actionHtml = `<button class="btn-accept" onclick="chatManager.respondContact(${user.id}, 'accept')">Принять</button>`;
                } else {
                    actionHtml = `<button class="btn-add-contact" onclick="chatManager.sendContactRequest(${user.id}, this)">Добавить</button>`;
                }

                return `
                    <div class="contact-search-item">
                        <div class="contact-avatar">
                            ${user.avatar_uri 
                                ? `<img src="${user.avatar_uri}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` 
                                : (user.name?.[0] || '?')}
                        </div>
                        <div class="contact-info">
                            <div class="contact-name">${escapeHtml(user.surname)} ${escapeHtml(user.name)}</div>
                            <div class="contact-email" style="font-size: 12px; color: var(--c_surf_txt);">${escapeHtml(user.email || '')}</div>
                        </div>
                        <div class="contact-action">
                            ${actionHtml}
                        </div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error(e);
            resultsContainer.innerHTML = '<div style="color: red; padding: 20px;">Ошибка поиска</div>';
        }
    }

    async sendContactRequest(userId, btnElement) {
        try {
            btnElement.disabled = true;
            btnElement.textContent = '...';
            
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/contacts/request/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            
            btnElement.outerHTML = '<span style="color: var(--c_warning); font-size: 12px;">⏳ Заявка отправлена</span>';
            showToast('Заявка отправлена', 'success');
            
        } catch (e) {
            console.error(e);
            btnElement.disabled = false;
            btnElement.textContent = 'Добавить';
            showToast(e.message, 'error');
        }
    }
    // ================= Настройки чата =================
    emptyChatSettingsPending() {
        return { name: null, avatarFile: null, avatarPreview: null, removeAvatar: false };
    }

    async openChatSettings() {
        if (!this.currentChatId) {
            await uiAlert('Сначала выберите чат');
            return;
        }
        const modal = document.getElementById('chatSettingsModal');
        if (!modal) return;
        this.chatSettingsView = 'main';
        try {
            await this.refreshChatSettings();
            this.chatSettingsInitial = JSON.parse(JSON.stringify(this.chatSettings));
            this.chatSettingsPending = this.emptyChatSettingsPending();
            this.renderChatSettings();
            modal.style.display = 'flex';
        } catch (e) {
            await uiAlert('Не удалось загрузить настройки чата: ' + e.message);
        }
    }

    closeChatSettings() {
        const modal = document.getElementById('chatSettingsModal');
        if (modal) modal.style.display = 'none';
    }

    async refreshChatSettings() {
        this.chatSettings = await api.chats.getSettings(this.currentChatId);
        this.renderChatSettings();
        this.applyChatSettingsToView(this.chatSettings);
    }

    applyChatSettingsToView(settings) {
        if (!settings || !settings.chat) return;
        const chatInfo = settings.chat;
        const participants = settings.participants || [];
        const chatId = Number(chatInfo.id || this.currentChatId);

        const idx = this.chats.findIndex(c => Number(c.id) === chatId);
        if (idx >= 0) {
            const current = this.chats[idx];
            const has = (key) => Object.prototype.hasOwnProperty.call(chatInfo, key);
            this.chats[idx] = {
                ...current,
                name: has('name') ? chatInfo.name : current.name,
                avatar_uri: has('avatar_uri') ? chatInfo.avatar_uri : current.avatar_uri,
                is_group: has('is_group') ? chatInfo.is_group : current.is_group,
                created_by: has('created_by') ? chatInfo.created_by : current.created_by,
                participants: participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    surname: p.surname,
                    avatar_uri: p.avatar_uri,
                    status: p.status,
                    role: p.role
                }))
            };
        }

        this.renderChatList();
        document.querySelectorAll('.chat-list-element').forEach(el => {
            el.classList.toggle('active', Number(el.dataset.chatId) === Number(this.currentChatId));
        });

        if (Number(this.currentChatId) === chatId) {
            this.renderCurrentChatHeader(settings);
        }
    }

    renderCurrentChatHeader(settings) {
        const chat = settings.chat || {};
        const participants = settings.participants || [];
        const isGroup = !!chat.is_group;
        const isSaved = !isGroup && (chat.name === 'Избранное' || (participants.length === 1 && participants.some(p => p.is_me)));
        const other = participants.find(p => !p.is_me);

        let displayName = chat.name || 'Чат';
        let avatarHtml = '';

        if (isGroup) {
            avatarHtml = this.getGroupAvatar(chat);
        } else if (isSaved) {
            displayName = chat.name || 'Избранное';
            avatarHtml = '<img src="../materials/icons8-избранное-96.png" class="saved-chat-icon" alt="">';
        } else if (other) {
            displayName = `${other.surname || ''} ${other.name || ''}`.trim() || displayName;
            avatarHtml = this.getAvatar(other.avatar_uri, other.name, other.surname);
        } else if (chat.avatar_uri) {
            avatarHtml = this.getAvatar(chat.avatar_uri, displayName);
        }

        this.lastOpenedChatName = displayName;
        const chatNameHeader = document.querySelector('.chat-name');
        const chatAvatar = document.querySelector('.chat-avatar');
        const sidebarAvatar = document.querySelector('.sidebar-avatar');
        const sidebarChatName = document.querySelector('.sidebar-chatname');

        if (chatNameHeader) chatNameHeader.textContent = displayName;
        if (chatAvatar && avatarHtml) chatAvatar.innerHTML = avatarHtml;
        if (sidebarAvatar && avatarHtml) sidebarAvatar.innerHTML = avatarHtml;
        if (sidebarChatName) {
            sidebarChatName.textContent = displayName;
            sidebarChatName.style.fontSize = isGroup ? '24px' : '';
            sidebarChatName.style.fontWeight = isGroup ? 'bold' : '';
            sidebarChatName.style.marginTop = isGroup ? '15px' : '';
            sidebarChatName.style.textAlign = isGroup ? 'center' : '';
        }
    }

    renderChatSettings() {
        const body = document.getElementById('chatSettingsBody');
        const footer = document.getElementById('chatSettingsFooter');
        const data = this.chatSettings;
        if (!body || !footer || !data) return;

        if (this.chatSettingsView === 'add') {
            body.innerHTML = `
                <div class="chat-settings-section">
                    <h4>Добавить пользователей</h4>
                    <input type="text" class="chat-settings-search" id="chatSettingsUserSearch" placeholder="Поиск по имени или логину..." oninput="chatManager.filterSettingsUsers(this.value)">
                    <div id="chatSettingsUserPicker"></div>
                </div>`;
            footer.innerHTML = `
                <button class="buttonbase btn-secondary" onclick="chatManager.cancelAddParticipants()">Отмена</button>
                <button class="buttonbase" onclick="chatManager.confirmAddParticipants()">Добавить</button>`;
            this.filterSettingsUsers('');
            return;
        }

        const chat = data.chat || {};
        const pending = this.chatSettingsPending || this.emptyChatSettingsPending();
        const me = (data.participants || []).find(p => p.is_me) || {};
        const isOwner = me.role === 'owner';
        const isAdmin = me.role === 'admin';
        const canManage = isOwner || isAdmin;
        const isSaved = chat.name === 'Избранное';
        const avatarSrc = pending.avatarPreview || (pending.removeAvatar ? null : chat.avatar_uri);
        const avatarHtml = avatarSrc
            ? `<img src="${this.escapeHtml(avatarSrc)}" class="chat-settings-avatar" alt="">`
            : `<div class="chat-settings-avatar"><div class="avatar-letter">${this.escapeHtml((chat.name || 'Ч')[0])}</div></div>`;
        const nameValue = pending.name !== null ? pending.name : (chat.name || '');

        body.innerHTML = `
            <div class="chat-settings-section">
                <h4>О чате</h4>
                <div class="chat-settings-avatar-row">
                    ${avatarHtml}
                    ${isOwner && !isSaved ? `
                        <div class="chat-settings-avatar-actions">
                            <label class="buttonbase btn-secondary"><input type="file" id="chatAvatarInput" accept="image/*" style="display:none;" onchange="chatManager.stageChatAvatar(this.files[0])">Изменить аватар</label>
                            ${avatarSrc ? `<button class="buttonbase btn-secondary" onclick="chatManager.removeChatAvatar()">Удалить</button>` : ''}
                        </div>` : ''}
                </div>
                ${isOwner && !isSaved ? `
                    <label class="chat-settings-field"><span>Название чата</span>
                        <input type="text" id="chatSettingsName" value="${this.escapeHtml(nameValue)}" maxlength="100" oninput="chatManager.stageChatName(this.value)">
                    </label>
                ` : `<div class="chat-settings-hint">Название: ${this.escapeHtml(chat.name || '—')}<br>Ваша роль: ${isOwner ? 'Владелец' : isAdmin ? 'Администратор' : 'Участник'}</div>`}
            </div>

            <div class="chat-settings-section">
                <h4>Участники (${(data.participants || []).length})</h4>
                ${canManage ? `<button class="buttonbase btn-secondary" onclick="chatManager.showAddParticipants()">+ Добавить пользователей</button>` : ''}
                <div style="margin-top:10px;">
                    ${(data.participants || []).map(p => this.renderSettingsParticipant(p)).join('')}
                </div>
            </div>

            <div class="chat-settings-section chat-settings-actions">
                <h4>Действия</h4>
                <button class="buttonbase btn-secondary" onclick="chatManager.${isOwner ? 'deleteChat' : 'leaveChat'}()">
                    ${isOwner ? 'Удалить чат' : 'Покинуть чат'}
                </button>
            </div>`;

        footer.innerHTML = `
            <button class="buttonbase btn-secondary" onclick="chatManager.cancelChatSettings()">Отменить</button>
            <button class="buttonbase" onclick="chatManager.saveChatSettings()">Сохранить</button>`;
    }

    renderSettingsParticipant(p) {
        const roleLabel = p.is_owner ? 'Владелец' : p.role === 'admin' ? 'Администратор' : 'Участник';
        const avatar = p.avatar_uri
            ? `<img src="${this.escapeHtml(p.avatar_uri)}" class="participant-avatar" alt="">`
            : `<div class="participant-avatar avatar-letter">${this.escapeHtml((p.name || '?')[0])}</div>`;
        let actions = '';
        const isOwner = this.chatSettings?.participants?.find(x => x.is_me)?.role === 'owner';
        if (p.is_me) {
            actions = `<span class="chat-settings-role-badge">Вы</span>`;
        } else if (!p.is_owner) {
            actions = `${isOwner ? `
                <button class="buttonbase btn-secondary" onclick="chatManager.toggleParticipantRole(${p.id}, '${p.role === 'admin' ? 'member' : 'admin'}')">${p.role === 'admin' ? 'Разжаловать' : 'Администратор'}</button>
                <button class="buttonbase btn-secondary" onclick="chatManager.transferOwnership(${p.id})">Передать чат</button>` : ''}
                <button class="buttonbase btn-secondary" onclick="chatManager.removeParticipantFromChat(${p.id})">Удалить</button>`;
        }
        return `<div class="chat-settings-participant">
            ${avatar}
            <div class="participant-info"><span class="participant-name">${this.escapeHtml(p.display_name)}</span><span class="participant-role">${roleLabel}</span></div>
            ${actions}
        </div>`;
    }

    stageChatName(value) {
        if (!this.chatSettingsPending) this.chatSettingsPending = this.emptyChatSettingsPending();
        this.chatSettingsPending.name = value;
    }

    stageChatAvatar(file) {
        if (!file || !this.chatSettingsPending) return;
        if (!String(file.type || '').startsWith('image/')) {
            uiAlert('Можно выбрать только изображение');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            this.chatSettingsPending.avatarFile = file;
            this.chatSettingsPending.avatarPreview = String(reader.result);
            this.chatSettingsPending.removeAvatar = false;
            this.renderChatSettings();
        };
        reader.readAsDataURL(file);
    }

    removeChatAvatar() {
        if (!this.chatSettingsPending) this.chatSettingsPending = this.emptyChatSettingsPending();
        this.chatSettingsPending.avatarFile = null;
        this.chatSettingsPending.avatarPreview = null;
        this.chatSettingsPending.removeAvatar = true;
        this.renderChatSettings();
    }

    async sendChatAvatar(file) {
        const fd = new FormData();
        fd.append('avatar', file);
        const token = localStorage.getItem('token');
        const r = await fetch(`/api/chats/${this.currentChatId}/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Ошибка загрузки аватара');
        return data;
    }

    async saveChatSettings() {
        const pending = this.chatSettingsPending || this.emptyChatSettingsPending();
        const initial = this.chatSettingsInitial || this.chatSettings;
        const me = (this.chatSettings?.participants || []).find(p => p.is_me) || {};
        const isOwner = me.role === 'owner';
        const isSaved = initial?.chat?.name === 'Избранное';

        try {
            if (isOwner && !isSaved && pending.name !== null) {
                const name = pending.name.trim();
                if (name && name !== initial.chat.name) {
                    await api.chats.updateSettings(this.currentChatId, { name });
                }
            }
            if (isOwner && !isSaved) {
                if (pending.avatarFile) {
                    await this.sendChatAvatar(pending.avatarFile);
                } else if (pending.removeAvatar && initial.chat.avatar_uri) {
                    await api.chats.updateSettings(this.currentChatId, { avatar_uri: null });
                }
            }
            await this.loadChats();
            await this.refreshChatSettings();
            this.chatSettingsInitial = JSON.parse(JSON.stringify(this.chatSettings));
            this.chatSettingsPending = this.emptyChatSettingsPending();
            this.renderChatSettings();
            if (typeof showToast === 'function') showToast('Изменения сохранены', 'success');
        } catch (e) {
            await uiAlert('Не удалось сохранить изменения: ' + e.message);
        }
    }

    cancelChatSettings() {
        this.chatSettings = JSON.parse(JSON.stringify(this.chatSettingsInitial || this.chatSettings));
        this.chatSettingsPending = this.emptyChatSettingsPending();
        this.chatSettingsView = 'main';
        this.renderChatSettings();
    }

    async toggleParticipantRole(userId, role) {
        try {
            await api.chats.setParticipantRole(this.currentChatId, userId, role);
            await this.refreshChatSettings();
        } catch (e) { await uiAlert(e.message); }
    }

    async transferOwnership(userId) {
        if (!await uiConfirm('Передать владение чатом этому участнику? Ваша роль станет «Участник».')) return;
        try {
            await api.chats.setOwner(this.currentChatId, userId);
            await this.refreshChatSettings();
        } catch (e) { await uiAlert(e.message); }
    }

    async removeParticipantFromChat(userId) {
        if (!await uiConfirm('Удалить пользователя из чата?')) return;
        try {
            await api.chats.removeParticipant(this.currentChatId, userId);
            await this.refreshChatSettings();
            await this.loadChats();
        } catch (e) { await uiAlert(e.message); }
    }

    async showAddParticipants() {
        try {
            const result = await api.users.getAll();
            const users = result.users || result || [];
            const existing = new Set((this.chatSettings?.participants || []).map(p => p.id));
            this.chatSettingsUsers = users.filter(u => !existing.has(u.id));
        } catch (e) {
            await uiAlert(e.message);
            return;
        }
        this.chatSettingsView = 'add';
        this.renderChatSettings();
    }

    cancelAddParticipants() {
        this.chatSettingsView = 'main';
        this.renderChatSettings();
    }

    filterSettingsUsers(query) {
        const container = document.getElementById('chatSettingsUserPicker');
        if (!container) return;
        const q = String(query || '').toLowerCase().trim();
        const users = (this.chatSettingsUsers || []).filter(u =>
            !q || `${u.surname} ${u.name} ${u.username} ${u.email}`.toLowerCase().includes(q)
        );
        container.innerHTML = users.length
            ? users.map(u => `<label class="chat-settings-user-row">
                <input type="checkbox" value="${u.id}">
                <span>${this.escapeHtml(`${u.surname || ''} ${u.name || ''}`.trim())} <span class="chat-settings-hint">(${this.escapeHtml(u.username || '')})</span></span>
              </label>`).join('')
            : `<div class="chat-settings-hint">Пользователи не найдены</div>`;
    }

    async confirmAddParticipants() {
        const ids = [...document.querySelectorAll('#chatSettingsUserPicker input:checked')].map(i => Number(i.value));
        if (!ids.length) {
            await uiAlert('Выберите хотя бы одного пользователя');
            return;
        }
        try {
            await api.chats.addParticipants(this.currentChatId, ids);
            this.chatSettingsView = 'main';
            await this.refreshChatSettings();
            await this.loadChats();
        } catch (e) { await uiAlert(e.message); }
    }

    async leaveChat() {
        if (!await uiConfirm('Покинуть чат?')) return;
        try {
            await api.chats.removeParticipant(this.currentChatId, window.currentUser.id);
            this.closeChatSettings();
            this.resetChatView();
            await this.loadChats();
        } catch (e) { await uiAlert(e.message); }
    }

    async deleteChat() {
        if (!await uiConfirm('Удалить чат? Сообщения и участники будут удалены.')) return;
        try {
            await api.chats.deleteChat(this.currentChatId);
            this.closeChatSettings();
            this.resetChatView();
            await this.loadChats();
        } catch (e) { await uiAlert(e.message); }
    }

}
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// На странице чата base.js не подключён — создаём локальный showToast, если его нет
if (typeof window.showToast !== 'function') {
    window.showToast = function(message, type = 'info') {
        const normalizedType = ['success', 'error', 'warning'].includes(type) ? type : 'info';
        const icons = {
            success: '/materials/icons8-успех-96.png',
            error: '/materials/icons8-ошибка-96.png',
            warning: '/materials/icons8-предупреждение-96.png',
            info: '/materials/icons8-информация-96.png'
        };
    
        document.querySelectorAll('.toast-notification').forEach(oldToast => oldToast.remove());
    
        const toast = document.createElement('div');
        toast.className = `toast-notification ${normalizedType}`;
        toast.setAttribute('role', normalizedType === 'error' ? 'alert' : 'status');
        toast.innerHTML = `
            <span class="toast-icon-container ${normalizedType}">
                <img src="${icons[normalizedType]}" class="toast-icon" alt="">
            </span>
            <span class="toast-message"></span>
        `;
        toast.querySelector('.toast-message').textContent = message;
    
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };
}

// Инициализация при загрузке страницы
let chatManager;
document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
    window.chatManager = chatManager;
});
function closeConfirmDeleteModal() {
        if (chatManager) chatManager.closeConfirmDeleteModal();
    }
