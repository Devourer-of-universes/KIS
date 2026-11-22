// ========== УПРАВЛЕНИЕ ЛЕВЫМ МЕНЮ ==========
const leftMenu = document.querySelector('.left-menu');
const toggleBtn = document.querySelector('.toggle-btn');

// Состояния: 'collapsed' (свёрнуто), 'expanded' (развёрнуто без закрепления), 'pinned' (закреплено)
let menuState = 'collapsed'; // collapsed, expanded, pinned

// Загрузка состояния меню
function loadMenuState() {
    if (!leftMenu) {
        updateContentMargin();
        return;
    }

    const savedState = localStorage.getItem('menuState');
    if (savedState === 'expanded') {
        menuState = 'expanded';
        leftMenu.classList.remove('collapsed', 'pinned');
        leftMenu.classList.add('expanded');
    } else if (savedState === 'pinned') {
        menuState = 'pinned';
        leftMenu.classList.remove('collapsed', 'expanded');
        leftMenu.classList.add('pinned');
    } else {
        menuState = 'collapsed';
        leftMenu.classList.remove('expanded', 'pinned');
        leftMenu.classList.add('collapsed');
    }
    updateContentMargin();
}

function saveMenuState() {
    localStorage.setItem('menuState', menuState);
}

function updateContentMargin() {
    const menuWidth = menuState === 'collapsed' ? 72 : 260;

    document.querySelectorAll('.chat-container, .base-container, .settings-container, .admin-container, .profile-container, .files-container').forEach(container => {
        if (container) {
            container.style.marginLeft = menuWidth + 'px';
            container.style.transition = 'margin-left 0.25s ease';
        }
    });
}

// Обработчик кнопки сворачивания/разворачивания
if (toggleBtn) {
    toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        if (menuState === 'collapsed') {
            // Свёрнуто -> Развёрнуто (без закрепления)
            menuState = 'expanded';
            leftMenu.classList.remove('collapsed', 'pinned');
            leftMenu.classList.add('expanded');
        } else if (menuState === 'expanded') {
            // Развёрнуто -> Закреплено
            menuState = 'pinned';
            leftMenu.classList.remove('collapsed', 'expanded');
            leftMenu.classList.add('pinned');
        } else {
            // Закреплено -> Свёрнуто
            menuState = 'collapsed';
            leftMenu.classList.remove('expanded', 'pinned');
            leftMenu.classList.add('collapsed');
        }
        
        saveMenuState();
        updateContentMargin();
    });
}

// Клик вне меню — сворачиваем только если не закреплено
document.addEventListener('click', function(e) {
    if (leftMenu && !leftMenu.contains(e.target) && menuState === 'expanded') {
        menuState = 'collapsed';
        leftMenu.classList.remove('expanded', 'pinned');
        leftMenu.classList.add('collapsed');
        saveMenuState();
        updateContentMargin();
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadMenuState();
});

// ========== Theme and accent ==========
function normalizeHexColor(color) {
    if (typeof color !== 'string') return '#2563eb';
    let hex = color.trim().replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#2563eb';
    return `#${hex.toLowerCase()}`;
}

function hexToRgbParts(hex) {
    const normalized = normalizeHexColor(hex).replace('#', '');
    return {
        r: parseInt(normalized.substring(0, 2), 16),
        g: parseInt(normalized.substring(2, 4), 16),
        b: parseInt(normalized.substring(4, 6), 16)
    };
}

function hexToRgba(hex, opacity) {
    const { r, g, b } = hexToRgbParts(hex);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function darkenColor(hex, percent) {
    let { r, g, b } = hexToRgbParts(hex);
    r = Math.max(0, Math.floor(r * (1 - percent / 100)));
    g = Math.max(0, Math.floor(g * (1 - percent / 100)));
    b = Math.max(0, Math.floor(b * (1 - percent / 100)));
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function getPreferredTheme() {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
}

function updateAccent(acc_color) {
    const root = document.documentElement;
    const color = normalizeHexColor(acc_color || localStorage.getItem('accentColor') || '#2563eb');
    root.style.setProperty('--c_acc', color);
    root.style.setProperty('--c_brightacc', darkenColor(color, 12));
    root.style.setProperty('--c_acchalf', hexToRgba(color, 0.14));
    root.style.setProperty('--c_acc_soft', hexToRgba(color, 0.08));
}

function initAccentColorGlobal() {
    const savedColor = localStorage.getItem('accentColor') || '#2563eb';
    updateAccent(savedColor);
}

// ========== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ДЛЯ МЕНЮ ==========
async function loadUserDataForMenu() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.user;
            
            // Обновляем аватар
            const avatarUrl = user.avatar_uri || '../materials/avatar_for_profile.png';
            document.querySelectorAll('.user-avatar img, .dropdown-avatar img').forEach(img => {
                if (img) img.src = avatarUrl;
            });
            
            // Обновляем имя в левом меню
            const userNameSpan = document.getElementById('userName');
            if (userNameSpan) {
                const fullName = `${user.surname || ''} ${user.name || ''}`.trim();
                userNameSpan.textContent = fullName || user.username;
            }
            
            // Обновляем роль в левом меню
            const userRoleSpan = document.getElementById('userRole');
            if (userRoleSpan) {
                if (user.is_super_admin) {
                    userRoleSpan.textContent = 'Супер-админ';
                } else if (user.role_id === 1) {
                    userRoleSpan.textContent = 'Администратор';
                } else {
                    userRoleSpan.textContent = 'Пользователь';
                }
            }
            
            // Обновляем имя в выпадающем меню
            const dropdownName = document.getElementById('dropdownName');
            if (dropdownName) {
                const fullName = `${user.surname || ''} ${user.name || ''}`.trim();
                dropdownName.textContent = fullName || user.username;
            }
            
            // Обновляем роль в выпадающем меню
            const dropdownRole = document.getElementById('dropdownRole');
            if (dropdownRole) {
                if (user.is_super_admin) {
                    dropdownRole.textContent = 'Супер-администратор';
                } else if (user.role_id === 1) {
                    dropdownRole.textContent = 'Администратор';
                } else {
                    dropdownRole.textContent = 'Пользователь';
                }
            }
            
            // Показываем/скрываем пункт администрирования
            const adminMenuItem = document.querySelector('.menu-item[data-page="admin"]');
            if (adminMenuItem) {
                const hasAdminAccess = user.is_super_admin || user.role_id === 1;
                adminMenuItem.style.display = hasAdminAccess ? 'flex' : 'none';
            }
            // Пункт "Мой отдел" для руководителей
            const myDeptItem = document.getElementById('menuMyDepartment');
            if (myDeptItem) {
                fetch('/api/admin/my-department', { headers: { 'Authorization': 'Bearer ' + token } })
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d && d.managed) myDeptItem.style.display = 'flex'; })
                    .catch(() => {});
            }
            
            return user;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// ========== ЗАГРУЗКА НЕПРОЧИТАННЫХ СООБЩЕНИЙ ==========
async function loadUnreadCount() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/chats/unread', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const unreadCount = data.total_unread || 0;
            
            const badge = document.getElementById('chatUnreadBadge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading unread count:', error);
    }
}

// ========== ПОДСВЕТКА АКТИВНОЙ СТРАНИЦЫ ==========
function highlightActivePage() {
    // Получаем имя текущего файла без расширения (например, 'documents')
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1).replace('.html', '');
    
    const menuItems = document.querySelectorAll('.menu-item[data-page]');
    
    menuItems.forEach(item => {
        const page = item.dataset.page;
        
        // Сопоставляем
        if (
            currentPage === page || 
            (currentPage === 'admin_base' && page === 'admin') ||
            (currentPage === 'base' && page === 'base')
        ) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ========== УПРАВЛЕНИЕ ТЕМОЙ ==========

// Apply theme to DOM
function applyTheme(theme) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', normalized);

    const themeIconImg = document.getElementById('themeIconImg');
    if (themeIconImg) {
        if (normalized === 'light') {
            themeIconImg.src = '../materials/icons8-солнце-96.png';
            themeIconImg.alt = 'Light theme';
        } else {
            themeIconImg.src = '../materials/icons8-луна-96.png';
            themeIconImg.alt = 'Dark theme';
        }
    }

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.classList.remove('light', 'dark');
        themeBtn.classList.add(normalized);
    }

    try {
        document.querySelectorAll('.theme-option[data-theme]').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === normalized);
        });
    } catch (e) {}

    localStorage.setItem('theme', normalized);
}

function initTheme() {
    const savedTheme = (typeof getPreferredTheme === 'function') ? getPreferredTheme() : (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
    applyTheme(savedTheme);

    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn || themeBtn.dataset.themeBound === '1') return;
    themeBtn.dataset.themeBound = '1';

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        themeBtn.classList.add('rotate');
        setTimeout(() => applyTheme(newTheme), 30);
        setTimeout(() => themeBtn.classList.remove('rotate'), 300);
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ВЫПАДАЮЩЕГО МЕНЮ АВАТАРА ==========
function initUserDropdown() {
    const avatarBtn = document.getElementById('userAvatarBtn');
    const dropdown = document.getElementById('userDropdown');
    const userMenu = document.getElementById('userMenu');
    
    if (avatarBtn && dropdown && userMenu) {
        if (avatarBtn.dataset.bound === '1') return;
        avatarBtn.dataset.bound = '1';
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const isOpen = userMenu.classList.toggle('open');
            dropdown.classList.toggle('show', isOpen);
        });
        
        // Закрываем при клике вне
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                userMenu.classList.remove('open');
                dropdown.classList.remove('show');
            }
        });
        
        // Закрываем при клике на пункты (кроме шапки — она ведёт на профиль)
        userMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                userMenu.classList.remove('open');
                dropdown.classList.remove('show');
            });
        });
        
        // Не вешаем обработчик на .dropdown-header — браузер сам переходит по ссылке
    }
}

// ========== ВЫХОД ИЗ СИСТЕМЫ ==========
async function logout() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        window.location.href = '/html/login.html';
    }
}

function initLogout() {
    // Кнопка выхода в старом меню (если есть)
    const oldLogoutBtn = document.querySelector('.logout-item .left_menu_pagelink');
    if (oldLogoutBtn) {
        oldLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }
    
    // Кнопка выхода в новом выпадающем меню
    const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
// Apply saved accent early for all pages
try { initAccentColorGlobal(); } catch (e) {}

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', async () => {
    try { initAccentColorGlobal(); } catch (e) {}
    try { await loadUserDataForMenu(); } catch (e) { console.error('loadUserDataForMenu error:', e); }
    try { loadUnreadCount(); } catch (e) { console.error('loadUnreadCount error:', e); }
    try { highlightActivePage(); } catch (e) { console.error('highlightActivePage error:', e); }
    try { initTheme(); } catch (e) { console.error('initTheme error:', e); }
    try { initUserDropdown(); } catch (e) { console.error('initUserDropdown error:', e); }
    try { initLogout(); } catch (e) { console.error('initLogout error:', e); }

    setInterval(() => {
        try { loadUnreadCount(); } catch (e) {}
    }, 30000);
});