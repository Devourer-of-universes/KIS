// ========== settings.js - ПОЛНАЯ ВЕРСИЯ ==========

// Глобальные переменные
let currentUser = null;

// ========== 1. ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ==========
async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/html/login.html';
            return;
        }

        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = '/html/login.html';
            return;
        }

        const data = await response.json();
        currentUser = data.user;
        
        // Заполняем все поля профиля
        fillProfileData(currentUser);
        
        // Загружаем настройки уведомлений из БД
        loadNotificationSettings();
        
        // Загружаем настройки интерфейса
        loadInterfaceSettings();
        
        // Загружаем список сессий
        loadSessions();
        
        return currentUser;
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Ошибка загрузки данных пользователя', 'error');
    }
}

// Заполнение профиля данными
function fillProfileData(user) {
    // ФИО в шапке
    const nameElement = document.querySelector('.profile-general-info h1');
    if (nameElement) {
        const fullName = `${user.surname || ''} ${user.name || ''} ${user.patronymic || ''}`.trim();
        nameElement.textContent = fullName || 'Пользователь';
    }
    
    // Должность
    const postElement = document.querySelector('.profile-info-group:first-child .profile-info-group-content-element:first-child .profile-info-group-content-element-info');
    if (postElement) {
        postElement.textContent = user.post_name || 'Не указана';
        // Если это input, делаем readonly
        if (postElement.tagName === 'INPUT') {
            postElement.readOnly = true;
        }
    }
    
    // Отдел
    const deptElement = document.querySelector('.profile-info-group:first-child .profile-info-group-content-element:last-child .profile-info-group-content-element-info');
    if (deptElement) {
        deptElement.textContent = user.department_name || 'Не указан';
        if (deptElement.tagName === 'INPUT') {
            deptElement.readOnly = true;
        }
    }
    
    // Телефон
    const phoneInput = document.querySelector('#personal .profile-info-group:last-child .profile-info-group-content-element:first-child input');
    if (phoneInput) {
        phoneInput.value = user.tel_num || '';
    }
    
    // Email
    const emailInput = document.querySelector('#personal .profile-info-group:last-child .profile-info-group-content-element:last-child input');
    if (emailInput) {
        emailInput.value = user.email || '';
    }
    
    // Аватар
    const profileAvatar = document.querySelector('.profile-avatar');
    const userAvatar = document.getElementById('userAvatar');
    const avatarUrl = user.avatar_uri || '../materials/avatar_for_profile.png';
    
    if (profileAvatar) profileAvatar.src = avatarUrl;
    if (userAvatar) userAvatar.src = avatarUrl;
}

// ========== 2. ОБНОВЛЕНИЕ КОНТАКТОВ ==========
async function updateContactInfo(field, value) {
    if (!value || value === '') return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: {
                'Content-Type': application/json,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ [field]: value })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Данные обновлены', 'success');
            // Обновляем глобальный объект
            if (field === 'tel_num') currentUser.tel_num = value;
            if (field === 'email') currentUser.email = value;
        } else {
            showToast(data.error || 'Ошибка обновления', 'error');
        }
    } catch (error) {
        console.error('Update error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// ========== 3. СМЕНА ПАРОЛЯ ==========
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    
    // Валидация
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Заполните все поля', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Новый пароль и подтверждение не совпадают', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }
    
    // Отправка
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Пароль успешно изменён', 'success');
            // Очищаем поля
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showToast(data.error || 'Ошибка смены пароля', 'error');
        }
    } catch (error) {
        console.error('Change password error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// ========== 4. АВАТАР ==========
// Загрузка аватара
async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
        showToast('Можно загружать только изображения', 'error');
        return;
    }
    
    // Проверка размера (максимум 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Размер изображения не должен превышать 2MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/upload-avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const avatarUrl = data.avatarUrl + '?t=' + Date.now();
            const profileAvatar = document.querySelector('.profile-avatar');
            const userAvatar = document.getElementById('userAvatar');
            
            if (profileAvatar) profileAvatar.src = avatarUrl;
            if (userAvatar) userAvatar.src = avatarUrl;
            
            showToast('Аватар обновлён', 'success');
        } else {
            showToast(data.error || 'Ошибка загрузки', 'error');
        }
    } catch (error) {
        console.error('Upload avatar error:', error);
        showToast('Ошибка загрузки', 'error');
    }
}

// Удаление аватара
async function removeAvatar() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/remove-avatar', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const defaultAvatar = '../materials/avatar_for_profile.png';
        
        if (response.ok) {
            const profileAvatar = document.querySelector('.profile-avatar');
            const userAvatar = document.getElementById('userAvatar');
            
            if (profileAvatar) profileAvatar.src = defaultAvatar;
            if (userAvatar) userAvatar.src = defaultAvatar;
            
            showToast('Аватар удалён', 'success');
        } else {
            const data = await response.json();
            showToast(data.error || 'Ошибка удаления', 'error');
        }
    } catch (error) {
        console.error('Remove avatar error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// ========== 5. НАСТРОЙКИ УВЕДОМЛЕНИЙ ==========
// Загрузка настроек уведомлений из БД
async function loadNotificationSettings() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/notification-settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const settings = data.settings || {};
            
            // Применяем настройки по ID
            const notifyNewTasks = document.getElementById('notify_new_tasks');
            const notifyDocStatus = document.getElementById('notify_doc_status');
            const notifyDeadline = document.getElementById('notify_deadline');
            const notifyInternal = document.getElementById('notify_internal');
            const notifyEmail = document.getElementById('notify_email');
            
            if (notifyNewTasks) notifyNewTasks.checked = settings.new_tasks !== false;
            if (notifyDocStatus) notifyDocStatus.checked = settings.doc_status_change !== false;
            if (notifyDeadline) notifyDeadline.checked = settings.deadline_reminder !== false;
            if (notifyInternal) notifyInternal.checked = settings.internal_notifications !== false;
            if (notifyEmail) notifyEmail.checked = settings.email_notifications === true;
        }
    } catch (error) {
        console.error('Load notification settings error:', error);
    }
}

// Сохранение настроек уведомлений
async function saveNotificationSettings() {
    const settings = {
        new_tasks: document.getElementById('notify_new_tasks')?.checked || false,
        doc_status_change: document.getElementById('notify_doc_status')?.checked || false,
        deadline_reminder: document.getElementById('notify_deadline')?.checked || false,
        internal_notifications: document.getElementById('notify_internal')?.checked || false,
        email_notifications: document.getElementById('notify_email')?.checked || false
    };
    
    console.log('Saving notification settings:', settings);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/notification-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ settings })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Настройки уведомлений сохранены', 'success');
        } else {
            showToast(data.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Save notification settings error:', error);
        showToast('Ошибка сохранения', 'error');
    }
}
// ========== 6. НАСТРОЙКИ ИНТЕРФЕЙСА ==========
// Загрузка настроек интерфейса
function loadInterfaceSettings() {
    // Масштаб
    const savedScale = localStorage.getItem('scale') || '100';
    const scaleSlider = document.querySelector('.scale-slider');
    const scaleValue = document.querySelector('.scale-value');
    if (scaleSlider && scaleValue) {
        scaleSlider.value = savedScale;
        scaleValue.textContent = savedScale + '%';
        document.documentElement.style.fontSize = savedScale + '%';
    }
    
    // Компактный режим
    loadCompactMode();
    
    // Акцентный цвет
    initAccentColor();
}

function saveCompactMode(checked) {
    localStorage.setItem('compactMode', checked);
    if (checked) {
        document.body.classList.add('compact-mode');
    } else {
        document.body.classList.remove('compact-mode');
    }
}

// ========== 7. СЕССИИ ==========
/// Загрузка сессий
async function loadSessions() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/auth/sessions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const activeSessions = data.activeSessions || [];
            const historySessions = data.historySessions || [];
            const currentSessionId = data.currentSessionId;
            
            renderActiveSessions(activeSessions, currentSessionId);
            renderLoginHistory(historySessions);
        }
    } catch (error) {
        console.error('Load sessions error:', error);
    }
}

// Отрисовка активных сессий (все активные, с кнопкой завершения для чужих)
function renderActiveSessions(sessions, currentSessionId) {
    const container = document.getElementById('activeSessionsList');
    if (!container) return;
    
    if (sessions.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Нет активных сессий</div>';
        return;
    }
    
    container.innerHTML = sessions.map(session => {
        const isCurrent = session.id === currentSessionId;
        const timeText = formatSessionTime(session.last_activity);
        const browserName = session.application || 'Неизвестно';
        const deviceName = session.device || 'Неизвестно';
        const deviceIcon = getDeviceIcon(browserName);
        const locationText = session.location || 'Неизвестно';
        
        let deviceString = deviceName;
        if (browserName !== 'Неизвестно' && browserName !== deviceName) {
            deviceString = `${deviceName} / ${browserName}`;
        }
        
        return `
            <div class="session-item ${isCurrent ? 'current' : ''}">
                <div class="session-info">
                    <span class="session-device">${deviceIcon} ${escapeHtml(deviceString)}</span>
                    <span class="session-time">${isCurrent ? '🟢 Текущая сессия' : timeText}</span>
                    ${session.ip_address ? `<span class="session-ip">IP: ${escapeHtml(session.ip_address)}</span>` : ''}
                </div>
                <div class="session-location-info">
                    <span class="session-location">📍 ${escapeHtml(locationText)}</span>
                    ${!isCurrent ? `<button class="session-terminate-btn" onclick="terminateSession(${session.id})" title="Завершить сессию">✕</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Отрисовка истории входов
function renderLoginHistory(history) {
    const container = document.getElementById('loginHistoryList');
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Нет истории входов</div>';
        return;
    }
    
    container.innerHTML = history.map(entry => {
        const timeText = formatSessionTime(entry.created_at);
        const browserName = entry.application || 'Неизвестно';
        const deviceName = entry.device || 'Неизвестно';
        const deviceIcon = getDeviceIcon(browserName);
        const locationText = entry.location || 'Неизвестно';
        
        let deviceString = deviceName;
        if (browserName !== 'Неизвестно' && browserName !== deviceName) {
            deviceString = `${deviceName} / ${browserName}`;
        }
        
        return `
            <div class="history-item">
                <div class="history-info">
                    <span class="history-device">${deviceIcon} ${escapeHtml(deviceString)}</span>
                    <span class="history-time">${timeText}</span>
                    ${entry.ip_address ? `<span class="session-ip">IP: ${escapeHtml(entry.ip_address)}</span>` : ''}
                </div>
                <span class="history-location">📍 ${escapeHtml(locationText)}</span>
            </div>
        `;
    }).join('');
}

// Обновляем функцию terminateSession
window.terminateSession = async function(sessionId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/auth/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Сессия завершена', 'success');
            loadSessions(); // Обновляем оба списка
        } else {
            const data = await response.json();
            showToast(data.error || 'Ошибка завершения сессии', 'error');
        }
    } catch (error) {
        console.error('Terminate session error:', error);
        showToast('Ошибка сервера', 'error');
    }
};

// Обновляем функцию terminateOtherSessions
window.terminateOtherSessions = async function() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/sessions/terminate-others', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Все другие сессии завершены', 'success');
            loadSessions(); // Обновляем оба списка
        } else {
            const data = await response.json();
            showToast(data.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Terminate others error:', error);
        showToast('Ошибка сервера', 'error');
    }
};

function getDeviceIcon(application) {
    if (!application) return '💻';
    const app = application.toLowerCase();
    if (app.includes('chrome')) return '🌐';
    if (app.includes('safari')) return '🧭';
    if (app.includes('firefox')) return '🦊';
    if (app.includes('edge')) return '🌊';
    if (app.includes('opera')) return 'O';
    return '💻';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatSessionTime(dateString) {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    return `${diffDays} д назад`;
}

// Глобальная функция для завершения сессии (должна быть доступна из onclick)
window.terminateSession = async function(sessionId) {
    console.log('Terminating session:', sessionId);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/auth/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Сессия завершена', 'success');
            // Перезагружаем список сессий
            await loadSessions();
        } else {
            showToast(data.error || 'Ошибка завершения сессии', 'error');
        }
    } catch (error) {
        console.error('Terminate session error:', error);
        showToast('Ошибка сервера', 'error');
    }
};

// Глобальная функция для завершения всех других сессий
window.terminateOtherSessions = async function() {
    console.log('Terminating all other sessions');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/sessions/terminate-others', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Все другие сессии завершены', 'success');
            await loadSessions();
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Terminate others error:', error);
        showToast('Ошибка сервера', 'error');
    }
};

// ========== 8. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showToast(message, type = 'info') {
    // Удаляем старые тосты
    const oldToasts = document.querySelectorAll('.toast-notification');
    oldToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#5194ff'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        animation: fadeInOut 3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, 3000);
}
// ========== УПРАВЛЕНИЕ АКЦЕНТНЫМ ЦВЕТОМ ==========

// Сохранение акцентного цвета
function saveAccentColor(color) {
    localStorage.setItem('accentColor', color);
    updateAccent(color);
    
    // Обновляем активный класс на кнопках
    document.querySelectorAll('.accent-color').forEach(btn => {
        if (btn.dataset.color === color) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Инициализация выбора акцентного цвета
function initAccentColor() {
    const savedColor = localStorage.getItem('accentColor') || '#5194FF';
    const colorBtns = document.querySelectorAll('.accent-color');
    const customBtn = document.getElementById('customAccentBtn');
    const customPicker = document.getElementById('customColorPicker');
    
    // Применяем сохранённый цвет
    updateAccent(savedColor);
    
    // Отмечаем активную кнопку
    let found = false;
    colorBtns.forEach(btn => {
        if (btn.dataset.color === savedColor) {
            btn.classList.add('active');
            found = true;
        }
    });
    
    // Если сохранённого цвета нет в списке, активируем кастомный
    if (!found && customBtn) {
        customBtn.classList.add('active');
        customBtn.style.background = savedColor;
    }
    
    // Обработчики для предустановленных цветов
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            if (color) {
                saveAccentColor(color);
                // Сбрасываем кастомный
                if (customBtn) {
                    customBtn.classList.remove('active');
                    customBtn.style.background = 'linear-gradient(135deg, #ff0000, #00ff00, #0000ff)';
                }
            }
        });
    });
    
    // Обработчик для кастомного цвета
    if (customBtn && customPicker) {
        customBtn.addEventListener('click', () => {
            customPicker.click();
        });
        
        customPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            customBtn.style.background = color;
            customBtn.classList.add('active');
            
            // Убираем активный класс с предустановленных
            colorBtns.forEach(btn => {
                btn.classList.remove('active');
            });
            
            saveAccentColor(color);
        });
    }
}
// Загрузка настроек компактного режима
function loadCompactMode() {
    const savedMode = localStorage.getItem('compactMode') === 'true';
    const compactToggle = document.getElementById('compactModeToggle');
    
    if (compactToggle) {
        compactToggle.checked = savedMode;
        if (savedMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
    }
}

// Сохранение компактного режима
function saveCompactMode(checked) {
    localStorage.setItem('compactMode', checked);
    if (checked) {
        document.body.classList.add('compact-mode');
    } else {
        document.body.classList.remove('compact-mode');
    }
    showToast(checked ? 'Компактный режим включён' : 'Компактный режим выключен', 'success');
}
// ========== 9. ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ ==========
function initEventListeners() {
    // Переключение вкладок
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.settings-section').forEach(section => section.classList.remove('active'));
            
            this.classList.add('active');
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
        });
    });
    
    // Переключатели уведомлений
    document.querySelectorAll('#notifications .switch input').forEach(switchEl => {
        switchEl.addEventListener('change', saveNotificationSettings);
    });
    
    // Выбор темы
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.dataset.theme;
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    });
    
    // Масштаб
    const scaleSlider = document.querySelector('.scale-slider');
    const scaleValue = document.querySelector('.scale-value');
    if (scaleSlider && scaleValue) {
        scaleSlider.addEventListener('input', function() {
            const value = this.value;
            scaleValue.textContent = value + '%';
            document.documentElement.style.fontSize = value + '%';
            localStorage.setItem('scale', value);
        });
    }
    
    // Компактный режим
    const compactSwitch = document.querySelector('#interface .switch input');
    if (compactSwitch) {
        compactSwitch.addEventListener('change', (e) => saveCompactMode(e.target.checked));
    }
    
    // Контактные данные
    const phoneInput = document.querySelector('#personal .profile-info-group:last-child .profile-info-group-content-element:first-child input');
    const emailInput = document.querySelector('#personal .profile-info-group:last-child .profile-info-group-content-element:last-child input');
    
    if (phoneInput) {
        phoneInput.addEventListener('change', (e) => updateContactInfo('tel_num', e.target.value));
    }
    if (emailInput) {
        emailInput.addEventListener('change', (e) => updateContactInfo('email', e.target.value));
    }
    
    // Смена пароля
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', changePassword);
    }
    
    // Аватар
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    
    if (uploadAvatarBtn && avatarInput) {
        uploadAvatarBtn.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', uploadAvatar);
    }
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', removeAvatar);
    }
    
    // Завершение сессий
    const terminateSessionsBtn = document.querySelector('#security .btn-outline');
    if (terminateSessionsBtn) {
        terminateSessionsBtn.addEventListener('click', terminateOtherSessions);
    }
    // const terminateSessionsBtn = document.getElementById('terminateOtherSessionsBtn');
    // if (terminateSessionsBtn) {
    //     terminateSessionsBtn.addEventListener('click', () => terminateOtherSessions());
    // }
    const notifySwitches = ['notify_new_tasks', 'notify_doc_status', 'notify_deadline', 'notify_internal', 'notify_email'];
    notifySwitches.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', saveNotificationSettings);
        }
    });
    const compactToggle = document.getElementById('compactModeToggle');
    if (compactToggle) {
        compactToggle.addEventListener('change', (e) => {
            saveCompactMode(e.target.checked);
        });
    }
}

// ========== 10. ЗАПУСК ==========
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    initEventListeners();
});