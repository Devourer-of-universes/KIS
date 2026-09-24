// profile.js - Страница профиля пользователя

// =====================================================
// ЗАГРУЗКА ДАННЫХ ПРОФИЛЯ
// =====================================================

let isEditingProfile = false;

async function loadProfileData() {
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
        const user = data.user;
        window.currentUser = user;

        renderProfile(user);
        loadProfileNotes();
        loadProfileStats();
        renderMiniCalendar();

    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Ошибка загрузки профиля', 'error');
    }
}

// =====================================================
// ОТРИСОВКА ПРОФИЛЯ
// =====================================================

function renderProfile(user) {
    // Аватар
    const avatarUrl = user.avatar_uri || '../materials/avatar_for_profile.png';
    document.getElementById('profileAvatar').src = avatarUrl;

    // Имя
    const fullName = `${user.surname || ''} ${user.name || ''} ${user.patronymic || ''}`.trim() || user.username;
    document.getElementById('profileFullName').textContent = fullName;

    // Роль
    let roleText = 'Пользователь';
    if (user.is_super_admin) roleText = '👑 Супер-админ';
    else if (user.role_id === 1) roleText = 'Администратор';
    document.getElementById('profileRole').textContent = roleText;

    // Статус
    const statusBadge = document.getElementById('profileStatusBadge');
    const statusDot = document.getElementById('profileStatus');
    
    if (user.status === 'active') {
        statusBadge.textContent = '🟢 Активен';
        statusBadge.className = 'badge status-badge status-active';
        statusDot.className = 'profile-avatar-status online';
    } else if (user.status === 'away') {
        statusBadge.textContent = '🌙 Не беспокоить';
        statusBadge.className = 'badge status-badge status-away';
        statusDot.className = 'profile-avatar-status away';
    } else if (user.status === 'blocked') {
        statusBadge.textContent = '🔴 Заблокирован';
        statusBadge.className = 'badge status-badge status-blocked';
        statusDot.className = 'profile-avatar-status offline';
    } else {
        statusBadge.textContent = '⚫ Не в сети';
        statusBadge.className = 'badge status-badge status-offline';
        statusDot.className = 'profile-avatar-status offline';
    }

    // Должность и отдел
    document.getElementById('profilePosition').textContent = user.post_name || 'Должность не указана';
    document.getElementById('profileDepartment').textContent = user.department_name || 'Отдел не указан';

    // Контакты
    document.getElementById('profileEmail').textContent = user.email || '—';
    document.getElementById('profilePhone').textContent = user.tel_num || '—';
    document.getElementById('profileBirthday').textContent = user.birthday ? new Date(user.birthday).toLocaleDateString('ru-RU') : '—';
    document.getElementById('profileRegistered').textContent = user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—';

    // Рабочая информация
    document.getElementById('profileWorkPosition').textContent = user.post_name || '—';
    document.getElementById('profileWorkDepartment').textContent = user.department_name || '—';
    document.getElementById('profileManager').textContent = user.manager_name || '—';
    document.getElementById('profileStartDate').textContent = user.start_date ? new Date(user.start_date).toLocaleDateString('ru-RU') : '—';

    // Заполняем поля редактирования
    document.getElementById('profileEmailInput').value = user.email || '';
    document.getElementById('profilePhoneInput').value = user.tel_num || '';
    document.getElementById('profileBirthdayInput').value = user.birthday || '';
}



// =====================================================
// СТАТИСТИКА В ПРОФИЛЕ
// =====================================================

async function loadProfileStats() {
    try {
        const token = localStorage.getItem('token');

        // Загружаем задачи
        const tasksRes = await fetch('/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let tasks = [];
        if (tasksRes.ok) {
            const data = await tasksRes.json();
            tasks = data.tasks || [];
        }

        const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
        const completedTasks = tasks.filter(t => t.status === 'completed');

        // Загружаем чаты
        const chatsRes = await fetch('/api/chats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let chats = [];
        if (chatsRes.ok) {
            const data = await chatsRes.json();
            chats = data.chats || [];
        }

        // Загружаем уведомления
        const notifRes = await fetch('/api/notifications/unread', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let unread = 0;
        if (notifRes.ok) {
            const data = await notifRes.json();
            unread = data.unreadCount || 0;
        }

        document.getElementById('profileStatsTasks').textContent = activeTasks.length;
        document.getElementById('profileStatsDocs').textContent = '0';
        document.getElementById('profileStatsProcesses').textContent = '0';
        document.getElementById('profileStatsUnread').textContent = unread;
        document.getElementById('profileStatsChats').textContent = chats.length;
        document.getElementById('profileStatsCompleted').textContent = completedTasks.length;

    } catch (error) {
        console.error('Error loading profile stats:', error);
    }
}

// =====================================================
// РЕДАКТИРОВАНИЕ ПРОФИЛЯ
// =====================================================
function toggleProfileEdit() {
    isEditingProfile = !isEditingProfile;

    const editBtn = document.getElementById('profileEditBtn');
    const saveBtn = document.getElementById('profileSaveBtn');
    const cancelBtn = document.getElementById('profileCancelBtn');

    const fields = ['profileEmail', 'profilePhone', 'profileBirthday'];
    const inputs = ['profileEmailInput', 'profilePhoneInput', 'profileBirthdayInput'];

    if (isEditingProfile) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';

        fields.forEach(id => document.getElementById(id).style.display = 'none');
        inputs.forEach(id => document.getElementById(id).style.display = 'block');
    } else {
        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';

        fields.forEach(id => document.getElementById(id).style.display = 'block');
        inputs.forEach(id => document.getElementById(id).style.display = 'none');
    }
}

async function saveProfile() {
    const email = document.getElementById('profileEmailInput').value.trim();
    const telNum = document.getElementById('profilePhoneInput').value.trim();
    const birthday = document.getElementById('profileBirthdayInput').value;

    if (!email) {
        showToast('Email обязателен', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: email,
                tel_num: telNum,
                birthday: birthday
            })
        });

        if (response.ok) {
            showToast('Профиль обновлён', 'success');
            toggleProfileEdit();
            await loadProfileData();
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Save profile error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// =====================================================
// СМЕНА ПАРОЛЯ
// =====================================================

async function changeProfilePassword() {
    const currentPassword = document.getElementById('profileCurrentPassword').value;
    const newPassword = document.getElementById('profileNewPassword').value;
    const confirmPassword = document.getElementById('profileConfirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Заполните все поля', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Пароль должен быть минимум 6 символов', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Пароли не совпадают', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        if (response.ok) {
            showToast('Пароль успешно изменён', 'success');
            document.getElementById('profileCurrentPassword').value = '';
            document.getElementById('profileNewPassword').value = '';
            document.getElementById('profileConfirmPassword').value = '';
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка смены пароля', 'error');
        }
    } catch (error) {
        console.error('Change password error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// =====================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
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
        animation: fadeInOut 3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}



// =====================================================
// ИНИЦИАЛИЗАЦИЯ
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/html/login.html';
        return;
    }

    // Загружаем данные
    loadProfileData();

    // Обработчики
    const editBtn = document.getElementById('profileEditBtn');
    if (editBtn) editBtn.addEventListener('click', toggleProfileEdit);

    const saveBtn = document.getElementById('profileSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveProfile);

    const cancelBtn = document.getElementById('profileCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', toggleProfileEdit);

    const changePasswordBtn = document.getElementById('profileChangePasswordBtn');
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', changeProfilePassword);

    // Закрытие модалки по клику на фон
    document.getElementById('noteModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });

    // Закрытие модалки по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.getElementById('noteModal').style.display = 'none';
        }
    });
});