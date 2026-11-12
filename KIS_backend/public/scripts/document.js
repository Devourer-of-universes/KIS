// ==========ДОКУМЕНТООБОРОТ ==========

// =====================================================
// 1. ИНИЦИАЛИЗАЦИЯ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =====================================================
// - DOM элементы (кнопки меню)
const btn_docs_last = document.querySelector('#top-menu-btn-docs-last');
const btn_docs_at_work = document.querySelector('#top-menu-btn-docs-at-work');
const btn_docs_new = document.querySelector('#top-menu-btn-docs-new');
const btn_docs_archive = document.querySelector('#top-menu-btn-docs-archive');


// Обработчики кнопок
btn_docs_last.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    openWindow('base-section-doc-last'); 
    loadDocuments('recent');
});
btn_docs_at_work.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    openWindow('base-section-doc-at-work'); 
    loadDocuments('at-work');
});
btn_docs_new.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    if (typeof openDocumentCreate === 'function') {
        openDocumentCreate();
    } else {
        console.warn('openDocumentCreate not defined');
        openWindow('base-section-doc-new');
    }
});
btn_docs_archive.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    openWindow('base-section-doc-archive'); 
    loadDocuments('archive');
});

// =====================================================
// 2. УПРАВЛЕНИЕ ОКНАМИ (БАЗОВОЕ)
// =====================================================
// - openWindow()
function openWindow(windowId) {
    console.log('Пытаемся открыть:', windowId);
    closeAllWindowsExcept(windowId);
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
        windowElement.style.display = 'block';
        windowElement.style.zIndex = '1000';
        windowElement.classList.add('active');
        console.log('Успешно открыто:', windowId);
    } else {
        console.error('Окно не найдено:', windowId);
    }
}
// - closeWindow()
function closeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
        windowElement.style.display = 'none';
        windowElement.classList.remove('active');
        
        // Вызываем проверку после закрытия
        onSectionClosed(windowId);
    }
}
// - closeAllWindowsExcept()
function closeAllWindowsExcept(exceptWindowId) {
    document.querySelectorAll('.base-section').forEach(window => {
        if (window.id !== exceptWindowId) {
            window.style.display = 'none';
            window.classList.remove('active');
        }
    });
}

// Функция автоматического открытия дашборда
function ensureDashboardVisible() {
    // Если есть открытые секции (кроме дашборда) или модалки — ничего не делаем
    if (hasAnyOpenSections() || hasAnyOpenModals()) {
        return;
    }
    
    // Если дашборд уже виден — ничего не делаем
    if (isDashboardVisible()) {
        return;
    }
    
    // Иначе открываем дашборд
    console.log('📊 Автоматическое открытие дашборда (все секции закрыты)');
    openWindow('base-section-dashboard');
}
// Функция, которая вызывается после закрытия любой секции
function onSectionClosed(closedSectionId) {
    // Небольшая задержка, чтобы дать завершиться другим событиям
    setTimeout(() => {
        ensureDashboardVisible();
    }, 50);
}
// Функция, которая вызывается после закрытия модального окна
function onModalClosed() {
    setTimeout(() => {
        ensureDashboardVisible();
    }, 50);
}



// =====================================================
// 12. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================
// - formatDate()
// Форматирование даты в локальный формат YYYY-MM-DD
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// - escapeHtml()
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// - showToast()
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
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
// - showConfirm()
function showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('active');
    confirmCallback = onConfirm;
    
    const okBtn = document.getElementById('confirmOkBtn');
    const newBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newBtn, okBtn);
    newBtn.onclick = () => {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    };
}
// - closeConfirmModal()
function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Глобальные обработчики для закрытия модалок по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.admin-modal').forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }
});

// Закрытие по клику на фон
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('admin-modal')) {
        e.target.style.display = 'none';
        document.body.style.overflow = '';
    }
});

// =====================================================
// 12.5 КОМПОНЕНТ ВЫБОРА ПОЛЬЗОВАТЕЛЯ
// =====================================================

let userSelectorCallback = null;
let userSelectorMode = 'single'; // 'single' или 'multiple'
let allUsersList = [];
let filteredUsersList = [];
let selectedUserIds = new Set();

// Открытие селектора пользователей
function openUserSelector(options = {}) {
    const { 
        mode = 'multiple',      // 'single' или 'multiple'
        preselectedIds = [],    // массив предварительно выбранных ID
        title = 'Выбор пользователей',
        onConfirm = null        // колбэк с результатом
    } = options;
    
    userSelectorMode = mode;
    userSelectorCallback = onConfirm;
    selectedUserIds = new Set(preselectedIds);
    
    document.getElementById('userSelectorTitle').textContent = title;
    document.getElementById('selectedCount').textContent = `Выбрано: ${selectedUserIds.size}`;
    
    // Загружаем пользователей
    loadUsersForSelector();
    
    openModal('userSelectorModal');
}

function closeUserSelectorModal() {
    closeModal('userSelectorModal');
    userSelectorCallback = null;
}

// Загрузка пользователей для селектора
async function loadUsersForSelector() {
    const container = document.getElementById('userSelectorList');
    container.innerHTML = '<div class="loading-users">Загрузка пользователей...</div>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            allUsersList = data.users || [];
            
            // Загружаем отделы для фильтра
            loadDepartmentsForSelector();
            
            // Применяем фильтры и отображаем
            applyUserFilters();
        } else {
            container.innerHTML = '<div class="loading-users" style="color: red;">Ошибка загрузки пользователей</div>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<div class="loading-users" style="color: red;">Ошибка загрузки</div>';
    }
}

// Загрузка отделов для фильтра
async function loadDepartmentsForSelector() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/departments/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const deptSelect = document.getElementById('userSelectorDepartment');
            deptSelect.innerHTML = '<option value="">Все отделы</option>' + 
                (data.departments || []).map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// Применение фильтров
function applyUserFilters() {
    const searchText = document.getElementById('userSelectorSearch')?.value.toLowerCase() || '';
    const departmentId = document.getElementById('userSelectorDepartment')?.value;
    const roleFilter = document.getElementById('userSelectorRole')?.value;
    const sortBy = document.getElementById('userSelectorSort')?.value;
    
    filteredUsersList = allUsersList.filter(user => {
        // Поиск по имени, email, отделу
        const fullName = `${user.surname} ${user.name} ${user.patronymic || ''}`.toLowerCase();
        const searchMatch = !searchText || 
            fullName.includes(searchText) || 
            (user.email || '').toLowerCase().includes(searchText) ||
            (user.username || '').toLowerCase().includes(searchText);
        
        // Фильтр по отделу
        const deptMatch = !departmentId || user.department_id == departmentId;
        
        // Фильтр по роли
        let roleMatch = true;
        if (roleFilter === 'admin') roleMatch = user.role_id === 1;
        if (roleFilter === 'user') roleMatch = user.role_id === 2;
        
        return searchMatch && deptMatch && roleMatch;
    });
    
    // Сортировка
    filteredUsersList.sort((a, b) => {
        switch(sortBy) {
            case 'name_asc':
                return (a.surname || '').localeCompare(b.surname || '');
            case 'name_desc':
                return (b.surname || '').localeCompare(a.surname || '');
            case 'department':
                return (a.department_name || '').localeCompare(b.department_name || '');
            case 'post':
                return (a.post_name || '').localeCompare(b.post_name || '');
            default:
                return (a.surname || '').localeCompare(b.surname || '');
        }
    });
    
    renderUserSelectorList();
}

// Отрисовка списка пользователей
function renderUserSelectorList() {
    const container = document.getElementById('userSelectorList');
    
    if (filteredUsersList.length === 0) {
        container.innerHTML = '<div class="loading-users">👥 Нет пользователей</div>';
        return;
    }
    
    container.innerHTML = filteredUsersList.map(user => {
        const isSelected = selectedUserIds.has(user.id);
        const fullName = `${user.surname || ''} ${user.name || ''} ${user.patronymic || ''}`.trim();
        const avatarHtml = user.avatar_uri ? 
            `<img src="${user.avatar_uri}" class="user-avatar-small" onerror="this.src='../materials/avatar_for_profile.png'">` :
            `<div class="user-avatar-small avatar-letter">${(user.name?.[0] || '?').toUpperCase()}</div>`;
        
        return `
            <div class="user-selector-item ${isSelected ? 'selected' : ''}" data-user-id="${user.id}" onclick="toggleUserSelection(${user.id})">
                <input type="checkbox" class="user-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleUserSelection(${user.id})">
                ${avatarHtml}
                <div class="user-info">
                    <div class="user-name">${escapeHtml(fullName)}</div>
                    <div class="user-details">
                        ${user.post_name ? `📌 ${escapeHtml(user.post_name)}` : ''}
                        ${user.department_name ? ` | 🏢 ${escapeHtml(user.department_name)}` : ''}
                        ${user.email ? ` | 📧 ${escapeHtml(user.email)}` : ''}
                    </div>
                </div>
                <div class="user-badge">${user.role_id === 1 ? 'Админ' : 'Пользователь'}</div>
            </div>
        `;
    }).join('');
}

// Переключение выбора пользователя
function toggleUserSelection(userId) {
    if (userSelectorMode === 'single') {
        selectedUserIds.clear();
        selectedUserIds.add(userId);
    } else {
        if (selectedUserIds.has(userId)) {
            selectedUserIds.delete(userId);
        } else {
            selectedUserIds.add(userId);
        }
    }
    
    document.getElementById('selectedCount').textContent = `Выбрано: ${selectedUserIds.size}`;
    renderUserSelectorList();
}

// Выбрать всех
function selectAllUsers() {
    if (userSelectorMode === 'single') return;
    filteredUsersList.forEach(user => selectedUserIds.add(user.id));
    document.getElementById('selectedCount').textContent = `Выбрано: ${selectedUserIds.size}`;
    renderUserSelectorList();
}

// Очистить всё
function clearAllUsers() {
    selectedUserIds.clear();
    document.getElementById('selectedCount').textContent = `Выбрано: 0`;
    renderUserSelectorList();
}

// Подтверждение выбора
function confirmUserSelection() {
    const selectedUsers = allUsersList.filter(u => selectedUserIds.has(u.id));
    if (userSelectorCallback) {
        userSelectorCallback(selectedUsers, Array.from(selectedUserIds));
    }
    closeUserSelectorModal();
}

// Инициализация обработчиков селектора (вызвать в DOMContentLoaded)
function initUserSelectorHandlers() {
    const searchInput = document.getElementById('userSelectorSearch');
    if (searchInput) searchInput.addEventListener('input', applyUserFilters);
    
    const deptSelect = document.getElementById('userSelectorDepartment');
    if (deptSelect) deptSelect.addEventListener('change', applyUserFilters);
    
    const roleSelect = document.getElementById('userSelectorRole');
    if (roleSelect) roleSelect.addEventListener('change', applyUserFilters);
    
    const sortSelect = document.getElementById('userSelectorSort');
    if (sortSelect) sortSelect.addEventListener('change', applyUserFilters);
    
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllUsers);
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllUsers);
    
    const confirmBtn = document.getElementById('confirmUserSelectionBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmUserSelection);
}

// Глобальные функции для вызова из onclick
window.toggleUserSelection = toggleUserSelection;
window.closeUserSelectorModal = closeUserSelectorModal;



// =====================================================
// 14. ИНИЦИАЛИЗАЦИЯ (DOMContentLoaded)
// =====================================================
// - Все обработчики кнопок
document.addEventListener('DOMContentLoaded', () => {
    // Закрытие окон - ИСПРАВЛЕННЫЙ КОД
    document.querySelectorAll('.sec-btn-close').forEach(btn => {
        btn.addEventListener('click', function(e) {  // ← function вместо стрелки
            e.stopPropagation();
            const section = this.closest('.base-section');  // ← this теперь работает
            if (section) {
                closeWindow(section.id);
                openWindow('base-section-docs-last');
            }
        });
    });
    
    // Закрытие модальных окон по клику на фон
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('base-sec-dn-modal') || e.target.classList.contains('base-sec-tn-modal')) {
            closeAllWindowsExcept(null);
            openWindow('base-section-docs-last');
        }
    });

    document.querySelectorAll('.type-list-elem').forEach(button => {
        button.addEventListener('click', function() {
            const parentSection = this.closest('.base-section');
            const sectionId = parentSection.id;
            
            if (sectionId.includes('doc')) {
                createNewDocument(this.dataset.type);
            } else if (sectionId.includes('task')) {
                createNewTask(this.dataset.type);
            }
        });
    });   
    
});




// ИНОЕ
function createNewDocument(docType) {
    console.log('Создание документа типа:', docType);
    closeWindow('base-section-doc-new');
    openWindow('base-section-doc-edit');
}
