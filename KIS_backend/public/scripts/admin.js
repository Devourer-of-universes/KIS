const btn_users = document.querySelector('#nav-btn-users');
const btn_templates = document.querySelector('#nav-btn-templates');

const btn_system = document.querySelector('#nav-btn-system');
const btn_reports = document.querySelector('#nav-btn-reports');
const btn_structure = document.querySelector('#nav-btn-structure');
const btn_roles = document.querySelector('#nav-btn-roles');
const btn_addUser = document.querySelector('#addUserBtn');

btn_users.addEventListener('click', function(e){
    e.stopPropagation();
    openAdminSection('users-section');
    setActiveNavButton(this);
})

btn_templates.addEventListener('click', function(e){
    e.stopPropagation();
    openAdminSection('templates-section');
    setActiveNavButton(this);
})


btn_system.addEventListener('click', function(e){
    e.stopPropagation();
    openAdminSection('system-section');
    setActiveNavButton(this);
})

btn_reports.addEventListener('click', function(e){ 
    e.stopPropagation();
    openAdminSection('reports-section');
    setActiveNavButton(this);
})

btn_structure.addEventListener('click', function(e){
    e.stopPropagation();
    openAdminSection('structure-section');
    setActiveNavButton(this);
    loadStructure();
})

btn_roles.addEventListener('click', function(e){
    e.stopPropagation();
    openAdminSection('roles-section');
    setActiveNavButton(this);
    loadRoles(); // Должно быть
});


if (btn_addUser) {
    btn_addUser.addEventListener('click', function(e){
        e.stopPropagation();
        openModal('addUserModal'); 
    });
}



function openAdminSection(sectionId) {
    console.log('Открываем раздел:', sectionId);
    
    
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
        sectionElement.style.display = 'block';
        sectionElement.classList.add('active');
    }
}

function setActiveNavButton(activeButton) {
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    
    activeButton.classList.add('active');
}


document.addEventListener('DOMContentLoaded', function() {
    const defaultSection = document.getElementById('users-section'); 
    if (defaultSection) {
        defaultSection.style.display = 'block';
        defaultSection.classList.add('active');
    }
    
   
    const defaultNavBtn = document.querySelector('#nav-btn-users');
    if (defaultNavBtn) {
        defaultNavBtn.classList.add('active');
    }
    // Кнопка добавления корневого подразделения
    document.getElementById('addMainDepartmentBtn')?.addEventListener('click', () => {
        openAddDepartmentModal(null);
    });

    // Кнопки сворачивания/разворачивания
    document.getElementById('collapseAllBtn')?.addEventListener('click', collapseAllNodes);
    document.getElementById('expandAllBtn')?.addEventListener('click', expandAllNodes);
});




class OrganizationStructure {
    constructor() {
        this.initEventListeners();
        this.loadStructureState();
    }
    
    initEventListeners() {
        
        document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAll());
        document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAll());
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-btn') || 
                e.target.closest('.toggle-btn')) {
                const toggleBtn = e.target.classList.contains('toggle-btn') 
                    ? e.target 
                    : e.target.closest('.toggle-btn');
                this.toggleGroup(toggleBtn);
            }
        });
    }
    
    toggleGroup(toggleBtn) {
        const groupItem = toggleBtn.closest('.structure-group-item');
        const isCollapsed = groupItem.classList.contains('collapsed');
        
        if (isCollapsed) {
            this.expandGroup(groupItem);
        } else {
            this.collapseGroup(groupItem);
        }
        
        this.saveStructureState();
    }
    
    collapseGroup(groupItem) {
        groupItem.classList.add('collapsed');
        const toggleBtn = groupItem.querySelector('.toggle-btn');
        const toggleIcon = toggleBtn.querySelector('.toggle-icon');
        toggleIcon.textContent = '▶';
        toggleBtn.classList.remove('expanded');
    }
    
    expandGroup(groupItem) {
        groupItem.classList.remove('collapsed');
        const toggleBtn = groupItem.querySelector('.toggle-btn');
        const toggleIcon = toggleBtn.querySelector('.toggle-icon');
        toggleIcon.textContent = '▼';
        toggleBtn.classList.add('expanded');
    }
    
    collapseAll() {
        document.querySelectorAll('.structure-group-item').forEach(item => {
            this.collapseGroup(item);
        });
        this.saveStructureState();
    }
    
    expandAll() {
        document.querySelectorAll('.structure-group-item').forEach(item => {
            this.expandGroup(item);
        });
        this.saveStructureState();
    }
    
    
    saveStructureState() {
        const state = {};
        document.querySelectorAll('.structure-group-item').forEach((item, index) => {
            const groupName = item.querySelector('.structure-group-name')?.textContent;
            if (groupName) {
                state[groupName] = item.classList.contains('collapsed');
            }
        });
        localStorage.setItem('orgStructureState', JSON.stringify(state));
    }
    
    
    loadStructureState() {
        const savedState = localStorage.getItem('orgStructureState');
        if (savedState) {
            const state = JSON.parse(savedState);
            document.querySelectorAll('.structure-group-item').forEach(item => {
                const groupName = item.querySelector('.structure-group-name')?.textContent;
                if (groupName && state[groupName]) {
                    this.collapseGroup(item);
                }
            });
        }
    }
    
    
    addDepartment(parentElement, departmentName) {
     
        const newDepartment = this.createDepartmentElement(departmentName);
        parentElement.querySelector('.structure-subgroups').appendChild(newDepartment);
        this.expandGroup(parentElement); 
    }
    
    createDepartmentElement(name) {
        const li = document.createElement('li');
        li.className = 'structure-group-item';
        li.innerHTML = `
            <div class="group-header">
                <button class="toggle-btn" title="Свернуть/развернуть">
                    <span class="toggle-icon">▼</span>
                </button>
                <div class="group-info">
                    <h3 class="structure-group-name">${name}</h3>
                    <span class="structure-group-number-employe">0 сотрудников</span>
                </div>
                <div class="group-manager">
                    <h4 class="structure-employe-post manager-post">Руководитель</h4>
                    <h5 class="structure-employe-role manager-role">Не назначен</h5>
                    <h5 class="structure-employe-person manager-name">-</h5>
                    <span class="structure-employe-status manager-status status-inactive">Не активен</span>
                </div>
                <div class="structure-group-actionbuttons">
                    <button class="structure-group-actionbutton btn-outline">+ Подразделение</button>
                    <button class="structure-group-actionbutton btn-outline">+ Сотрудник</button>
                    <button class="structure-group-actionbutton btn-icon">✎</button>
                </div>
            </div>
            <ul class="structure-subgroups"></ul>
        `;
        return li;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const orgStructure = new OrganizationStructure();
});








function openModal(modalId) {
    // Закрываем все открытые модалки
    document.querySelectorAll('.admin-modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}


function generateCredentials() {
    const lastName = document.getElementById('userLastName').value;
    const firstName = document.getElementById('userFirstName').value;
    
    if (lastName && firstName) {
       
        const login = `${lastName.toLowerCase()}.${firstName.charAt(0).toLowerCase()}`;
        document.getElementById('userLogin').value = login;
        
        // Генерация пароля
        generatePassword();
    }
}
document.getElementById('userLastName').addEventListener('blur', generateCredentials);
document.getElementById('userFirstName').addEventListener('blur', generateCredentials);
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('admin-modal')) {
        closeModal(e.target.id);
    }
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.admin-modal.active').forEach(modal => {
            closeModal(modal.id);
        });
    }
});



// ========== ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ ==========

let currentEditingUserId = null;

async function loadUserDataToForm(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load user');
        
        const data = await response.json();
        const user = data.user;
        
        // Заполняем только существующие поля
        document.getElementById('editUserId').value = user.id || '';
        document.getElementById('userLastName').value = user.surname || '';
        document.getElementById('userFirstName').value = user.name || '';
        document.getElementById('userMiddleName').value = user.patronymic || '';
        document.getElementById('userBirthDate').value = user.birthday ? user.birthday.split('T')[0] : '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPhone').value = user.tel_num || '';
        document.getElementById('userLogin').value = user.username || '';
        document.getElementById('userPassword').value = '••••••••';
        
        // Загружаем роли
        await loadRolesForUserForm();
        const roleSelect = document.getElementById('userRoleId');
        if (roleSelect && user.role_id) {
            roleSelect.value = user.role_id;
        }
        
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Ошибка загрузки данных пользователя', 'error');
        closeModal('addUserModal');
    }
}
// Открытие модалки (создание или редактирование)

function openUserModal(userId = null) {
    currentEditingUserId = userId;
    const modal = document.getElementById('addUserModal');
    const title = modal.querySelector('.modal-header h2');
    const submitBtn = document.getElementById('saveUserBtn');
    
    // Очищаем форму
    document.getElementById('addUserForm').reset();
    document.getElementById('editUserId').value = '';
    
    if (userId) {
        title.textContent = '✏️ Редактирование пользователя';
        submitBtn.textContent = 'Сохранить изменения';
        loadUserDataToForm(userId);
    } else {
        title.textContent = '👤 Добавление пользователя';
        submitBtn.textContent = 'Добавить пользователя';
        
        // Загружаем роли
        loadRolesForUserForm();
        
        // Генерируем пароль и логин
        generateRandomPassword();
        generateLogin();
    }
    
    openModal('addUserModal');
}

// Загрузка списка подразделений для формы
async function loadDepartmentsForSelect(selectId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/departments/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load departments');
        
        const data = await response.json();
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">— Выберите подразделение —</option>';
        
        for (const dept of data.departments) {
            const prefix = '—'.repeat(dept.level) + ' ';
            select.innerHTML += `<option value="${dept.id}">${prefix}${escapeHtml(dept.name)}</option>`;
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// Загрузка списка должностей для формы
async function loadPostsForUserForm(departmentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/posts/department/${departmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load posts');
        
        const data = await response.json();
        const select = document.getElementById('userPostId');
        
        select.innerHTML = '<option value="">— Выберите должность —</option>';
        
        for (const post of data.posts) {
            select.innerHTML += `<option value="${post.id}">${escapeHtml(post.name)}</option>`;
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

// Загрузка списка ролей
async function loadRolesForUserForm() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/roles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load roles');
        
        const data = await response.json();
        const select = document.getElementById('userRoleId');
        
        if (!select) return;
        
        select.innerHTML = '<option value="">— Выберите роль —</option>';
        
        for (const role of data.roles) {
            select.innerHTML += `<option value="${role.id}">${escapeHtml(role.name)}</option>`;
        }
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

// Генерация логина
function generateLogin() {
    const surname = document.getElementById('userLastName').value.trim();
    const name = document.getElementById('userFirstName').value.trim();
    
    if (surname && name) {
        const login = `${surname.toLowerCase()}.${name.charAt(0).toLowerCase()}`;
        document.getElementById('userLogin').value = login;
    }
}

// Генерация пароля
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('userPassword').value = password;
}

// Автогенерация логина при вводе имени/фамилии
document.getElementById('userLastName').addEventListener('input', generateLogin);
document.getElementById('userFirstName').addEventListener('input', generateLogin);

// Сбор данных из формы
function getUserFormData() {
    return {
        username: document.getElementById('userLogin')?.value || '',
        surname: document.getElementById('userLastName')?.value || '',
        name: document.getElementById('userFirstName')?.value || '',
        patronymic: document.getElementById('userMiddleName')?.value || '',
        birthday: document.getElementById('userBirthDate')?.value || null,
        email: document.getElementById('userEmail')?.value || '',
        telNum: document.getElementById('userPhone')?.value || '',
        password: document.getElementById('userPassword')?.value || '',
        roleId: parseInt(document.getElementById('userRoleId')?.value) || 2
        // Убрали departmentId, postId, startDate
    };
}

// Валидация формы
function validateUserForm(data) {
    if (!data.surname) return 'Фамилия обязательна';
    if (!data.name) return 'Имя обязательно';
    if (!data.email) return 'Email обязателен';
    if (!data.telNum) return 'Телефон обязателен';
    if (!data.username) return 'Логин не сгенерирован';
    if (!currentEditingUserId && !data.password) return 'Пароль обязателен';
    if (!data.roleId) return 'Выберите роль';
    return null;
}

// Сохранение пользователя
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = getUserFormData();
    const validationError = validateUserForm(formData);
    
    if (validationError) {
        showToast(validationError, 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        let response;
        
        if (currentEditingUserId) {
            // Редактирование
            response = await fetch(`/api/admin/users/${currentEditingUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    surname: formData.surname,
                    name: formData.name,
                    patronymic: formData.patronymic,
                    email: formData.email,
                    telNum: formData.telNum,
                    roleId: parseInt(formData.roleId),
                    departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
                    postId: formData.postId ? parseInt(formData.postId) : null
                })
            });
        } else {
            // Создание
            response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: formData.username,
                    surname: formData.surname,
                    name: formData.name,
                    patronymic: formData.patronymic,
                    birthday: formData.birthday,
                    email: formData.email,
                    telNum: formData.telNum,
                    password: formData.password,
                    departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
                    postId: formData.postId ? parseInt(formData.postId) : null,
                    roleId: parseInt(formData.roleId)
                })
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Operation failed');
        }
        
        closeModal('addUserModal');
        loadUsers(currentPage, currentSearchTerm);
        showToast(currentEditingUserId ? 'Пользователь обновлён' : 'Пользователь создан', 'success');
        
    } catch (error) {
        console.error('Error saving user:', error);
        showToast(error.message, 'error');
    }
});





let currentUserId = null;
let currentHistoryPage = 1;
let historyTotal = 0;
let isLoadingHistory = false;

async function openUserInfoModal(userId) {
    currentUserId = userId;
    currentHistoryPage = 1;
    const body = document.getElementById('userInfoBody');
    body.innerHTML = '<div style="text-align: center; padding: 20px;">Загрузка...</div>';
    openModal('userInfoModal');
    
    try {
        const token = localStorage.getItem('token');
        
        // Загружаем данные пользователя
        const userResponse = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userResponse.ok) throw new Error('Failed to load user');
        const userData = await userResponse.json();
        const user = userData.user;
        
        // Загружаем статистику (оставим пока заглушкой)
        const stats = {
            documentsCreated: 24,
            tasksCompleted: 156,
            approvalsDone: 89,
            activeProcesses: 5
        };
        
        // Сначала создаём HTML структуру
        body.innerHTML = `
            <!-- ВИЗИТНАЯ КАРТОЧКА -->
            <div class="user-visit-card">
                <div class="user-card-header">
                    <div class="user-card-avatar">
                        <img src="${user.avatar_uri || '../materials/avatar_for_profile.png'}" alt="Аватар">
                        <div class="user-card-status status-${user.status === 'active' ? 'active' : 'inactive'}"></div>
                    </div>
                    <div class="user-card-info">
                        <h2 class="user-card-name">${escapeHtml(user.surname)} ${escapeHtml(user.name)} ${escapeHtml(user.patronymic || '')}</h2>
                        <div class="user-card-badges">
                            <span class="badge role-badge">${escapeHtml(user.role_name) || 'Пользователь'}</span>
                            <span class="badge status-badge status-${user.status === 'active' ? 'active' : 'inactive'}">
                                ${user.status === 'active' ? '🟢 Активен' : '🔴 Заблокирован'}
                            </span>
                        </div>
                        <p class="user-card-position">${escapeHtml(user.post_name) || 'Должность не указана'}</p>
                        <p class="user-card-department">${escapeHtml(user.department_name) || 'Отдел не указан'}</p>
                    </div>
                </div>
                
                <div class="user-card-details">
                    <div class="detail-item">
                        <span class="detail-icon">👤</span>
                        <span class="detail-label">Логин:</span>
                        <span class="detail-value">${escapeHtml(user.username)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📧</span>
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${escapeHtml(user.email)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📞</span>
                        <span class="detail-label">Телефон:</span>
                        <span class="detail-value">${escapeHtml(user.tel_num)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📅</span>
                        <span class="detail-label">Дата рождения:</span>
                        <span class="detail-value">${user.birthday ? new Date(user.birthday).toLocaleDateString('ru-RU') : '—'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📆</span>
                        <span class="detail-label">Дата регистрации:</span>
                        <span class="detail-value">${new Date(user.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">🕐</span>
                        <span class="detail-label">Последний вход:</span>
                        <span class="detail-value">${user.last_seen_at ? new Date(user.last_seen_at).toLocaleString('ru-RU') : '—'}</span>
                    </div>
                </div>
            </div>
            
            <!-- СТАТИСТИКА АКТИВНОСТИ -->
            <div class="user-stats-section">
                <h3>📊 Статистика активности</h3>
                <div class="stats-grid">
                    <div class="stats-card">
                        <div class="stats-number">${stats.documentsCreated}</div>
                        <div class="stats-label">Создано документов</div>
                    </div>
                    <div class="stats-card">
                        <div class="stats-number">${stats.tasksCompleted}</div>
                        <div class="stats-label">Выполнено задач</div>
                    </div>
                    <div class="stats-card">
                        <div class="stats-number">${stats.approvalsDone}</div>
                        <div class="stats-label">Согласований</div>
                    </div>
                    <div class="stats-card">
                        <div class="stats-number">${stats.activeProcesses}</div>
                        <div class="stats-label">Активных процессов</div>
                    </div>
                </div>
            </div>
            
            <!-- ИСТОРИЯ ДЕЙСТВИЙ -->
            <div class="user-history-section">
                <h3>📋 История действий</h3>
                <div class="history-timeline" id="userHistoryTimeline">
                    <div style="text-align: center; padding: 20px;">Загрузка истории...</div>
                </div>
                <div class="history-load-more" id="historyLoadMoreBtn" style="display: none;">
                    <button class="buttonbase" onclick="loadMoreHistory()">Загрузить ещё</button>
                </div>
            </div>
        `;
        
        // Теперь загружаем историю (элемент уже существует)
        await loadUserHistory(userId, 1);
        
    } catch (error) {
        console.error('Error loading user info:', error);
        body.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">❌ Ошибка загрузки данных</div>';
    }
}

// Загрузка истории пользователя
async function loadUserHistory(userId, page) {
    if (isLoadingHistory) return;
    isLoadingHistory = true;
    
    const limit = 20;
    const offset = (page - 1) * limit;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}/history?limit=${limit}&offset=${offset}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load history');
        
        const data = await response.json();
        historyTotal = data.total;
        
        const timeline = document.getElementById('userHistoryTimeline');
        const loadMoreBtn = document.getElementById('historyLoadMoreBtn');
        
        if (page === 1) {
            timeline.innerHTML = '';
        }
        
        if (data.history.length === 0 && page === 1) {
            timeline.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Нет действий</div>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        
        for (const item of data.history) {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-time">${item.created_at}</div>
                <div class="history-action">
                    <span class="action-icon">${getActionIcon(item.action)}</span>
                    <span class="action-text">${formatActionText(item.action, item.entity_type)}</span>
                    ${item.entity_id ? `<span class="action-doc">ID: ${item.entity_id}</span>` : ''}
                </div>
            `;
            timeline.appendChild(historyItem);
        }
        
        // Показываем кнопку "Загрузить ещё", если есть ещё записи
        if (offset + limit < historyTotal) {
            if (loadMoreBtn) loadMoreBtn.style.display = 'block';
        } else {
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }
        
        currentHistoryPage = page;
        
    } catch (error) {
        console.error('Error loading history:', error);
        const timeline = document.getElementById('userHistoryTimeline');
        if (timeline && timeline.innerHTML === '') {
            timeline.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Ошибка загрузки истории</div>';
        }
    } finally {
        isLoadingHistory = false;
    }
}

// Загрузка следующей страницы истории
function loadMoreHistory() {
    if (!isLoadingHistory && currentHistoryPage * 20 < historyTotal) {
        loadUserHistory(currentUserId, currentHistoryPage + 1);
    }
}

// Иконка для действия
function getActionIcon(action) {
    if (action.includes('POST')) return '➕';
    if (action.includes('PUT')) return '✏️';
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('login')) return '🔐';
    if (action.includes('logout')) return '🚪';
    return '📌';
}

// Форматирование текста действия
function formatActionText(action, entityType) {
    const map = {
        'users': 'пользователь',
        'departments': 'подразделение',
        'roles': 'роль',
        'chats': 'чат',
        'messages': 'сообщение'
    };
    
    const entity = map[entityType] || entityType;
    
    if (action.includes('POST')) return `Создал ${entity}`;
    if (action.includes('PUT')) return `Изменил ${entity}`;
    if (action.includes('DELETE')) return `Удал��л ${entity}`;
    return action;
}

// Вспомогательная функция для отрисовки истории
function renderHistoryItems(history) {
    if (!history || history.length === 0) {
        return '<div style="text-align: center; padding: 20px; color: #999;">Нет действий</div>';
    }
    
    return history.map(item => `
        <div class="history-item">
            <div class="history-time">${item.time}</div>
            <div class="history-action">
                <span class="action-icon">${item.icon}</span>
                <span class="action-text">${escapeHtml(item.text)}</span>
                ${item.doc ? `<span class="action-doc">${escapeHtml(item.doc)}</span>` : ''}
            </div>
        </div>
    `).join('');
}



function formatDateTime(date) {
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function loadMoreHistory() {
    console.log('Загрузка дополнительной истории...');
    // TODO: загрузка следующих страниц истории
}

function generateUserReport() {
    console.log('Генерация отчёта для пользователя:', currentViewedUserId);
}
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.btn-icon[title="Инфо"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.closest('tr').querySelector('td:first-child').textContent;
            openUserInfo(userId);
        });
    });
});


class TemplateBuilder {
    constructor() {
        this.fields = [];
        this.sections = [];
        this.selectedField = null;
        this.currentLayout = '1col';
        this.init();
    }
    
    init() {
        this.initDragAndDrop();
        this.initEventListeners();
        this.loadTemplateLibrary();
    }
    
    initDragAndDrop() {
        document.querySelectorAll('.field-type').forEach(field => {
            field.addEventListener('dragstart', this.handleDragStart.bind(this));
        });
        const builderArea = document.getElementById('templatePreview');
        builderArea.addEventListener('dragover', this.handleDragOver.bind(this));
        builderArea.addEventListener('drop', this.handleDrop.bind(this));
        builderArea.addEventListener('dragenter', this.handleDragEnter.bind(this));
        builderArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
    }
    
    initEventListeners() {
        document.getElementById('addSectionBtn').addEventListener('click', () => {
            this.addSection();
        });
        document.getElementById('clearTemplateBtn').addEventListener('click', () => {
            this.clearTemplate();
        });
        document.querySelectorAll('.layout-options .btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const columns = e.target.dataset.columns || '1';
                this.changeLayout(columns);
            });
        });
        document.getElementById('previewTemplateBtn').addEventListener('click', () => {
            this.showPreview();
        });
        document.getElementById('saveTemplateBtn').addEventListener('click', () => {
            this.saveTemplate();
        });
    }
    
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.type);
        e.target.classList.add('dragging');
    }
    
    handleDragOver(e) {
        e.preventDefault();
    }
    
    handleDragEnter(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        const fieldType = e.dataTransfer.getData('text/plain');
        this.addField(fieldType, e.clientX, e.clientY);
    }
    
    addField(type, x, y) {
        const fieldId = 'field_' + Date.now();
        const field = {
            id: fieldId,
            type: type,
            label: this.getDefaultLabel(type),
            required: false,
            placeholder: '',
            options: type === 'select' || type === 'radio' ? ['Вариант 1', 'Вариант 2'] : [],
            validation: {}
        };
        
        this.fields.push(field);
        this.renderField(field);
        this.selectField(fieldId);
    }
    
    getDefaultLabel(type) {
        const labels = {
            text: 'Текстовое поле',
            textarea: 'Текстовая область',
            number: 'Числовое поле',
            date: 'Дата',
            select: 'Выпадающий список',
            radio: 'Выбор варианта',
            checkbox: 'Чекбокс',
            file: 'Загрузка файла',
            signature: 'Подпись',
            user: 'Пользователь',
            department: 'Подразделение',
            calculated: 'Вычисляемое поле'
        };
        return labels[type] || 'Новое поле';
    }
    
    renderField(field) {
        const fieldElement = document.createElement('div');
        fieldElement.className = 'template-field';
        fieldElement.dataset.fieldId = field.id;
        fieldElement.innerHTML = this.getFieldHTML(field);
        
        document.getElementById('templatePreview').appendChild(fieldElement);
        fieldElement.addEventListener('click', () => this.selectField(field.id));
        fieldElement.querySelector('.field-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.editField(field.id);
        });
        fieldElement.querySelector('.field-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteField(field.id);
        });
    }
    
    getFieldHTML(field) {
        return `
            <div class="field-header">
                <div>
                    <span class="field-label">${field.label}</span>
                    ${field.required ? '<span class="field-required">*</span>' : ''}
                </div>
                <div class="field-controls">
                    <button class="field-control-btn field-edit" title="Редактировать">✎</button>
                    <button class="field-control-btn field-delete" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="field-preview">
                ${this.getFieldPreview(field)}
            </div>
        `;
    }
    
    getFieldPreview(field) {
        const previews = {
            text: '<input type="text" placeholder="Текст..." disabled>',
            textarea: '<textarea placeholder="Многострочный текст..." disabled rows="3"></textarea>',
            number: '<input type="number" placeholder="Число..." disabled>',
            date: '<input type="date" disabled>',
            select: '<select disabled><option>Выберите вариант</option></select>',
            radio: '<div><label><input type="radio" name="radio" disabled> Вариант 1</label></div>',
            checkbox: '<label><input type="checkbox" disabled> Отметка</label>',
            file: '<input type="file" disabled>',
            signature: '<div style="border:1px dashed #ccc; padding:20px; text-align:center;">Область для подписи</div>',
            user: '<select disabled><option>Выберите пользователя</option></select>',
            department: '<select disabled><option>Выберите отдел</option></select>',
            calculated: '<input type="text" placeholder="Автоматический расчёт" disabled>'
        };
        return previews[field.type] || '<input type="text" disabled>';
    }
    
    selectField(fieldId) {
        document.querySelectorAll('.template-field').forEach(field => {
            field.classList.remove('selected');
        });
        const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
        if (fieldElement) {
            fieldElement.classList.add('selected');
            this.selectedField = this.fields.find(f => f.id === fieldId);
            this.showFieldProperties(this.selectedField);
        }
    }
    
    showFieldProperties(field) {
        const propertiesPanel = document.getElementById('propertiesPanel');
        const propertiesContent = propertiesPanel.querySelector('.properties-content');
        
        propertiesContent.innerHTML = this.getFieldPropertiesHTML(field);
        this.initPropertyHandlers(field);
    }
    
    getFieldPropertiesHTML(field) {
        return `
            <div class="property-group">
                <h5>Основные настройки</h5>
                <div class="property-item">
                    <label>Название поля</label>
                    <input type="text" class="field-label-input" value="${field.label}">
                </div>
                <div class="property-item">
                    <label>
                        <input type="checkbox" class="field-required-input" ${field.required ? 'checked' : ''}>
                        Обязательное поле
                    </label>
                </div>
                <div class="property-item">
                    <label>Подсказка (placeholder)</label>
                    <input type="text" class="field-placeholder-input" value="${field.placeholder}" placeholder="Текст подсказки...">
                </div>
            </div>
            
            ${this.getTypeSpecificProperties(field)}
            
            <div class="property-group">
                <h5>Валидация</h5>
                ${this.getValidationProperties(field)}
            </div>
            
            <div class="property-group">
                <h5>Логика</h5>
                <div class="property-item">
                    <label>Условие отображения</label>
                    <select class="field-condition-input">
                        <option value="">Всегда показывать</option>
                        <option value="dependent">Зависит от другого поля</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    getTypeSpecificProperties(field) {
        if (field.type === 'select' || field.type === 'radio') {
            return `
                <div class="property-group">
                    <h5>Варианты выбора</h5>
                    <div class="options-list" id="optionsList">
                        ${field.options.map((option, index) => `
                            <div class="option-item">
                                <input type="text" value="${option}" class="option-input" data-index="${index}">
                                <button type="button" class="remove-option" data-index="${index}">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="add-option">+ Добавить вариант</button>
                </div>
            `;
        }
        
        if (field.type === 'number') {
            return `
                <div class="property-group">
                    <h5>Настройки числа</h5>
                    <div class="property-item">
                        <label>Минимальное значение</label>
                        <input type="number" class="field-min-input" value="${field.validation.min || ''}">
                    </div>
                    <div class="property-item">
                        <label>Максимальное значение</label>
                        <input type="number" class="field-max-input" value="${field.validation.max || ''}">
                    </div>
                </div>
            `;
        }
        
        if (field.type === 'file') {
            return `
                <div class="property-group">
                    <h5>Настройки файла</h5>
                    <div class="property-item">
                        <label>Разрешенные типы файлов</label>
                        <select class="field-file-types" multiple>
                            <option value="image">Изображения</option>
                            <option value="pdf">PDF</option>
                            <option value="word">Word документы</option>
                            <option value="excel">Excel файлы</option>
                        </select>
                    </div>
                    <div class="property-item">
                        <label>Максимальный размер (МБ)</label>
                        <input type="number" class="field-max-size" value="10">
                    </div>
                </div>
            `;
        }
        
        return '';
    }
    
    getValidationProperties(field) {
        return `
            <div class="property-item">
                <label>Минимальная длина</label>
                <input type="number" class="field-min-length" value="${field.validation.minLength || ''}">
            </div>
            <div class="property-item">
                <label>Максимальная длина</label>
                <input type="number" class="field-max-length" value="${field.validation.maxLength || ''}">
            </div>
            <div class="property-item">
                <label>Регулярное выражение</label>
                <input type="text" class="field-pattern" value="${field.validation.pattern || ''}" placeholder="Например: ^[A-Za-z]+$">
            </div>
        `;
    }
    
    initPropertyHandlers(field) {
        const labelInput = document.querySelector('.field-label-input');
        const requiredInput = document.querySelector('.field-required-input');
        const placeholderInput = document.querySelector('.field-placeholder-input');
        
        labelInput.addEventListener('change', (e) => {
            field.label = e.target.value;
            this.updateFieldView(field.id);
        });
        
        requiredInput.addEventListener('change', (e) => {
            field.required = e.target.checked;
            this.updateFieldView(field.id);
        });
        
        placeholderInput.addEventListener('change', (e) => {
            field.placeholder = e.target.value;
        });
        
        if (field.type === 'select' || field.type === 'radio') {
            this.initOptionsHandlers(field);
        }
        this.initValidationHandlers(field);
    }
    
    initOptionsHandlers(field) {
        document.querySelector('.add-option').addEventListener('click', () => {
            field.options.push('Новый вариант');
            this.showFieldProperties(field);
        });
        document.querySelectorAll('.remove-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                field.options.splice(index, 1);
                this.showFieldProperties(field);
            });
        });
        document.querySelectorAll('.option-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                field.options[index] = e.target.value;
            });
        });
    }
    
    initValidationHandlers(field) {
        const minLength = document.querySelector('.field-min-length');
        const maxLength = document.querySelector('.field-max-length');
        const pattern = document.querySelector('.field-pattern');
        
        if (minLength) minLength.addEventListener('change', (e) => {
            field.validation.minLength = e.target.value ? parseInt(e.target.value) : null;
        });
        
        if (maxLength) maxLength.addEventListener('change', (e) => {
            field.validation.maxLength = e.target.value ? parseInt(e.target.value) : null;
        });
        
        if (pattern) pattern.addEventListener('change', (e) => {
            field.validation.pattern = e.target.value || null;
        });
    }
    
    updateFieldView(fieldId) {
        const field = this.fields.find(f => f.id === fieldId);
        const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
        
        if (fieldElement) {
            fieldElement.querySelector('.field-label').textContent = field.label;
            const requiredElement = fieldElement.querySelector('.field-required');
            
            if (field.required && !requiredElement) {
                fieldElement.querySelector('.field-label').insertAdjacentHTML('afterend', '<span class="field-required">*</span>');
            } else if (!field.required && requiredElement) {
                requiredElement.remove();
            }
        }
    }
    
    editField(fieldId) {
        console.log('Редактирование поля:', fieldId);
    }
    
    deleteField(fieldId) {
        if (confirm('Удалить это поле?')) {
            this.fields = this.fields.filter(f => f.id !== fieldId);
            const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
            if (fieldElement) {
                fieldElement.remove();
            }
            
            if (this.selectedField && this.selectedField.id === fieldId) {
                this.selectedField = null;
                document.querySelector('.properties-content').innerHTML = '<div class="no-selection"><p>Выберите поле в конструкторе для настройки его свойств</p></div>';
            }
        }
    }
    
    addSection() {
        const sectionId = 'section_' + Date.now();
        const section = {
            id: sectionId,
            title: 'Новый раздел',
            layout: this.currentLayout,
            fields: []
        };
        
        this.sections.push(section);
        this.renderSection(section);
    }
    
    renderSection(section) {
        const sectionElement = document.createElement('div');
        sectionElement.className = 'template-section';
        sectionElement.dataset.sectionId = section.id;
        sectionElement.innerHTML = `
            <div class="section-header">
                <h4 class="section-title">${section.title}</h4>
                <div class="section-controls">
                    <button class="field-control-btn section-edit" title="Редактировать раздел">✎</button>
                    <button class="field-control-btn section-delete" title="Удалить раздел">🗑️</button>
                </div>
            </div>
            <div class="section-content layout-${section.layout}">
                <!-- Поля будут добавляться сюда -->
            </div>
        `;
        
        document.getElementById('templatePreview').appendChild(sectionElement);
        sectionElement.querySelector('.section-edit').addEventListener('click', () => {
            this.editSection(section.id);
        });
        
        sectionElement.querySelector('.section-delete').addEventListener('click', () => {
            this.deleteSection(section.id);
        });
    }
    
    editSection(sectionId) {
        const newTitle = prompt('Введите название раздела:');
        if (newTitle) {
            const section = this.sections.find(s => s.id === sectionId);
            section.title = newTitle;
            
            const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
            sectionElement.querySelector('.section-title').textContent = newTitle;
        }
    }
    
    deleteSection(sectionId) {
        if (confirm('Удалить этот раздел и все его поля?')) {
            this.sections = this.sections.filter(s => s.id !== sectionId);
            const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
            if (sectionElement) {
                sectionElement.remove();
            }
        }
    }
    
    changeLayout(columns) {
        this.currentLayout = columns + 'col';
        document.querySelectorAll('.section-content').forEach(content => {
            content.className = `section-content layout-${this.currentLayout}`;
        });
        document.querySelectorAll('.layout-options .btn-icon').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-columns="${columns}"]`).classList.add('active');
    }
    
    clearTemplate() {
        if (confirm('Очистить весь шаблон? Это действие нельзя отменить.')) {
            this.fields = [];
            this.sections = [];
            this.selectedField = null;
            document.getElementById('templatePreview').innerHTML = `
                <div class="empty-template">
                    <div class="empty-icon">📝</div>
                    <h4>Шаблон пуст</h4>
                    <p>Перетащите поля из левой панели или добавьте раздел</p>
                </div>
            `;
            document.querySelector('.properties-content').innerHTML = '<div class="no-selection"><p>Выберите поле в конструкторе для настройки его свойств</p></div>';
        }
    }
    
    showPreview() {
        const previewHTML = this.generatePreviewHTML();
        document.getElementById('livePreview').innerHTML = previewHTML;
        openModal('templatePreviewModal');
    }
    
    generatePreviewHTML() {
        if (this.fields.length === 0) {
            return '<p>Шаблон не содержит полей</p>';
        }
        
        return this.fields.map(field => `
            <div class="live-field ${field.required ? 'required' : ''}">
                <label>${field.label}</label>
                ${this.getFieldInputHTML(field)}
            </div>
        `).join('');
    }
    
    getFieldInputHTML(field) {
        const inputs = {
            text: `<input type="text" placeholder="${field.placeholder || 'Введите текст...'}">`,
            textarea: `<textarea placeholder="${field.placeholder || 'Введите текст...'}" rows="4"></textarea>`,
            number: `<input type="number" placeholder="${field.placeholder || 'Введите число...'}">`,
            date: `<input type="date">`,
            select: `
                <select>
                    <option value="">${field.placeholder || 'Выберите вариант...'}</option>
                    ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `,
            radio: field.options.map(opt => `
                <label style="display: block; margin-bottom: 5px;">
                    <input type="radio" name="${field.id}" value="${opt}"> ${opt}
                </label>
            `).join(''),
            checkbox: `<label><input type="checkbox"> ${field.placeholder || 'Отметка'}</label>`,
            file: `<input type="file">`,
            signature: `
                <div style="border: 1px dashed #ccc; padding: 20px; text-align: center; cursor: pointer;">
                    <div>🖊️ Нажмите для подписания</div>
                    <small style="color: #666;">Электронная подпись</small>
                </div>
            `,
            user: `
                <select>
                    <option value="">Выберите пользователя...</option>
                    <option value="user1">Иванов И.И.</option>
                    <option value="user2">Петрова М.С.</option>
                </select>
            `,
            department: `
                <select>
                    <option value="">Выберите отдел...</option>
                    <option value="it">ИТ отдел</option>
                    <option value="finance">Финансовый отдел</option>
                </select>
            `,
            calculated: `<input type="text" placeholder="Рассчитывается автоматически" disabled>`
        };
        
        return inputs[field.type] || '<input type="text" disabled>';
    }
    
    saveTemplate() {
        const templateData = {
            name: document.getElementById('templateName').value,
            category: document.getElementById('templateCategory').value,
            description: document.getElementById('templateDescription').value,
            fields: this.fields,
            sections: this.sections,
            settings: this.getTemplateSettings(),
            createdAt: new Date().toISOString(),
            version: '1.0'
        };
        
        if (!templateData.name) {
            alert('Введите название шаблона');
            return;
        }
        const templates = JSON.parse(localStorage.getItem('documentTemplates') || '[]');
        templates.push(templateData);
        localStorage.setItem('documentTemplates', JSON.stringify(templates));
        
        alert('Шаблон успешно сохранен!');
        console.log('Сохраненный шаблон:', templateData);
    }
    
    getTemplateSettings() {
        return {
            access: document.getElementById('templateAccess').value,
            autoNumbering: document.getElementById('autoNumbering').checked,
            autoWorkflow: document.getElementById('autoWorkflow').checked,
            workflowTemplate: document.getElementById('workflowTemplate').value,
            notifyCreator: document.getElementById('notifyCreator').checked,
            notifyParticipants: document.getElementById('notifyParticipants').checked
        };
    }
    
    loadTemplateLibrary() {
        const templates = JSON.parse(localStorage.getItem('documentTemplates') || '[]');
        console.log('Загруженные шаблоны:', templates);
    }
}

let templateBuilder;

document.addEventListener('DOMContentLoaded', function() {
    templateBuilder = new TemplateBuilder();
    document.getElementById('addTemplateBtn').addEventListener('click', function() {
        openModal('templateEditorModal');
    });
    document.getElementById('testTemplateBtn').addEventListener('click', function() {
        templateBuilder.showPreview();
    });
    
    document.getElementById('publishTemplateBtn').addEventListener('click', function() {
        templateBuilder.saveTemplate();
        closeModal('templateEditorModal');
    });
});
// В конце файла, после существующего кода, добавь:
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем пользователей
    if (typeof loadUsers === 'function') {
        loadUsers();
    }
});








// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========

let currentPage = 1;
let usersPerPage = 20;
let totalUsers = 0;
let usersList = [];
let currentSearchTerm = '';

// Загрузка списка пользователей
async function loadUsers(page = 1, search = '') {
    currentPage = page;
    currentSearchTerm = search;
    
    try {
        const token = localStorage.getItem('token');
        const offset = (page - 1) * usersPerPage;
        
        const response = await fetch(`/api/admin/users?limit=${usersPerPage}&offset=${offset}&search=${encodeURIComponent(search)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const data = await response.json();
        usersList = data.users;
        totalUsers = data.total;
        
        renderUsersTable(usersList);
        renderPagination();
        
    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.querySelector('#users-section .admin-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">❌ Ошибка загрузки пользователей</td></tr>';
        }
    }
}
function getStatusBadge(status) {
    switch(status) {
        case 'active': return '<span class="status-badge status-active">🟢 Активен</span>';
        case 'away': return '<span class="status-badge status-away">🌙 Не беспокоить</span>';
        case 'offline': return '<span class="status-badge status-offline">⚫ Не в сети</span>';
        case 'blocked': return '<span class="status-badge status-blocked">🔴 Заблокирован</span>';
        default: return '<span class="status-badge">❓ Неизвестно</span>';
    }
}
// Отрисовка таблицы пользователей
function renderUsersTable(users) {
    const tbody = document.querySelector('#users-section .admin-table tbody');
    if (!tbody) return;
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px;">📭 Нет пользователей</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td><strong>${escapeHtml(user.surname)} ${escapeHtml(user.name)}</strong>${user.patronymic ? ` ${escapeHtml(user.patronymic)}` : ''}<br><small style="color:#999;">@${escapeHtml(user.username)}</small></td>
            <td>${escapeHtml(user.post_name || '-')}</td>
            <td>${escapeHtml(user.department_name || '-')}</td>
            <td>
                <select class="role-select" data-user-id="${user.id}" onchange="updateUserRole(${user.id}, this.value)">
                    <option value="1" ${user.role_id === 1 ? 'selected' : ''}>👑 Администратор</option>
                    <option value="2" ${user.role_id === 2 ? 'selected' : ''}>👤 Пользователь</option>
                </select>
            </td>
            <td>${getStatusBadge(user.status)}</td>
            <td>
                <button class="btn-icon buttonbase" title="Информация" onclick="openUserInfoModal(${user.id})">ℹ️</button>
                <button class="btn-icon buttonbase" title="Редактировать" onclick="openUserModal(${user.id})">✏️</button>
                <button class="btn-icon buttonbase" 
                    title="${user.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}" 
                    onclick="openBlockUserModal(${user.id}, '${escapeHtml(user.surname)} ${escapeHtml(user.name)}', '${user.status}')">
                    ${user.status === 'blocked' ? '🔓' : '🔒'}
                </button>
                <button class="btn-icon buttonbase" title="Сбросить пароль" onclick="openResetPasswordModal(${user.id}, '${escapeHtml(user.username)}')">🔑</button>
                <button class="btn-icon buttonbase" title="Удалить" onclick="deleteUser(${user.id})" style="color: #dc3545;">🗑️</button>
            </td>
        </tr>
    `).join('');
    
    // Обновляем информацию о пагинации
    const start = (currentPage - 1) * usersPerPage + 1;
    const end = Math.min(currentPage * usersPerPage, totalUsers);
    document.getElementById('showingFrom').textContent = totalUsers === 0 ? 0 : start;
    document.getElementById('showingTo').textContent = end;
    document.getElementById('totalCount').textContent = totalUsers;
}
function deleteUser(userId) {
    showConfirmDelete(
        '🗑️ Удаление пользователя',
        'Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.',
        async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) throw new Error('Failed to delete user');
                
                loadUsers(currentPage, currentSearchTerm);
                showToast('Пользователь удалён', 'success');
            } catch (error) {
                console.error('Error deleting user:', error);
                showToast('Ошибка удаления', 'error');
            }
        }
    );
}
// Отрисовка пагинации
function renderPagination() {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const container = document.getElementById('paginationButtons');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Кнопка "Назад"
    if (currentPage > 1) {
        html += `<button class="pagination-btn" onclick="loadUsers(${currentPage - 1}, '${currentSearchTerm}')">← Назад</button>`;
    }
    
    // Номера страниц
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="loadUsers(1, '${currentSearchTerm}')">1</button>`;
        if (startPage > 2) html += `<span class="pagination-dots">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="loadUsers(${i}, '${currentSearchTerm}')">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-dots">...</span>`;
        html += `<button class="pagination-btn" onclick="loadUsers(${totalPages}, '${currentSearchTerm}')">${totalPages}</button>`;
    }
    
    // Кнопка "Вперёд"
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" onclick="loadUsers(${currentPage + 1}, '${currentSearchTerm}')">Вперёд →</button>`;
    }
    
    container.innerHTML = html;
}

// Поиск пользователей
function searchUsers() {
    const searchInput = document.getElementById('userSearchInput');
    const searchTerm = searchInput ? searchInput.value : '';
    loadUsers(1, searchTerm);
}

// Экранирование HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обновление роли пользователя
async function updateUserRole(userId, roleId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ roleId: parseInt(roleId) })
        });
        
        if (!response.ok) throw new Error('Failed to update role');
        
        loadUsers(currentPage, currentSearchTerm);
        showToast('Роль обновлена', 'success');
    } catch (error) {
        console.error('Error updating role:', error);
        showToast('Ошибка обновления роли', 'error');
    }
}

let blockUserId = null;
let blockUserName = '';
let isBlocking = true;

function openBlockUserModal(userId, userName, currentStatus) {
    blockUserId = userId;
    blockUserName = userName;
    isBlocking = currentStatus !== 'blocked';
    
    const modal = document.getElementById('blockUserModal');
    const title = modal.querySelector('#blockUserTitle');
    const message = modal.querySelector('#blockUserMessage');
    const confirmBtn = document.getElementById('confirmBlockBtn');
    
    if (isBlocking) {
        title.textContent = '🔒 Блокировка пользователя';
        message.textContent = `Вы уверены, что хотите заблокировать пользователя "${userName}"?`;
        confirmBtn.textContent = 'Заблокировать';
        confirmBtn.style.backgroundColor = '#dc3545';
    } else {
        title.textContent = '🔓 Разблокировка пользователя';
        message.textContent = `Вы уверены, что хотите разблокировать пользователя "${userName}"?`;
        confirmBtn.textContent = 'Разблокировать';
        confirmBtn.style.backgroundColor = '#10b981';
    }
    
    openModal('blockUserModal');
    
    document.getElementById('confirmBlockBtn').onclick = async () => {
        const newStatus = isBlocking ? 'blocked' : 'active';
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${blockUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) throw new Error('Failed to update status');
            
            closeModal('blockUserModal');
            loadUsers(currentPage, currentSearchTerm);
            showToast(isBlocking ? 'Пользователь заблокирован' : 'Пользователь разблокирован', 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Ошибка изменения статуса', 'error');
        }
    };
}

// Всплывающие уведомления
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

let currentResetUserId = null;

function openResetPasswordModal(userId, username) {
    currentResetUserId = userId;
    document.getElementById('resetUserName').textContent = username;
    document.getElementById('resetNewPassword').value = generateRandomPasswordString();
    openModal('resetPasswordModal');
    
    document.getElementById('confirmResetPasswordBtn').onclick = async () => {
        const newPassword = document.getElementById('resetNewPassword').value.trim();
        if (!newPassword || newPassword.length < 6) {
            showToast('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${currentResetUserId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });
            
            if (!response.ok) throw new Error('Failed to reset password');
            
            closeModal('resetPasswordModal');
            showToast('Пароль успешно изменён', 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            showToast('Ошибка сброса пароля', 'error');
        }
    };
}

function generateRandomPasswordString() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function generateNewPassword() {
    document.getElementById('resetNewPassword').value = generateRandomPasswordString();
}









// ========== УПРАВЛЕНИЕ РОЛЯМИ ==========

let rolesList = [];

// Загрузка ролей
async function loadRoles() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/roles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load roles');
        
        const data = await response.json();
        console.log('Roles API response:', data); // Отладка
        
        rolesList = data.roles || [];
        renderRolesCards();
    } catch (error) {
        console.error('Error loading roles:', error);
        document.getElementById('rolesGrid').innerHTML = '<div style="text-align:center; padding:40px; color:red;">Ошибка загрузки</div>';
    }
}

// Отрисовка карточек ролей
function renderRolesCards() {
    const container = document.getElementById('rolesGrid');
    if (!container) return;
    
    console.log('Roles list:', rolesList); // Отладка
    
    if (!rolesList || rolesList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">📭 Нет ролей</div>';
        return;
    }
    
    container.innerHTML = rolesList.map(role => {
        const isSystem = role.id === 1 || role.id === 2;
        const roleIcon = getRoleIcon(role.name);
        
        return `
            <div class="role-card ${isSystem ? 'system' : ''}" onclick="openRoleModal(${role.id})" style="cursor: pointer;">
                <div class="role-card-header">
                    <div class="role-card-title">
                        <div class="role-card-icon">${roleIcon}</div>
                        <h3>${escapeHtml(role.name)}</h3>
                    </div>
                    ${isSystem ? '<span class="role-card-badge">Системная</span>' : ''}
                </div>
                <div class="role-card-desc">
                    ${getRoleDescription(role.name, role.permissions)}
                </div>
                <div class="role-card-stats">
                    <div class="role-card-users">
                        <span>👥</span>
                        <span>—</span>
                    </div>
                    <div class="role-card-actions" onclick="event.stopPropagation()">
                        ${!isSystem ? `
                            <button class="btn-icon buttonbase" title="Редактировать" onclick="openRoleModal(${role.id})">✏️</button>
                            <button class="btn-icon buttonbase" title="Удалить" onclick="deleteRole(${role.id})" style="color:#dc3545;">🗑️</button>
                        ` : `
                            <button class="btn-icon buttonbase" title="Просмотр" onclick="openRoleModal(${role.id})">👁️</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Иконка для роли
function getRoleIcon(roleName) {
    const name = roleName.toLowerCase();
    if (name.includes('админ')) return '👑';
    if (name.includes('менеджер')) return '📊';
    if (name.includes('пользователь')) return '👤';
    return '⭐';
}

// Описание роли
function getRoleDescription(roleName, permissions) {
    const name = roleName.toLowerCase();
    if (name.includes('админ')) return 'Полный доступ ко всем функциям системы';
    if (name.includes('менеджер')) return 'Управление документами и задачами отдела';
    if (name.includes('пользователь')) return 'Базовый доступ к рабочим функциям';
    return 'Пользовательская роль с настраиваемыми правами';
}

// Открытие модалки редактирования роли
function openEditRoleModal(roleId) {
    const role = rolesList.find(r => r.id === roleId);
    if (!role) return;
    
    // TODO: открыть модалку с формой редактирования
    alert(`Редактирование роли: ${role.name}\nПрава: ${JSON.stringify(role.permissions, null, 2)}`);
}

// Удаление роли
async function deleteRole(roleId) {
    const role = rolesList.find(r => r.id === roleId);
    if (!confirm(`Удалить роль "${role.name}"?`)) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/roles/${roleId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }
        
        loadRoles();
        showToast('Роль удалена', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ========== РЕДАКТОР РОЛЕЙ ==========

let currentEditingRoleId = null;

// Открытие модалки создания/редактирования роли
function openRoleModal(roleId = null) {
    currentEditingRoleId = roleId;
    const modal = document.getElementById('roleEditorModal');
    const title = document.getElementById('roleModalTitle');
    const form = document.getElementById('roleEditorForm');
    
    if (roleId) {
        title.textContent = '✏️ Редактирование роли';
        loadRoleData(roleId);
    } else {
        title.textContent = '👑 Создание новой роли';
        form.reset();
        resetPermissions();
        currentEditingRoleId = null;
    }
    
    openModal('roleEditorModal');
}

// Загрузка данных роли для редактирования
async function loadRoleData(roleId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/roles/${roleId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load role');
        
        const data = await response.json();
        const role = data.role;
        
        const isSystem = role.id === 1 || role.id === 2;
        
        document.getElementById('roleName').value = role.name;
        document.getElementById('roleCode').value = role.code || role.name.toLowerCase().replace(/\s/g, '_');
        document.getElementById('roleDescription').value = role.description || '';
        
        // Блокируем поля для системных ролей
        if (isSystem) {
            document.getElementById('roleName').disabled = true;
            document.getElementById('roleCode').disabled = true;
            document.getElementById('roleDescription').disabled = true;
            document.querySelectorAll('.permission-select').forEach(select => select.disabled = true);
            document.getElementById('roleIsDefault').disabled = true;
            document.getElementById('roleCanDelegate').disabled = true;
            document.getElementById('roleIsSystem').disabled = true;
            document.getElementById('rolePriority').disabled = true;
            document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = true);
        } else {
            // Разблокируем
            document.getElementById('roleName').disabled = false;
            document.getElementById('roleCode').disabled = false;
            document.getElementById('roleDescription').disabled = false;
            document.querySelectorAll('.permission-select').forEach(select => select.disabled = false);
            document.getElementById('roleIsDefault').disabled = false;
            document.getElementById('roleCanDelegate').disabled = false;
            document.getElementById('roleIsSystem').disabled = false;
            document.getElementById('rolePriority').disabled = false;
            document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = false);
        }
        
        // Загружаем права
        if (role.permissions) {
            loadPermissionsToForm(role.permissions);
        }
        
        // Дополнительные настройки
        document.getElementById('roleIsDefault').checked = role.is_default || false;
        document.getElementById('roleCanDelegate').checked = role.can_delegate !== false;
        document.getElementById('roleIsSystem').checked = role.is_system || false;
        document.getElementById('rolePriority').value = role.priority || 'medium';
        
        // Для системных ролей скрываем кнопку сохранения
        const saveBtn = document.querySelector('#roleEditorForm button[type="submit"]');
        if (saveBtn) {
            saveBtn.style.display = isSystem ? 'none' : 'block';
        }
        
    } catch (error) {
        console.error('Error loading role:', error);
        showToast('Ошибка загрузки данных роли', 'error');
    }
}

// Сброс всех разрешений
function resetPermissions() {
    document.querySelectorAll('.permission-select').forEach(select => {
        select.value = 'none';
    });
    
    document.querySelectorAll('.category-checkbox').forEach(cb => {
        cb.checked = false;
    });
}

// Загрузка прав в форму
function loadPermissionsToForm(permissions) {
    for (const [key, value] of Object.entries(permissions)) {
        const select = document.querySelector(`.permission-select[name="${key}"]`);
        if (select) select.value = value;
    }
}

// Сбор данных с формы
function getRoleFormData() {
    const permissions = {};
    
    document.querySelectorAll('.permission-select').forEach(select => {
        permissions[select.name] = select.value;
    });
    
    return {
        name: document.getElementById('roleName').value,
        code: document.getElementById('roleCode').value,
        description: document.getElementById('roleDescription').value,
        permissions: permissions,
        is_default: document.getElementById('roleIsDefault').checked,
        can_delegate: document.getElementById('roleCanDelegate').checked,
        is_system: document.getElementById('roleIsSystem').checked,
        priority: document.getElementById('rolePriority').value
    };
}

// Сохранение роли
document.getElementById('roleEditorForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = getRoleFormData();
    
    if (!formData.name || !formData.code) {
        showToast('Заполните название и код роли', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        let response;
        
        if (currentEditingRoleId) {
            response = await fetch(`/api/admin/roles/${currentEditingRoleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
        } else {
            response = await fetch('/api/admin/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }
        
        closeModal('roleEditorModal');
        loadRoles();
        showToast(currentEditingRoleId ? 'Роль обновлена' : 'Роль создана', 'success');
        
    } catch (error) {
        console.error('Error saving role:', error);
        showToast(error.message, 'error');
    }
});

// Кнопка "Создать роль"
document.getElementById('addRoleBtn')?.addEventListener('click', () => {
    openRoleModal();
});

// Быстрые пресеты прав
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        applyPreset(preset);
    });
});

function applyPreset(preset) {
    const presets = {
        readonly: { documents_view: 'all', tasks_view: 'department', users_view: 'department' },
        user: { documents_view: 'all', documents_create: 'all', tasks_view: 'all', tasks_create: 'all' },
        manager: { documents_view: 'all', documents_create: 'all', documents_approve: 'all', tasks_view: 'all', tasks_create: 'all', tasks_assign: 'department' },
        admin: { admin_access: 'full', admin_roles: 'full', admin_settings: 'full', admin_logs: 'read' }
    };
    
    const presetData = presets[preset] || {};
    for (const [key, value] of Object.entries(presetData)) {
        const select = document.querySelector(`.permission-select[name="${key}"]`);
        if (select) select.value = value;
    }
}





// ========== СТРУКТУРА ОРГАНИЗАЦИИ ==========

// Загрузка структуры
async function loadStructure() {
    const container = document.getElementById('structureContent');
    container.innerHTML = '<div style="text-align: center; padding: 40px;">Загрузка...</div>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load structure');
        
        const data = await response.json();
        renderStructureTree(data.structure || [], data.unassigned || []);
    } catch (error) {
        console.error('Error loading structure:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">❌ Ошибка загрузки структуры</div>';
    }
}

// Отрисовка дерева структуры
function renderStructureTree(departments, unassignedEmployees = []) {
    const container = document.getElementById('structureContent');
    if (!container) return;
    
    let html = '';
    
    // Отрисовка подразделений (если есть)
    if (departments && departments.length > 0) {
        html += '<ul class="structure-group root-group">';
        
        for (const dept of departments) {
            const hasChildren = dept.children && dept.children.length > 0;
            const hasEmployees = dept.employees && dept.employees.length > 0;
            
            html += `
                <li class="structure-group-item" data-dept-id="${dept.id}">
                    <div class="group-header">
                        <button class="toggle-btn" onclick="toggleDepartmentNode(${dept.id})">
                            <span class="toggle-icon">▼</span>
                        </button>
                        <div class="group-info">
                            <h3 class="structure-group-name">${escapeHtml(dept.name)}</h3>
                            <span class="structure-group-number-employe">${dept.employees.length} сотрудников</span>
                        </div>
                        <div class="group-manager">
                            ${dept.manager ? `
                                <h4 class="structure-employe-post manager-post">${escapeHtml(dept.manager.post_name || '—')}</h4>
                                <h5 class="structure-employe-role manager-role">${escapeHtml(dept.manager.role_name || '—')}</h5>
                                <h5 class="structure-employe-person manager-name">${escapeHtml(dept.manager.surname)} ${escapeHtml(dept.manager.name)}</h5>
                                <span class="structure-employe-status manager-status status-${dept.manager.status === 'active' ? 'active' : 'inactive'}">
                                    ${dept.manager.status === 'active' ? 'Активен' : 'Неактивен'}
                                </span>
                            ` : `
                                <h4 class="structure-employe-post manager-post">—</h4>
                                <h5 class="structure-employe-role manager-role">—</h5>
                                <h5 class="structure-employe-person manager-name">Не назначен</h5>
                                <span class="structure-employe-status manager-status status-inactive">—</span>
                            `}
                        </div>
                        <div class="structure-group-actionbuttons">
                            <button class="btn-icon buttonbase" onclick="openAddDepartmentModal(${dept.id})" title="Добавить подразделение">➕</button>
                            <button class="btn-icon buttonbase" onclick="openEditDepartmentModal(${dept.id}, '${escapeHtml(dept.name)}')" title="Редактировать">✏️</button>
                            <button class="btn-icon buttonbase" onclick="deleteDepartment(${dept.id}, '${escapeHtml(dept.name)}')" title="Удалить" style="color:#dc3545;">🗑️</button>
                            <button class="btn-icon buttonbase" onclick="openManagePostsModal(${dept.id}, '${escapeHtml(dept.name)}')" title="Управление должностями">📋</button>
                        </div>
                    </div>
            `;
            
            // Сотрудники отдела
            if (hasEmployees) {
                html += `<ul class="structure-employees" id="employees-${dept.id}">`;
                for (const emp of dept.employees) {
                    html += `
                        <li class="structure-employee-item">
                            <div class="employee-card">
                                <div class="employee-avatar">
                                    <img src="${emp.avatar_uri || '../materials/avatar_for_profile.png'}" alt="Аватар">
                                </div>
                                <div class="employee-info">
                                    <h4 class="structure-employe-post">${escapeHtml(emp.post_name || '—')}</h4>
                                    <h5 class="structure-employe-role">${escapeHtml(emp.surname)} ${escapeHtml(emp.name)}</h5>
                                    <span class="structure-employe-status status-${emp.status === 'active' ? 'active' : 'inactive'}">
                                        ${emp.status === 'active' ? 'Активен' : 'Неактивен'}
                                    </span>
                                </div>
                                <div class="employee-actions">
                                    <button class="btn-icon buttonbase" onclick="openMoveEmployeeModal(${emp.id}, ${dept.id})" title="Переместить">↷</button>
                                    <button class="btn-icon buttonbase" onclick="openEditEmployeeModal(${emp.id})" title="Редактировать">✏️</button>
                                </div>
                            </div>
                        </li>
                    `;
                }
                html += `</ul>`;
            }
            
            // Дочерние подразделения
            if (hasChildren) {
                html += `<div class="structure-subgroups" id="subdepartments-${dept.id}">`;
                html += renderSubtree(dept.children);
                html += `</div>`;
            }
            
            html += `</li>`;
        }
        
        html += `</ul>`;
    }
    
    // ===== СЕКЦИЯ "БЕЗ ОТДЕЛА" =====
    if (unassignedEmployees && unassignedEmployees.length > 0) {
        html += `
            <div class="unassigned-section" style="margin-top: 20px; border-top: 2px dashed var(--c_surf_txt); padding-top: 15px;">
                <div class="section-header" style="margin-bottom: 15px;">
                    <h3 style="color: var(--c_surf_txt);">👥 Без отдела</h3>
                    <span class="unassigned-count">${unassignedEmployees.length} сотрудников</span>
                </div>
                <ul class="structure-employees unassigned-list">
        `;
        
        for (const emp of unassignedEmployees) {
            html += `
                <li class="structure-employee-item">
                    <div class="employee-card">
                        <div class="employee-avatar">
                            <img src="${emp.avatar_uri || '../materials/avatar_for_profile.png'}" alt="Аватар">
                        </div>
                        <div class="employee-info">
                            <h4 class="structure-employe-post">${escapeHtml(emp.post_name || '—')}</h4>
                            <h5 class="structure-employe-role">${escapeHtml(emp.surname)} ${escapeHtml(emp.name)}</h5>
                            <h5 class="structure-employe-person">${escapeHtml(emp.patronymic || '')}</h5>
                            <span class="structure-employe-status status-${emp.status === 'active' ? 'active' : 'inactive'}">
                                ${emp.status === 'active' ? 'Активен' : 'Неактивен'}
                            </span>
                        </div>
                        <div class="employee-actions">
                            <button class="btn-icon buttonbase" onclick="openMoveEmployeeModal(${emp.id}, null)" title="Переместить">↷</button>
                            <button class="btn-icon buttonbase" onclick="openEditEmployeeModal(${emp.id})" title="Редактировать">✏️</button>
                        </div>
                    </div>
                </li>
            `;
        }
        
        html += `
                </ul>
            </div>
        `;
    }
    
    if (html === '') {
        html = '<div style="text-align: center; padding: 40px;">📭 Нет подразделений и сотрудников</div>';
    }
    
    container.innerHTML = html;
}

// Рендер дочерних подразделений (рекурсия)
function renderSubtree(departments) {
    let html = '<ul class="structure-group">';
    
    for (const dept of departments) {
        const hasChildren = dept.children && dept.children.length > 0;
        const hasEmployees = dept.employees && dept.employees.length > 0;
        
        html += `
            <li class="structure-group-item" data-dept-id="${dept.id}">
                <div class="group-header">
                    <button class="toggle-btn" onclick="toggleDepartmentNode(${dept.id})">
                        <span class="toggle-icon">▼</span>
                    </button>
                    <div class="group-info">
                        <h3 class="structure-group-name">${escapeHtml(dept.name)}</h3>
                        <span class="structure-group-number-employe">${dept.employees.length} сотрудников</span>
                    </div>
                    <div class="group-manager">
                        <h4 class="structure-employe-post manager-post">Руководитель</h4>
                        <h5 class="structure-employe-role manager-role">—</h5>
                        <h5 class="structure-employe-person manager-name">—</h5>
                    </div>
                    <div class="structure-group-actionbuttons">
                        <button class="btn-icon buttonbase" onclick="openAddDepartmentModal(${dept.id})" title="Добавить подразделение">➕</button>
                        <button class="btn-icon buttonbase" onclick="openEditDepartmentModal(${dept.id}, '${escapeHtml(dept.name)}')" title="Редактировать">✏️</button>
                        <button class="btn-icon buttonbase" onclick="deleteDepartment(${dept.id}, '${escapeHtml(dept.name)}')" title="Удалить" style="color:#dc3545;">🗑️</button>
                        <button class="btn-icon buttonbase" onclick="openManagePostsModal(${dept.id}, '${escapeHtml(dept.name)}')" title="Управление должностями">📋</button>
                    </div>
                </div>
        `;
        
        // Сотрудники (исключая руководителя)
        const regularEmployees = dept.employees.filter(emp => emp.id !== dept.manager_id);

        if (regularEmployees.length > 0) {
            html += `<ul class="structure-employees" id="employees-${dept.id}">`;
            for (const emp of regularEmployees) {
                html += `
                    <li class="structure-employee-item">
                        <div class="employee-card">
                            <div class="employee-avatar">
                                <img src="${emp.avatar_uri || '../materials/avatar_for_profile.png'}" alt="Аватар">
                            </div>
                            <div class="employee-info">
                                <h4 class="structure-employe-post">${escapeHtml(emp.post_name || '—')}</h4>
                                <h5 class="structure-employe-role">${escapeHtml(emp.surname)} ${escapeHtml(emp.name)}</h5>
                                <h5 class="structure-employe-person">${escapeHtml(emp.patronymic || '')}</h5>
                                <span class="structure-employe-status status-${emp.status === 'active' ? 'active' : 'inactive'}">
                                    ${emp.status === 'active' ? 'Активен' : 'Неактивен'}
                                </span>
                            </div>
                            <div class="employee-actions">
                                <button class="btn-icon buttonbase" onclick="openMoveEmployeeModal(${emp.id}, ${dept.id})" title="Переместить">↷</button>
                                <button class="btn-icon buttonbase" onclick="openEditEmployeeModal(${emp.id})" title="Редактировать">✏️</button>
                            </div>
                        </div>
                    </li>
                `;
            }
            html += `</ul>`;
        }
        
        if (hasChildren) {
            html += `<div class="structure-subgroups" id="subdepartments-${dept.id}">`;
            html += renderSubtree(dept.children);
            html += `</div>`;
        }
        
        html += `</li>`;
    }
    
    html += `</ul>`;
    return html;
}

// Сворачивание/разворачивание
function toggleDepartmentNode(deptId) {
    const subdepts = document.getElementById(`subdepartments-${deptId}`);
    const employees = document.getElementById(`employees-${deptId}`);
    const btn = document.querySelector(`.structure-group-item[data-dept-id="${deptId}"] .toggle-btn .toggle-icon`);
    
    if (subdepts) {
        if (subdepts.style.display === 'none') {
            subdepts.style.display = 'block';
            if (employees) employees.style.display = 'block';
            btn.textContent = '▼';
        } else {
            subdepts.style.display = 'none';
            if (employees) employees.style.display = 'none';
            btn.textContent = '▶';
        }
    } else if (employees) {
        if (employees.style.display === 'none') {
            employees.style.display = 'block';
            btn.textContent = '▼';
        } else {
            employees.style.display = 'none';
            btn.textContent = '▶';
        }
    }
}

// Сворачиваем всё
function collapseAllNodes() {
    document.querySelectorAll('.structure-subgroups, .structure-employees').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll('.toggle-icon').forEach(icon => {
        icon.textContent = '▶';
    });
}

// Разворачиваем всё
function expandAllNodes() {
    document.querySelectorAll('.structure-subgroups, .structure-employees').forEach(el => {
        el.style.display = 'block';
    });
    document.querySelectorAll('.toggle-icon').forEach(icon => {
        icon.textContent = '▼';
    });
}
async function loadDepartmentTreeForSelect(selectId, selectedId = null) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/departments/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load departments');
        
        const data = await response.json();
        const select = document.getElementById(selectId);
        
        if (!select) {
            console.error(`Select with id "${selectId}" not found`);
            return;
        }
        
        select.innerHTML = '<option value="">— Нет (корневое) —</option>';
        
        for (const dept of data.departments) {
            const prefix = '—'.repeat(dept.level) + ' ';
            const selected = selectedId == dept.id ? 'selected' : '';
            select.innerHTML += `<option value="${dept.id}" ${selected}>${prefix}${escapeHtml(dept.name)}</option>`;
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading departments:', error);
        return Promise.reject(error);
    }
}
// Открытие модалки добавления подразделения
async function openAddDepartmentModal(parentId = null) {
    const modal = document.getElementById('addDepartmentModal');
    const title = modal.querySelector('.modal-header h2');
    
    title.textContent = '🏢 Добавление подразделения';
    document.getElementById('departmentEditId').value = '';
    document.getElementById('departmentName').value = '';
    document.getElementById('departmentCode').value = '';
    document.getElementById('departmentDescription').value = '';
    document.getElementById('departmentManagerPosition').value = '';
    document.getElementById('departmentEmail').value = '';
    document.getElementById('departmentPhone').value = '';
    document.getElementById('departmentLocation').value = '';
    document.getElementById('autoAssign').checked = true;
    document.getElementById('notifyManager').checked = true;
    
    await loadDepartmentTreeForSelect('departmentParent', parentId);
    
    if (parentId) {
        document.getElementById('departmentParent').value = parentId;
    }
    
    openModal('addDepartmentModal');
}
async function openEditDepartmentModal(deptId, deptName) {
    const modal = document.getElementById('addDepartmentModal');
    const title = modal.querySelector('.modal-header h2');
    
    title.textContent = '✏️ Редактирование подразделения';
    document.getElementById('departmentEditId').value = deptId;
    document.getElementById('departmentName').value = deptName;
    
    try {
        const token = localStorage.getItem('token');
        
        // Загружаем данные подразделения
        const deptResponse = await fetch(`/api/admin/departments/${deptId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!deptResponse.ok) throw new Error('Failed to load department');
        
        const deptData = await deptResponse.json();
        const dept = deptData.department;
        
        document.getElementById('departmentCode').value = dept.code || '';
        document.getElementById('departmentDescription').value = dept.description || '';
        document.getElementById('departmentManagerPosition').value = dept.manager_position || '';
        document.getElementById('departmentEmail').value = dept.email || '';
        document.getElementById('departmentPhone').value = dept.phone || '';
        document.getElementById('departmentLocation').value = dept.location || '';
        
        // Загружаем список сотрудников отдела для выбора руководителя
        await loadDepartmentEmployeesForSelect(deptId, dept.manager_id);
        
        // Загружаем дерево подразделений для выбора родителя
        await loadDepartmentTreeForSelect('departmentParent', deptId);
        if (dept.parent_department_id) {
            document.getElementById('departmentParent').value = dept.parent_department_id;
        }
        
        openModal('addDepartmentModal');
    } catch (error) {
        console.error('Error loading department:', error);
        showToast('Ошибка загрузки данных подразделения', 'error');
        closeModal('addDepartmentModal');
    }
}

// Загрузка сотрудников отдела для селекта руководителя
async function loadDepartmentEmployeesForSelect(departmentId, selectedManagerId = null) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/departments/${departmentId}/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load employees');
        
        const data = await response.json();
        const select = document.getElementById('departmentManager');
        
        if (!select) {
            console.error('Select "departmentManager" not found');
            return;
        }
        
        select.innerHTML = '<option value="">— Не назначен —</option>';
        
        for (const emp of data.employees) {
            const selected = selectedManagerId == emp.id ? 'selected' : '';
            select.innerHTML += `<option value="${emp.id}" ${selected}>${escapeHtml(emp.surname)} ${escapeHtml(emp.name)} ${escapeHtml(emp.patronymic || '')}</option>`;
        }
    } catch (error) {
        console.error('Error loading department employees:', error);
    }
}
// Сохранение подразделения
document.getElementById('addDepartmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const editId = document.getElementById('departmentEditId').value;
    const name = document.getElementById('departmentName').value.trim();
    const parentId = document.getElementById('departmentParent').value || null;
    const code = document.getElementById('departmentCode').value;
    const description = document.getElementById('departmentDescription').value;
    const managerPosition = document.getElementById('departmentManagerPosition').value;
    const managerId = document.getElementById('departmentManager').value || null;  // ← ДОБАВИТЬ ЭТУ СТРОКУ
    const email = document.getElementById('departmentEmail').value;
    const phone = document.getElementById('departmentPhone').value;
    const location = document.getElementById('departmentLocation').value;
    
    if (!name) {
        showToast('Введите название подразделения', 'error');
        return;
    }
    
    const data = {
        name, 
        parentDepartmentId: parentId, 
        code, 
        description,
        managerPosition, 
        managerId,
        email, 
        phone, 
        location
    };
    
    try {
        const token = localStorage.getItem('token');
        let response;
        
        if (editId) {
            response = await fetch(`/api/admin/departments/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/admin/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save department');
        }
        
        closeModal('addDepartmentModal');
        loadStructure();
        showToast(editId ? 'Подразделение обновлено' : 'Подразделение создано', 'success');
    } catch (error) {
        console.error('Error saving department:', error);
        showToast(error.message, 'error');
    }
});

// ========== УНИВЕРСАЛЬНАЯ МОДАЛКА ПОДТВЕРЖДЕНИЯ ==========

let pendingDeleteAction = null;

function showConfirmDelete(title, message, onConfirm) {
    document.getElementById('confirmDeleteTitle').textContent = title;
    document.getElementById('confirmDeleteMessage').textContent = message;
    pendingDeleteAction = onConfirm;
    openModal('confirmDeleteModal');
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
    if (pendingDeleteAction) {
        pendingDeleteAction();
        pendingDeleteAction = null;
    }
    closeModal('confirmDeleteModal');
});
function deleteDepartment(deptId, deptName) {
    // Закрываем текущую модалку (если открыта)
    closeModal('managePostsModal');
    
    showConfirmDelete(
        '🗑️ Удаление подразделения',
        `Вы уверены, что хотите удалить подразделение "${deptName}"? Все сотрудники будут перемещены в "Без отдела".`,
        async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/admin/departments/${deptId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error);
                }
                
                loadStructure();
                showToast('Подразделение удалено', 'success');
            } catch (error) {
                console.error('Error deleting department:', error);
                showToast(error.message, 'error');
            }
        }
    );
}

function deletePostWithConfirm(postId, postName) {
    showConfirmDelete(
        '🗑️ Удаление должности',
        `Вы уверены, что хотите удалить должность "${postName}"? Сотрудники с этой должностью останутся без должности.`,
        async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/admin/posts/${postId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to delete post');
                }
                
                // Обновляем список должностей в открытой модалке
                const departmentId = document.getElementById('managePostsDepartmentId').value;
                await loadPostsForDepartment(departmentId);
                
                // Обновляем структуру
                loadStructure();
                
                showToast('Должность удалена', 'success');
            } catch (error) {
                console.error('Error deleting post:', error);
                showToast(error.message, 'error');
            }
        }
    );
}
// ========== ПЕРЕМЕЩЕНИЕ СОТРУДНИКОВ ==========

let currentMoveEmployee = null;

// Открытие модалки перемещения
async function openMoveEmployeeModal(employeeId, currentDeptId) {
    currentMoveEmployee = { id: employeeId, currentDeptId };
    
    // Загружаем данные сотрудника
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${employeeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load employee');
        
        const data = await response.json();
        const user = data.user;
        document.getElementById('moveEmployeeId').value = employeeId;
        // При изменении отдела обновляем список должностей
        document.getElementById('moveDepartmentId').addEventListener('change', async () => {
            const deptId = document.getElementById('moveDepartmentId').value;
            if (deptId) {
                await loadPostsForDepartmentSelect('movePostId', deptId);
            } else {
                document.getElementById('movePostId').innerHTML = '<option value="">— Сначала выберите отдел —</option>';
            }
        });
        document.getElementById('moveEmployeeName').value = `${user.surname} ${user.name} ${user.patronymic || ''}`;
        
        // Загружаем список подразделений
        await loadDepartmentsForSelect('moveDepartmentId', currentDeptId);
        
        // Загружаем список должностей
        await loadPostsForSelect('movePostId');
        
        openModal('moveEmployeeModal');
    } catch (error) {
        console.error('Error loading employee:', error);
        showToast('Ошибка загрузки данных сотрудника', 'error');
    }
}

// Загрузка списка подразделений для селекта
async function loadDepartmentsForSelect(selectId, selectedId = null) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/departments/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load departments');
        
        const data = await response.json();
        const select = document.getElementById(selectId);
        
        if (!select) return;
        
        select.innerHTML = '<option value="">— Выберите подразделение —</option>';
        
        for (const dept of data.departments) {
            const prefix = '—'.repeat(dept.level) + ' ';
            select.innerHTML += `<option value="${dept.id}">${prefix}${escapeHtml(dept.name)}</option>`;
        }
        
        // ПРИНУДИТЕЛЬНО устанавливаем значение ПОСЛЕ заполнения
        if (selectedId) {
            select.value = selectedId;
            console.log('Department select set to:', select.value, 'expected:', selectedId);
            
            // Проверка: если не установилось, пробуем через setTimeout
            if (select.value != selectedId) {
                setTimeout(() => {
                    select.value = selectedId;
                    console.log('Department select retry set to:', select.value);
                }, 100);
            }
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}
// Загрузка списка должностей
async function loadPostsForSelect(selectId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/posts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load posts');
        
        const data = await response.json();
        const select = document.getElementById(selectId);
        
        select.innerHTML = '<option value="">— Оставить текущую —</option>';
        
        for (const post of data.posts) {
            select.innerHTML += `<option value="${post.id}">${escapeHtml(post.name)} (${escapeHtml(post.department_name || '—')})</option>`;
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

// Подтверждение перемещения
async function confirmMoveEmployee() {
    const employeeId = document.getElementById('moveEmployeeId').value;
    const departmentId = document.getElementById('moveDepartmentId').value;
    const postId = document.getElementById('movePostId').value || null;
    
    if (!departmentId) {
        showToast('Выберите подразделение', 'error');
        return;
    }
    
    if (!employeeId) {
        showToast('Ошибка: ID сотрудника не найден', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/employees/${employeeId}/move`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ departmentId: parseInt(departmentId), postId: postId ? parseInt(postId) : null })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to move employee');
        }
        
        closeModal('moveEmployeeModal');
        loadStructure();
        showToast('Сотрудник перемещён', 'success');
    } catch (error) {
        console.error('Error moving employee:', error);
        showToast(error.message, 'error');
    }
}



// ========== РЕДАКТИРОВАНИЕ СОТРУДНИКА ==========

async function openEditEmployeeModal(employeeId) {
    const modal = document.getElementById('editEmployeeModal');
    if (!modal) return;
    
    document.getElementById('editEmployeeId').value = employeeId;
    
    try {
        const token = localStorage.getItem('token');
        
        // Загружаем данные сотрудника
        const userResponse = await fetch(`/api/admin/users/${employeeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!userResponse.ok) throw new Error('Failed to load user');
        const userData = await userResponse.json();
        const user = userData.user;
        
        // Заполняем карточку пользователя
        document.getElementById('editEmployeeFullName').textContent = `${user.surname || ''} ${user.name || ''} ${user.patronymic || ''}`;
        document.getElementById('editEmployeeUsername').textContent = `@${user.username || ''}`;

        // Загружаем список подразделений и устанавливаем текущее значение
        await loadDepartmentsForSelect('editEmployeeDepartment', user.department_id);
        
        // Загружаем список должностей для выбранного отдела и устанавливаем текущее значение
        if (user.department_id) {
            await loadPostsForDepartmentSelect('editEmployeePost', user.department_id, user.post_id);
        } else {
            const postSelect = document.getElementById('editEmployeePost');
            postSelect.innerHTML = '<option value="">— Сначала выберите отдел —</option>';
        }
        
        // При изменении отдела обновляем список должностей
        const departmentSelect = document.getElementById('editEmployeeDepartment');
        const newDepartmentSelect = departmentSelect.cloneNode(true);
        departmentSelect.parentNode.replaceChild(newDepartmentSelect, departmentSelect);
        
        newDepartmentSelect.onchange = () => {
            const deptId = newDepartmentSelect.value;
            if (deptId) {
                loadPostsForDepartmentSelect('editEmployeePost', deptId);
            } else {
                const postSelect = document.getElementById('editEmployeePost');
                postSelect.innerHTML = '<option value="">— Сначала выберите отдел —</option>';
            }
        };
        
        openModal('editEmployeeModal');
    } catch (error) {
        console.error('Error loading employee:', error);
        showToast('Ошибка загрузки данных сотрудника', 'error');
    }
}

async function loadDepartmentsForSelect(selectId, selectedId = null) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/departments/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load departments');
        
        const data = await response.json();
        const select = document.getElementById(selectId);
        
        if (!select) return;
        
        select.innerHTML = '<option value="">— Выберите подразделение —</option>';
        
        for (const dept of data.departments) {
            const prefix = '—'.repeat(dept.level) + ' ';
            const selected = selectedId == dept.id ? 'selected' : '';
            select.innerHTML += `<option value="${dept.id}" ${selected}>${prefix}${escapeHtml(dept.name)}</option>`;
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}
async function loadPostsForDepartmentSelect(selectId, departmentId) {
    if (!departmentId) {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">— Сначала выберите подразделение —</option>';
        }
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/posts/department/${departmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load posts');
        
        const data = await response.json();
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">— Не выбрана —</option>';
        
        for (const post of data.posts) {
            select.innerHTML += `<option value="${post.id}">${escapeHtml(post.name)}</option>`;
        }
    } catch (error) {
        console.error('Error loading posts for select:', error);
    }
}

// Сохранение изменений сотрудника
async function saveEmployeeEdit() {
    const employeeId = document.getElementById('editEmployeeId').value;
    const departmentId = document.getElementById('editEmployeeDepartment').value || null;
    const postId = document.getElementById('editEmployeePost').value || null;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${employeeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                departmentId: departmentId,
                postId: postId
            })
        });
        
        if (!response.ok) throw new Error('Failed to update employee');
        
        closeModal('editEmployeeModal');
        loadStructure();
        loadUsers(currentPage, currentSearchTerm);
        showToast('Данные сотрудника обновлены', 'success');
    } catch (error) {
        console.error('Error saving employee:', error);
        showToast('Ошибка сохранения', 'error');
    }
}

// ========== УПРАВЛЕНИЕ ДОЛЖНОСТЯМИ ==========

let currentDepartmentPosts = null;

// Открытие модалки управления должностями
async function openManagePostsModal(departmentId, departmentName) {
    document.getElementById('managePostsTitle').textContent = `📋 Должности: ${departmentName}`;
    document.getElementById('managePostsDepartmentId').value = departmentId;
    document.getElementById('newPostName').value = '';
    
    await loadPostsForDepartment(departmentId);
    openModal('managePostsModal');
}

// Загрузка должностей для отдела
async function loadPostsForDepartment(departmentId) {
    const container = document.getElementById('postsList');
    container.innerHTML = '<div style="text-align: center; padding: 20px;">Загрузка...</div>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/posts/department/${departmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load posts');
        
        const data = await response.json();
        const posts = data.posts || [];
        
        if (posts.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Нет должностей</div>';
            return;
        }
        
        container.innerHTML = posts.map(post => `
            <div class="post-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eef2f6;">
                <span>📌 ${escapeHtml(post.name)}</span>
                <button class="btn-icon buttonbase" onclick="deletePostWithConfirm(${post.id}, '${escapeHtml(post.name)}')" style="color: #dc3545;" title="Удалить">🗑️</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading posts:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Ошибка загрузки</div>';
    }
}

// Добавление должности
async function addPost() {
    const departmentId = document.getElementById('managePostsDepartmentId').value;
    const name = document.getElementById('newPostName').value.trim();
    
    if (!name) {
        showToast('Введите название должности', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, departmentId })
        });
        
        if (!response.ok) throw new Error('Failed to add post');
        
        document.getElementById('newPostName').value = '';
        await loadPostsForDepartment(departmentId);
        showToast('Должность добавлена', 'success');
    } catch (error) {
        console.error('Error adding post:', error);
        showToast('Ошибка добавления должности', 'error');
    }
}

// Удаление должности
async function deletePost(postId) {
    if (!confirm('Удалить эту должность? Сотрудники с этой должностью останутся без должности.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete post');
        
        const departmentId = document.getElementById('managePostsDepartmentId').value;
        await loadPostsForDepartment(departmentId);
        showToast('Должность удалена', 'success');
    } catch (error) {
        console.error('Error deleting post:', error);
        showToast('Ошибка удаления должности', 'error');
    }
}