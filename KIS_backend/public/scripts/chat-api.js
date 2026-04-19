// Управление чатами на фронтенде
class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.chats = [];
        this.messages = [];
        this.files = [];      // Добавляем
        this.images = [];     // Добавляем
        this.ws = null;
        this.init();
        this.editingMessageId = null;
        this.editingOriginalContent = '';
        this.pendingAttachments = [];

    }
    
    async init() {
        await this.loadCurrentUser();
        this.resetChatView();
        await this.loadFolders();
        await this.loadChats();
        this.initEventListeners();
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
        
        try {
            const result = await api.chats.sendMessage(chatId, content);
            if (result.success) {
                await this.loadMessages(chatId);
                await this.loadChats();  // ← Здесь оставляем
            }
        } catch (error) {
            console.error('Failed to send message:', error);
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
        console.log('WebSocket disabled for debugging');
        return;
        // const token = localStorage.getItem('token');
        // if (!token) return;
        
        // this.ws = new WebSocket(`ws://localhost:3000?token=${token}`);
        
        // this.ws.onopen = () => {
        //     console.log('WebSocket connected');
        //     // Присоединяемся ко всем чатам
        //     if (this.chats.length > 0) {
        //         this.ws.send(JSON.stringify({
        //             type: 'join-chats',
        //             chatIds: this.chats.map(c => c.id)
        //         }));
        //     }
        // };
        
        // this.ws.onmessage = (event) => {
        //     const data = JSON.parse(event.data);
        //     this.handleWebSocketMessage(data);
        // };
        
        // this.ws.onerror = (error) => {
        //     console.error('WebSocket error:', error);
        // };
        
        // this.ws.onclose = () => {
        //     console.log('WebSocket disconnected');
        //     // Попытка переподключения через 5 секунд
        //     setTimeout(() => this.initWebSocket(), 5000);
        // };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'new-message':
                if (data.message.chat_id === this.currentChatId) {
                    this.messages.push(data.message);
                    this.renderMessages();
                    this.markAsRead(this.currentChatId);
                }
                // ОБЯЗАТЕЛЬНО: обновляем список чатов, чтобы показать последнее сообщение
                this.loadChats();  // ← добавить await
                break;
                
            case 'message-edited':
                if (data.messageId) {
                    const msg = this.messages.find(m => m.id === data.messageId);
                    if (msg) {
                        msg.content = data.content;
                        msg.is_edited = true;
                        this.renderMessages();
                    }
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
                }
                break;
                
            case 'user-typing':
                this.showTypingIndicator(data.userId, data.isTyping);
                break;
        }
    }
    
    // Отрисовка списка чатов
    renderChatList() {
        const chatListContainer = document.querySelector('.chat-list-elements');
        if (!chatListContainer) return;
        
        if (this.chats.length === 0) {
            chatListContainer.innerHTML = '<div class="empty-chats">У вас пока нет чатов</div>';
            return;
        }
        
        chatListContainer.innerHTML = this.chats.map(chat => {
            // Для личного чата - берем имя собеседника
            let avatarHtml;
            let displayName = chat.name || 'Чат';
            
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
                        <div class="chat-list-element" 
                            data-chat-id="${chat.id}" 
                            onclick="chatManager.openChat(${chat.id}, '${this.escapeHtml(displayName)}')"
                            oncontextmenu="chatManager.showChatContextMenu(event, ${chat.id}, '${this.escapeHtml(displayName)}')">
                            <div class="chat-list-element-icon">
                                ${avatarHtml}
                            </div>
                            <div class="chat-list-element-info">
                                <div class="chat-list-element-header">${this.escapeHtml(displayName)}</div>
                                <div class="chat-list-element-lasttxt">${this.formatLastMessage(chat.last_message)}</div>
                            </div>
                            ${chat.unread_count > 0 ? `<div class="chat-list-element-notifications">${chat.unread_count}</div>` : ''}
                        </div>
                    `;
                }).join('');
    }
    formatLastMessage(message) {
        if (!message) return 'Нет сообщений';
        if (message.content && message.content.startsWith('📷')) return '📷 Фото';
        if (message.content && message.content.startsWith('📎')) return '📎 Файл';
        return this.escapeHtml(message.content.substring(0, 40));
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
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">💬 Нет сообщений<br>Напишите что-нибудь...</div>';
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
            
            if (isImage) {
                const imageUrl = msg.content.split('\n')[1];
                contentHtml = `<img src="${imageUrl}" class="message-image" onclick="chatManager.openImageViewer('${imageUrl}')" loading="lazy">`;
            } else if (isFile) {
                const lines = msg.content.split('\n');
                const fileName = lines[0].replace('📎 ', '');
                const fileUrl = lines[1] || '';
                contentHtml = `
                    <div class="message-file" onclick="chatManager.downloadFile('${fileUrl}', '${fileName}')">
                        <span class="file-icon">📎</span>
                        <span class="file-name">${this.escapeHtml(fileName)}</span>
                    </div>
                `;
            } else {
                const formattedText = this.formatLinks(this.escapeHtml(msg.content));
                contentHtml = `<div class="message-text">${formattedText}</div>`;
            }
            
            // Аватар для чужих сообщений
            const avatarHtml = !isOwn ? this.getAvatar(msg.avatar_uri, msg.name, msg.surname) : '';
            
            html += `
                <div class="message ${isOwn ? 'sent' : 'received'}" data-message-id="${msg.id}" data-message-user="${msg.user_id}" data-message-content="${this.escapeHtml(msg.content)}">
                    <div class="message-content">
                        ${!isOwn ? `
                            <div class="message-av-container">
                                <div class="message-avatar" style="width: 50px; height: 50px;">${avatarHtml}</div>
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
        
        let menuItems = '';
        
        if (isOwn) {
            menuItems += `
                <div class="context-menu-item" onclick="chatManager.startEditing(${messageId}, '${this.escapeHtml(content).replace(/'/g, "\\'")}')">
                    ✏️ Редактировать
                </div>
                <div class="context-menu-item" onclick="chatManager.deleteMessage(${messageId})">
                    🗑️ Удалить
                </div>
            `;
        } else {
            menuItems += `
                <div class="context-menu-item" onclick="chatManager.reportMessage(${messageId})">
                    ⚠️ Пожаловаться
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
    // Редактирование сообщения (через модалку)
    async editMessage(messageId, oldContent) {
        this.closeContextMenu();
        const modal = document.getElementById('editMessageModal');
        const textarea = document.getElementById('editMessageInput');
        const saveBtn = document.getElementById('saveEditBtn');
        
        textarea.value = oldContent;
        modal.style.display = 'flex';
        
        const saveHandler = async () => {
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
                    alert('Ошибка редактирования');
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
                alert('Ошибка редактирования');
            }
        } catch (error) {
            console.error('Edit error:', error);
        }
    }
    // Жалоба (через модалку)
    async reportMessage(messageId) {
        this.closeContextMenu();
        const modal = document.getElementById('reportMessageModal');
        const textarea = document.getElementById('reportReasonInput');
        const sendBtn = document.getElementById('sendReportBtn');
        
        textarea.value = '';
        modal.style.display = 'flex';
        
        const sendHandler = async () => {
            const reason = textarea.value.trim();
            if (!reason) {
                alert('Укажите причину жалобы');
                return;
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
                
                if (response.ok) {
                    alert('Жалоба отправлена администратору');
                    closeReportModal();
                } else {
                    alert('Ошибка отправки жалобы');
                }
            } catch (error) {
                console.error('Report error:', error);
            }
        };
        
        sendBtn.onclick = sendHandler;
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



    // Метод для открытия просмотра изображения
    openImageViewer(url) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:10px;object-fit:contain;">`;
        document.body.appendChild(modal);
    }



    async markAsRead(chatId) {
        try {
            await fetch(`${API_URL}/chats/${chatId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            // Убираем this.loadChats() отсюда
            // this.loadChats();
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
                chatId,
                isTyping
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
        const messageInput = document.querySelector('.message-input');
        if (messageInput) {
            const newMessageInput = messageInput.cloneNode(true);
            messageInput.parentNode.replaceChild(newMessageInput, messageInput);
            
            newMessageInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const text = newMessageInput.value.trim();
                    
                    if (text || this.pendingAttachments.length > 0) {
                        await this.sendMessageWithAttachments(this.currentChatId, text);
                        newMessageInput.value = '';
                    }
                }
            });
            
            window.messageInput = newMessageInput;
        }
        // Контекстное меню для папок
        document.addEventListener('contextmenu', (e) => {
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
            
            fileInput.addEventListener('change', async (e) => {
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
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        
        document.getElementById('createChatSubmitBtn').onclick = async () => {
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
            messageInput.addEventListener('keypress', (e) => {
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
            alert('Выберите хотя бы одного пользователя');
            return;
        }
        
        let chatId;
        
        if (this.isGroupMode()) {
            const groupName = document.getElementById('groupNameInput').value.trim();
            if (!groupName) {
                alert('Введите название группы');
                return;
            }
            const result = await api.chats.create(selectedUserIds, groupName, true);
            chatId = result.chatId;
        } else {
            if (selectedUserIds.length > 1) {
                alert('Для личного чата выберите только одного пользователя');
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
    getAvatar(source, name, surname = '') {
        // Если есть URL аватара - используем его
        if (source && source !== 'null' && source !== 'undefined' && source !== '') {
            return `<img src="${source}" alt="avatar" onerror="this.onerror=null; this.parentElement.innerHTML = this.parentElement.getAvatarFallback('${name}', '${surname}')">`;
        }
        
        // Если нет - генерируем букву
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
        
        return `<div class="avatar-letter">${letter.toUpperCase()}</div>`;
    }

    // Для групповых чатов
    getGroupAvatar(chat) {
        if (chat.avatar_uri && chat.avatar_uri !== 'null' && chat.avatar_uri !== '') {
            return `<img src="${chat.avatar_uri}" alt="group" onerror="this.onerror=null; this.parentElement.innerHTML = '<div class=\"avatar-letter\">👥</div>'">`;
        }
        return `<div class="avatar-letter">👥</div>`;
    }
   // Сброс состояния (когда чат не выбран)
    resetChatView() {
        const chatContent = document.querySelector('.chat-content');
        if (chatContent) {
            chatContent.classList.add('no-chat-selected');
        }
        
        // Скрываем кнопку "Назад"
        const backBtn = document.getElementById('backToChatsBtn');
        if (backBtn) {
            backBtn.style.display = 'none';
        }
        
        // СКРЫВАЕМ САЙДБАР ПОЛНОСТЬЮ (вместе с медиа)
        const chatSidebar = document.getElementById('chatSidebar');
        if (chatSidebar) {
            chatSidebar.style.display = 'none';
        }
        
        // Сбрасываем заголовок
        const chatNameHeader = document.querySelector('.chat-name');
        if (chatNameHeader) chatNameHeader.textContent = 'Выберите чат';
        
        // Сбрасываем аватары
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
        
        // Показываем заголовок участников (восстанавливаем для групп)
        const participantsHeader = document.querySelector('.sidebar-section h3');
        if (participantsHeader) {
            participantsHeader.textContent = 'Участники (0)';
            participantsHeader.style.display = 'block';
        }
        
        // Восстанавливаем список участников
        const userList = document.getElementById('userList');
        if (userList) {
            userList.innerHTML = '';
            userList.style.display = 'block';
        }
        
        // Очищаем сообщения и показываем заглушку
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="empty-chat-placeholder">
                    <div class="empty-icon">💬</div>
                    <h3>Выберите чат</h3>
                    <p>Нажмите на чат в списке слева, чтобы начать общение</p>
                </div>
            `;
        }
        
        // Скрываем поле ввода
        const chatInput = document.querySelector('.chat-input');
        if (chatInput) chatInput.style.display = 'none';
        
        this.currentChatId = null;
    }

    // Открытие чата и загрузка сообщений
    async openChat(chatId, chatName) {
        console.log('Opening chat:', chatId, chatName);
        this.lastOpenedChatId = chatId;
        this.lastOpenedChatName = chatName;
        // === ОЧИЩАЕМ ПЕРЕД ЗАГРУЗКОЙ НОВОГО ЧАТА ===
        // Очищаем список участников
        const userListContainer = document.getElementById('userList');
        if (userListContainer) {
            userListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Загрузка...</div>';
            userListContainer.style.display = 'block';
        }
        
        // Сбрасываем счетчик участников
        const participantsCountSpan = document.getElementById('participantsCount');
        if (participantsCountSpan) {
            participantsCountSpan.textContent = '0';
        }
        
        // Показываем заголовок участников (по умолчанию)
        const participantsHeader = document.querySelector('.sidebar-section h3');
        if (participantsHeader) {
            participantsHeader.style.display = 'block';
        }
        // === КОНЕЦ ОЧИСТКИ ===
        
        // Показываем контент чата
        const chatContent = document.querySelector('.chat-content');
        if (chatContent) {
            chatContent.classList.remove('no-chat-selected');
        }
        
        // Показываем кнопку "Назад"
        const backBtn = document.getElementById('backToChatsBtn');
        if (backBtn) {
            backBtn.style.display = 'flex';
        }
        
        // Показываем сайдбар
        const chatSidebar = document.getElementById('chatSidebar');
        if (chatSidebar) {
            chatSidebar.style.display = 'block';
        }
        
        // Загружаем информацию о чате
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chats/${chatId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const chat = data.chat;
            
            const isGroup = chat.is_group;
            
            // Обновляем заголовок и аватар в шапке
            const chatNameHeader = document.querySelector('.chat-name');
            const chatAvatar = document.querySelector('.chat-avatar');
            const sidebarAvatar = document.querySelector('.sidebar-avatar');
            const sidebarChatName = document.querySelector('.sidebar-chatname');
            
            if (isGroup) {
                // === ГРУППОВОЙ ЧАТ ===
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
                
                // Показываем и заполняем список участников
                if (participantsHeader) {
                    participantsHeader.style.display = 'block';
                }
                if (userListContainer) {
                    userListContainer.style.display = 'block';
                }
                
                // Загружаем участников
                await this.loadChatParticipants(chatId);
                
            } else {
                // === ЛИЧНЫЙ ЧАТ ===
                const otherUser = chat.participants?.find(p => p.id !== window.currentUser?.id);
                if (otherUser) {
                    const displayName = `${otherUser.surname} ${otherUser.name}`;
                    chatNameHeader.textContent = displayName;
                    
                    const avatarHtml = this.getAvatar(otherUser.avatar_uri, otherUser.name, otherUser.surname);
                    if (chatAvatar) {
                        chatAvatar.outerHTML = `<div class="chat-avatar" style="width: 50px; height: 50px;">${avatarHtml}</div>`;
                    }
                    
                    // Заполняем сайдбар для личного чата
                    if (sidebarAvatar) {
                        sidebarAvatar.outerHTML = `<div class="sidebar-avatar" style="width: 170px; height: 170px;">${avatarHtml}</div>`;
                    }
                    if (sidebarChatName) {
                        sidebarChatName.textContent = displayName;
                        sidebarChatName.style.fontSize = '24px';
                        sidebarChatName.style.fontWeight = 'bold';
                        sidebarChatName.style.marginTop = '15px';
                        sidebarChatName.style.textAlign = 'center';
                    }
                }
                
                // Скрываем заголовок и список участников для личного чата
                if (participantsHeader) {
                    participantsHeader.style.display = 'none';
                }
                if (userListContainer) {
                    userListContainer.innerHTML = '';
                    userListContainer.style.display = 'none';
                }
            }
            
        } catch (error) {
            console.error('Failed to load chat info:', error);
        }
        
        // Показываем индикатор загрузки
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Загрузка сообщений...</div>';
        }
        
        // Загружаем сообщения
        await this.loadMessages(chatId);
        // После загрузки сообщений и участников
        await this.loadChatMedia(chatId);
        
        // Показываем поле ввода
        const chatInput = document.querySelector('.chat-input');
        if (chatInput) chatInput.style.display = 'flex';
    }

    // Отрисовка списка участников (только для групп)
    renderParticipants(participants) {
        const userList = document.getElementById('userList');
        if (!userList) return;
        
        const participantsCountSpan = document.getElementById('participantsCount');
        if (participantsCountSpan) {
            participantsCountSpan.textContent = participants.length;
        }
        
        if (participants.length === 0) {
            userList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Нет участников</div>';
            return;
        }
        
        const currentUserId = window.currentUser?.id;
        
        userList.innerHTML = participants.map(user => {
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
                <div class="grid-image-item" onclick="chatManager.openImageViewer('${imageUrl}')">
                    <img src="${imageUrl}" alt="${imageName}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
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
                    <span class="file-icon">📄</span> ${this.escapeHtml(file.name || file.file_name)}
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
    getAvatar(avatarUri, name, surname) {
        if (avatarUri && avatarUri !== 'null' && avatarUri !== '') {
            return `<img src="${avatarUri}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML = this.parentElement.getAvatarFallback('${name}', '${surname}')">`;
        }
        return this.getAvatarFallback(name, surname);
    }

    // Заглушка аватара с буквой
    getAvatarFallback(name, surname) {
        let letter = '';
        if (name && name.length > 0) {
            letter = name.charAt(0);
        } else if (surname && surname.length > 0) {
            letter = surname.charAt(0);
        } else {
            letter = '?';
        }
        return `<div class="avatar-letter" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:600;color:var(--c_acc, #5194ff);text-transform:uppercase;">${letter.toUpperCase()}</div>`;
    }

    // Для групповых чатов
    getGroupAvatar(chat) {
        if (chat.avatar_uri && chat.avatar_uri !== 'null' && chat.avatar_uri !== '') {
            return `<img src="${chat.avatar_uri}" alt="group"  onerror="this.onerror=null; this.parentElement.innerHTML = '<div class=\"avatar-letter\">👥</div>'">`;
        }
        return `<div class="avatar-letter" >👥</div>`;
    }


    // Скачивание файла из сообщения (ищем файл в медиа)
    async downloadFileFromMessage(fileName) {
        // Ищем файл в загруженных медиа
        const file = this.files.find(f => f.name === fileName);
        if (file && file.url) {
            this.downloadFile(file.url, fileName);
        } else {
            alert(`Файл "${fileName}" не найден на сервере`);
        }
    }
    // Загрузка файла
    async uploadFile(chatId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`/api/chats/${chatId}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Upload failed: ${error}`);
        }
        
        const result = await response.json();
        console.log('Upload result:', result);
        // Убираем строки с tempId, они уже обработаны в обработчике fileInput
        return result;
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
        // Отправляем текст (если есть)
        if (text && text.trim()) {
            await this.sendMessage(chatId, text);
        }
        
        // Отправляем файлы из очереди
        for (const file of this.pendingAttachments) {
            await this.uploadFile(chatId, file);
        }
        
        // Очищаем очередь
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
        confirmBtn.onclick = async () => {
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
                alert('Ошибка удаления');
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
        const name = prompt('Введите название папки:');
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
            alert('Ошибка создания папки');
        }
    }

    // Редактирование папки
    async editFolder(folderId, currentName) {
        const newName = prompt('Введите новое название папки:', currentName);
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
            alert('Ошибка переименования папки');
        }
    }

    // Удаление папки
    async deleteFolder(folderId) {
        // if (!confirm('Удалить эту папку? Чаты не будут удалены.')) return;
        
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
            alert('Ошибка удаления папки');
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
        
        newConfirmBtn.onclick = async () => {
            const name = input.value.trim();
            if (!name) {
                alert('Введите название папки');
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
            alert('Ошибка создания папки');
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
        
        newConfirmBtn.onclick = async () => {
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
        
        newConfirmBtn.onclick = async () => {
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
            alert('Ошибка переименования папки');
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
            <div class="context-menu-item" onclick="chatManager.showEditFolderModal(${folderId}, '${this.escapeHtml(folderName)}')">
                ✏️ Переименовать
            </div>
            <div class="context-menu-item" onclick="chatManager.showDeleteFolderModal(${folderId})">
                🗑️ Удалить
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
                📁 Переместить в папку
            </div>
        `;
        
        // Добавляем пункт "Все чаты" (убрать из папки)
        menuItems += `
            <div class="context-menu-item" onclick="chatManager.moveChatToFolder(${chatId}, null)">
                📬 Все чаты
            </div>
        `;
        
        // Добавляем все папки пользователя
        for (const folder of folders) {
            menuItems += `
                <div class="context-menu-item" onclick="chatManager.moveChatToFolder(${chatId}, ${folder.id})">
                    📁 ${this.escapeHtml(folder.name)}
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
            alert('Ошибка перемещения чата');
        }
    }



    
    closeEditFolderModal() {
        document.getElementById('editFolderModal').style.display = 'none';
    }

    closeDeleteFolderModal() {
        document.getElementById('deleteFolderModal').style.display = 'none';
    }
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

