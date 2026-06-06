// ========== УПРАВЛЕНИЕ ЛЕВЫМ МЕНЮ ==========
const leftMenu = document.querySelector('.left-menu');
const toggleBtn = document.querySelector('.toggle-btn');

// Состояния: 'collapsed' (свёрнуто), 'expanded' (развёрнуто без закрепления), 'pinned' (закреплено)
let menuState = 'collapsed'; // collapsed, expanded, pinned

// Загрузка состояния меню
function loadMenuState() {
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
    let menuWidth;
    if (menuState === 'collapsed') {
        menuWidth = 70;
    } else {
        menuWidth = 260;
    }
    
    document.querySelectorAll('.chat-container, .base-container, .settings-container, .admin-container').forEach(container => {
        if (container) {
            container.style.marginLeft = menuWidth + 'px';
            container.style.transition = 'margin-left 0.3s ease';
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

// ========== УПРАВЛЕНИЕ ТЕМАМИ ==========
function updateColorScheme(color_scheme){
    const root = document.documentElement;    
    switch(color_scheme) {
        case 'light':
            root.style.setProperty('--c_bg', '#e8e8e8');
            root.style.setProperty('--c_bg_txt', '#000000');
            root.style.setProperty('--c_surf', '#ffffff');
            root.style.setProperty('--c_surf_txt', '#9b9b9b');
            break;
        case 'dark':
            root.style.setProperty('--c_bg', '#32343e');
            root.style.setProperty('--c_bg_txt', '#ffffff');
            root.style.setProperty('--c_surf', '#3d3f4a');
            root.style.setProperty('--c_surf_txt', '#9b9b9b');
            break;
        default:
            console.warn('Unknown color scheme:', color_scheme);
    }
}
function updateAccent(acc_color) {
    const root = document.documentElement;
    root.style.setProperty('--c_acc', acc_color);
    
    // Генерируем затемнённую версию для hover и активных состояний
    const darkenedColor = darkenColor(acc_color, 20);
    root.style.setProperty('--c_brightacc', darkenedColor);
    
    const accentTransparent = hexToRgba(acc_color, 0.5);
    root.style.setProperty('--c_acchalf', accentTransparent);
}
// Функция для затемнения цвета
function darkenColor(hex, percent) {
    // Убираем # если есть
    hex = hex.replace('#', '');
    
    // Преобразуем в RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Затемняем
    r = Math.max(0, Math.floor(r * (1 - percent / 100)));
    g = Math.max(0, Math.floor(g * (1 - percent / 100)));
    b = Math.max(0, Math.floor(b * (1 - percent / 100)));
    
    // Преобразуем обратно в hex
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
// ========== ИНИЦИАЛИЗАЦИЯ АКЦЕНТНОГО ЦВЕТА (ГЛОБАЛЬНО) ==========
function initAccentColorGlobal() {
    const savedColor = localStorage.getItem('accentColor') || '#5194FF';
    updateAccent(savedColor);
}
// Вспомогательная функция для затемнения цвета
function adjustBrightness(hex, percent) {
    // Упрощённая версия — можно оставить как есть или убрать
    return hex;
}

function hexToRgba(hex, opacity) {
    hex = hex.replace('#', '');   
    let r, g, b;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else {
        return hex;
    } 
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
                    userRoleSpan.textContent = '👑 Супер-админ';
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
                    dropdownRole.textContent = '👑 Супер-администратор';
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
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const menuItems = document.querySelectorAll('.menu-item[data-page]');
    
    menuItems.forEach(item => {
        const page = item.dataset.page;
        if (currentPage === page || (currentPage === 'admin_base' && page === 'admin')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ========== УПРАВЛЕНИЕ ТЕМОЙ ==========

// Применение темы к странице
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateColorScheme(theme);
    
    // Меняем иконку и классы на кнопке
    const themeBtn = document.getElementById('themeToggle');
    const themeIcon = document.querySelector('.theme-icon');
    
    if (themeBtn && themeIcon) {
        if (theme === 'light') {
            themeBtn.classList.remove('dark');
            themeBtn.classList.add('light');
            themeIcon.textContent = '☀️';
        } else {
            themeBtn.classList.remove('light');
            themeBtn.classList.add('dark');
            themeIcon.textContent = '🌙';
        }
    }
    
    localStorage.setItem('theme', theme);
}

// Инициализация темы
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeBtn = document.getElementById('themeToggle');
    
    // Применяем сохранённую тему
    applyTheme(savedTheme);
    
    if (!themeBtn) return;
    
    // Обработчик клика
    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Добавляем анимацию вращения
        themeBtn.classList.add('rotate');
        
        // Применяем новую тему после короткой задержки для анимации
        setTimeout(() => {
            applyTheme(newTheme);
        }, 50);
        
        // Убираем класс анимации
        setTimeout(() => {
            themeBtn.classList.remove('rotate');
        }, 400);
    });
}
// ========== ИНИЦИАЛИЗАЦИЯ ВЫПАДАЮЩЕГО МЕНЮ АВАТАРА ==========
function initUserDropdown() {
    const avatarBtn = document.getElementById('userAvatarBtn');
    const dropdown = document.getElementById('userDropdown');
    
    if (avatarBtn && dropdown) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        // Закрываем при клике вне
        document.addEventListener('click', (e) => {
            if (!avatarBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
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
document.addEventListener('DOMContentLoaded', async () => {
    initAccentColorGlobal();
    // Загружаем данные пользователя
    await loadUserDataForMenu();
    
    // Загружаем непрочитанные сообщения
    loadUnreadCount();
    
    // Подсвечиваем активную страницу
    highlightActivePage();
    
    // Инициализируем тему
    initTheme();
    
    // Инициализируем выпадающее меню
    initUserDropdown();
    
    // Инициализируем кнопки выхода
    initLogout();
    
    // Обновляем непрочитанные каждые 30 секунд
    setInterval(loadUnreadCount, 30000);
});