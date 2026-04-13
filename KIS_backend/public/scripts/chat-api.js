// Управление чатами на фронтенде
class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.chats = [];
        this.messages = [];
        this.ws = null;
        this.init();
    }
    
    async init() {
        // Загружаем текущего пользователя
        await this.loadCurrentUser();
        
        // Сбрасываем вид (чат не выбран)
        this.resetChatView();
        
        await this.loadChats();
        // this.initWebSocket();
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
                await this.loadChats();  // ← добавить эту строку
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
                <div class="chat-list-element" data-chat-id="${chat.id}" onclick="chatManager.openChat(${chat.id}, '${this.escapeHtml(displayName)}')">
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
    // Отрисовка сообщений
    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        console.log('Rendering messages, count:', this.messages.length);
        
        if (!this.messages || this.messages.length === 0) {
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">💬 Нет сообщений<br>Напишите что-нибудь...</div>';
            return;
        }
        
        const currentUserId = window.currentUser?.id;
        console.log('Current user ID:', currentUserId);
        
        let html = '';
        
        for (const msg of this.messages) {
            const isOwn = msg.user_id === currentUserId;
            
            // Проверяем тип сообщения
            const isImage = msg.content && msg.content.startsWith('📷');
            const isFile = msg.content && msg.content.startsWith('📎');
            
            let contentHtml = '';
            
            if (isImage) {
                const imageUrl = msg.content.split('\n')[1];
                contentHtml = `<img src="${imageUrl}" class="message-image" onclick="chatManager.openImageViewer('${imageUrl}')" loading="lazy">`;
            } else if (isFile) {
                const fileName = msg.content.replace('📎 *файл*: ', '');
                contentHtml = `
                    <div class="message-file" onclick="chatManager.downloadFileFromMessage('${fileName}')">
                        <span class="file-icon">📎</span>
                        <span class="file-name">${this.escapeHtml(fileName)}</span>
                    </div>
                `;
            } else {
                contentHtml = `<div class="message-text">${this.escapeHtml(msg.content)}</div>`;
            }
            
            // Аватар для чужих сообщений
            const avatarHtml = !isOwn ? this.getAvatar(msg.avatar_uri, msg.name, msg.surname) : '';
            
            html += `
                <div class="message ${isOwn ? 'sent' : 'received'}">
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
    // Вспомогательный метод для скачивания файла из сообщения
    downloadFileFromMessage(content) {
        // Извлекаем имя файла из сообщения
        const fileName = content.replace('📎 *файл*: ', '');
        // Здесь нужно реализовать логику скачивания файла по имени
        // Пока просто показываем уведомление
        alert(`Скачивание файла: ${fileName}\n(Функция в разработке)`);
    }

    // Метод для открытия просмотра изображения
    openImageViewer(url) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:10px;object-fit:contain;">`;
        document.body.appendChild(modal);
    }

    // Вспомогательный метод для скачивания файла из сообщения
    downloadFileFromMessage(content) {
        // Извлекаем имя файла из сообщения
        const fileName = content.replace('📎 *файл*: ', '');
        // Здесь нужно реализовать логику скачивания файла по имени
        // Пока просто показываем уведомление
        alert(`Скачивание файла: ${fileName}\n(Функция в разработке)`);
    }

    // Метод для открытия просмотра изображения
    openImageViewer(url) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:10px;object-fit:contain;">`;
        document.body.appendChild(modal);
    }
    downloadFile(url, fileName) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    // Отметка о прочтении
    async markAsRead(chatId) {
        try {
            await fetch(`${API_URL}/chats/${chatId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            this.loadChats(); // Обновляем счетчики
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
    // Открытие чата и загрузка сообщений
    async openChat(chatId, chatName) {
        console.log('Opening chat:', chatId, chatName);
        
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
            const participantsHeader = document.querySelector('.sidebar-section h3');
            const userListContainer = document.getElementById('userList');
            
            if (isGroup) {
                // Групповой чат
                chatNameHeader.textContent = chat.name || 'Групповой чат';
                if (chatAvatar) {
                    chatAvatar.outerHTML = `<div class="chat-avatar" style="width: 50px; height: 50px;">${this.getGroupAvatar(chat)}</div>`;
                }
                if (sidebarAvatar) {
                    sidebarAvatar.outerHTML = `<div class="sidebar-avatar" style="width: 170px; height: 170px;">${this.getGroupAvatar(chat)}</div>`;
                }
                if (sidebarChatName) sidebarChatName.textContent = chat.name || 'Групповой чат';
                
                // Показываем заголовок "Участники" и список участников
                if (participantsHeader) {
                    participantsHeader.textContent = `Участники (${chat.participants?.length || 0})`;
                    participantsHeader.style.display = 'block';
                }
                
                // Загружаем список участников
                await this.loadChatParticipants(chatId);
                
            } else {
                // Личный чат - берем данные собеседника
                const otherUser = chat.participants?.find(p => p.id !== window.currentUser?.id);
                if (otherUser) {
                    const displayName = `${otherUser.surname} ${otherUser.name}`;
                    chatNameHeader.textContent = displayName;
                    
                    const avatarHtml = this.getAvatar(otherUser.avatar_uri, otherUser.name, otherUser.surname);
                    if (chatAvatar) {
                        chatAvatar.outerHTML = `<div class="chat-avatar" style="width: 50px; height: 50px;">${avatarHtml}</div>`;
                    }
                    if (sidebarAvatar) {
                        sidebarAvatar.outerHTML = `<div class="sidebar-avatar" style="width: 170px; height: 170px;">${avatarHtml}</div>`;
                    }
                    if (sidebarChatName) sidebarChatName.textContent = displayName;
                }
                
                // Скрываем заголовок "Участники" и список участников
                if (participantsHeader) {
                    participantsHeader.style.display = 'none';
                }
                if (userListContainer) {
                    userListContainer.innerHTML = '';
                }
            }
            
        } catch (error) {
            console.error('Failed to load chat info:', error);
        }
        await this.loadChatMedia(chatId);
        // Показываем индикатор загрузки
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Загрузка сообщений...</div>';
        }
        
        // Загружаем сообщения
        await this.loadMessages(chatId);
        
        // Показываем поле ввода
        const chatInput = document.querySelector('.chat-input');
        if (chatInput) chatInput.style.display = 'flex';
    }
    initEventListeners() {
        // Отправка сообщения по Enter
        const messageInput = document.querySelector('.message-input');
        const sendBtn = document.querySelector('.send-btn');
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
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.currentChatId) {
                        this.sendMessage(this.currentChatId, messageInput.value);
                        messageInput.value = '';
                    }
                }
            });
            
            // Индикатор набора текста
            let typingTimeout;
            messageInput.addEventListener('input', () => {
                if (this.currentChatId) {
                    this.sendTyping(this.currentChatId, true);
                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        this.sendTyping(this.currentChatId, false);
                    }, 1000);
                }
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (this.currentChatId && messageInput) {
                    this.sendMessage(this.currentChatId, messageInput.value);
                    messageInput.value = '';
                }
            });
        }
        const attachBtn = document.querySelector('.tool-btn');
        const fileInput = document.getElementById('fileInput');

        attachBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            for (const file of e.target.files) {
                if (file.type.startsWith('image/')) {
                    // Показываем превью в чате
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.sendMessage(this.currentChatId, `📷 *изображение*\n${e.target.result}`);
                    };
                    reader.readAsDataURL(file);
                } else {
                    this.sendMessage(this.currentChatId, `📎 *файл*: ${file.name}`);
                }
            }
            fileInput.value = '';
        });
        const mediaBtns = document.querySelectorAll('.sidebar-media-group-btn');
        const mediaGroups = document.querySelectorAll('.media-group');

        mediaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Убираем активный класс у всех кнопок
                mediaBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Получаем тип медиа
                const mediaType = this.dataset.media;
                
                // Скрываем все группы
                mediaGroups.forEach(group => group.classList.remove('active'));
                
                // Показываем нужную группу
                if (mediaType === 'files') {
                    document.querySelector('.sidebar-media-group-files')?.classList.add('active');
                } else if (mediaType === 'images') {
                    document.querySelector('.sidebar-media-group-images')?.classList.add('active');
                } else if (mediaType === 'links') {
                    document.querySelector('.sidebar-media-group-links')?.classList.add('active');
                }
            });
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
    // Загрузка и отображение медиа чата
    // Загрузка медиа чата
    async loadChatMedia(chatId) {
        try {
            const token = localStorage.getItem('token');
            const timestamp = Date.now();
            
            const response = await fetch(`/api/chats/${chatId}/media?_=${timestamp}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load media');
            
            const data = await response.json();
            
            // Отображаем файлы в секции "Файлы"
            this.renderFiles(data.files || []);
            
            // Отображаем изображения в секции "Изображения"
            this.renderImages(data.images || []);
            
        } catch (error) {
            console.error('Failed to load media:', error);
        }
    }

    // Отрисовка файлов в сайдбаре
    renderFiles(files) {
        const filesContainer = document.querySelector('.sidebar-media-group-files .media-files');
        if (!filesContainer) return;
        
        if (files.length === 0) {
            filesContainer.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">Нет файлов</td></tr>';
            return;
        }
        
        filesContainer.innerHTML = files.map(file => `
            <tr class="media-files-element" onclick="chatManager.downloadFile('${file.url}', '${file.name}')">
                <td class="media-files-element-name">
                    <span class="file-icon">📄</span> ${this.escapeHtml(file.name)}
                </td>
                <td class="media-files-element-size">${file.size || '—'}</td>
                <td class="media-files-element-senddate">${this.formatDate(file.date)}</td>
            </tr>
        `).join('');
    }

    // Отрисовка изображений в сайдбаре
    renderImages(images) {
        const imagesContainer = document.querySelector('.sidebar-media-group-images');
        if (!imagesContainer) return;
        
        if (images.length === 0) {
            imagesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Нет изображений</div>';
            return;
        }
        
        // Группируем изображения по датам
        const grouped = {};
        for (const img of images) {
            const date = img.date || 'другое';
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(img);
        }
        
        let html = '';
        for (const [date, imgs] of Object.entries(grouped)) {
            html += `<div class="media-date-header">${date === 'другое' ? 'Прочее' : date}</div>`;
            html += `<div class="images-grid">`;
            for (const img of imgs) {
                html += `
                    <div class="grid-image-item" onclick="chatManager.openImageViewer('${img.url}')">
                        <img src="${img.url}" alt="${img.name}" loading="lazy">
                    </div>
                `;
            }
            html += `</div>`;
        }
        
        imagesContainer.innerHTML = html;
    }

    // Скачивание файла
    downloadFile(url, fileName) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    openImageViewer(url) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:10px;">`;
        document.body.appendChild(modal);
    }
    // Отрисовка файлов
    renderFiles(files) {
        const filesContainer = document.querySelector('.sidebar-media-group-files .media-files');
        if (!filesContainer) return;
        
        if (files.length === 0) {
            filesContainer.innerHTML = '<div style="padding: 20px; text-align: center;">Нет файлов</div>';
            return;
        }
        
        filesContainer.innerHTML = files.map(file => `
            <tr class="media-files-element" onclick="chatManager.downloadFile('${file.url}')">
                <th class="media-files-element-name">
                    <span class="file-icon">📄</span> ${file.name}
                </th>
                <th class="media-files-element-size">${file.size}</th>
                <th class="media-files-element-senddate">${file.date}</th>
            </tr>
        `).join('');
    }

    // Отрисовка изображений
    renderImages(images) {
        const imagesContainer = document.querySelector('.sidebar-media-group-images');
        if (!imagesContainer) return;
        
        if (images.length === 0) {
            imagesContainer.innerHTML = '<div style="padding: 20px; text-align: center;">Нет изображений</div>';
            return;
        }
        
        imagesContainer.innerHTML = `
            <div class="images-grid">
                ${images.map(img => `
                    <div class="grid-image-item" onclick="chatManager.openImage('${img.url}')">
                        <img src="${img.url}" alt="${img.name}">
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Скачивание файла
    downloadFile(url) {
        window.open(url, '_blank');
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

    // Открытие просмотра изображения
    openImageViewer(url) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:10px;object-fit:contain;">`;
        document.body.appendChild(modal);
    }

    // Скачивание файла из сообщения
    downloadFileFromMessage(fileName) {
        alert(`Скачивание файла: ${fileName}\n(Функция в разработке)`);
        this.downloadFile()
    }
}

// Инициализация при загрузке страницы
let chatManager;
document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
    window.chatManager = chatManager;
});