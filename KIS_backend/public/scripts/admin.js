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
    loadSystemSettings();
    initSystemSettingsHandlers();
});

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




// ========== ЕДИНЫЙ ОБРАБОТЧИК ИНИЦИАЛИЗАЦИИ ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin page initializing...');
    
    // 1. Проверка авторизации и загрузка пользователя
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
        
        // Загружаем права роли
        let hasAdminAccess = user.is_super_admin === true;
        
        if (!hasAdminAccess && user.role_id) {
            try {
                const permResponse = await fetch(`/api/admin/roles/${user.role_id}/permissions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (permResponse.ok) {
                    const permData = await permResponse.json();
                    window.currentUser.permissions = permData.permissions;
                    hasAdminAccess = permData.permissions?.admin_panel === true;
                }
            } catch (e) {
                console.error('Failed to load permissions:', e);
            }
        }
        
        if (!hasAdminAccess) {
            window.location.href = '/html/base.html';
            return;
        }
        
        // 2. Загружаем права и данные
        await loadUserPermissions();
        
        // 3. Устанавливаем активную секцию (ТОЛЬКО ПЕРВУЮ)
        const firstVisibleSection = getFirstVisibleSection();
        if (firstVisibleSection) {
            // Скрываем ВСЕ секции
            document.querySelectorAll('.admin-section').forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });
            // Показываем только нужную
            firstVisibleSection.style.display = 'block';
            firstVisibleSection.classList.add('active');
            
            // Активируем соответствующую кнопку в навигации
            const activeNavBtn = document.querySelector(`.nav-btn[data-section="${firstVisibleSection.id.replace('-section', '')}"]`);
            if (activeNavBtn) {
                document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                activeNavBtn.classList.add('active');
            }
        }
        
        // 4. Загружаем остальные данные (асинхронно, они не влияют на отображение секций)
        loadUsers();
        loadStructure();
        loadRoles();
        loadSystemSettings();
        
        // 5. Инициализируем обработчики
        initEventListeners();
        
    } catch (error) {
        console.error('Admin page error:', error);
        window.location.href = '/html/login.html';
    }
});

// Функция для определения первой доступной секции
function getFirstVisibleSection() {
    const sections = [
        { id: 'users-section', permission: hasPermission('users', 'view') },
        { id: 'templates-section', permission: hasPermission('templates', 'view') },
        { id: 'structure-section', permission: hasPermission('structure', 'view') },
        { id: 'roles-section', permission: hasPermission('roles', 'view') },
        { id: 'system-section', permission: hasPermission('settings', 'view') },
        { id: 'reports-section', permission: hasPermission('stats', 'view') }
    ];
    
    for (const section of sections) {
        if (section.permission) {
            const element = document.getElementById(section.id);
            if (element) return element;
        }
    }
    
    // Если ничего не подошло — показываем users-section как дефолт
    return document.getElementById('users-section');
}

// Инициализация обработчиков событий
function initEventListeners() {
    // Кнопки навигации
    const btn_users = document.querySelector('#nav-btn-users');
    const btn_templates = document.querySelector('#nav-btn-templates');
    const btn_system = document.querySelector('#nav-btn-system');
    const btn_reports = document.querySelector('#nav-btn-reports');
    const btn_structure = document.querySelector('#nav-btn-structure');
    const btn_roles = document.querySelector('#nav-btn-roles');
    const btn_addUser = document.querySelector('#addUserBtn');
    
    if (btn_users) btn_users.addEventListener('click', (e) => {
        e.stopPropagation();
        openAdminSection('users-section');
        setActiveNavButton(btn_users);
    });
    
    if (btn_templates) btn_templates.addEventListener('click', (e) => {
        e.stopPropagation();
        openAdminSection('templates-section');
        setActiveNavButton(btn_templates);
    });
    
    if (btn_system) btn_system.addEventListener('click', (e) => {
        e.stopPropagation();
        openAdminSection('system-section');
        setActiveNavButton(btn_system);
        loadSystemSettings();
        initSystemSettingsHandlers();
    });
    
    if (btn_reports) btn_reports.addEventListener('click', (e) => {
        e.stopPropagation();
        openAdminSection('reports-section');
        setActiveNavButton(btn_reports);
    });
    
    if (btn_structure) btn_structure.addEventListener('click', (e) => {
        e.stopPropagation();
        openAdminSection('structure-section');
        setActiveNavButton(btn_structure);
        loadStructure();
    });
    
    if (btn_roles) btn_roles.addEventListener('click', (e) => {
        e.stopPropagation();
        openAdminSection('roles-section');
        setActiveNavButton(btn_roles);
        loadRoles();
    });
    
    if (btn_addUser) {
        btn_addUser.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('addUserModal');
        });
    }
    
    // Кнопка добавления корневого подразделения
    document.getElementById('addMainDepartmentBtn')?.addEventListener('click', () => {
        openAddDepartmentModal(null);
    });

    // Кнопки сворачивания/разворачивания
    document.getElementById('collapseAllBtn')?.addEventListener('click', collapseAllNodes);
    document.getElementById('expandAllBtn')?.addEventListener('click', expandAllNodes);
}

// Функция открытия секции
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

// Установка активной кнопки
function setActiveNavButton(activeButton) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (activeButton) {
        activeButton.classList.add('active');
    }
}




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
        // При редактировании скрываем поле пароля или делаем необязательным
        const passwordGroup = document.querySelector('#userPassword').closest('.form-group');
        if (passwordGroup) passwordGroup.style.display = 'none';
    } else {
        title.textContent = '👤 Добавление пользователя';
        submitBtn.textContent = 'Добавить пользователя';
        
        // Показываем поле пароля
        const passwordGroup = document.querySelector('#userPassword').closest('.form-group');
        if (passwordGroup) passwordGroup.style.display = 'block';
        
        // Генерируем пароль
        generateRandomPasswordField();
        
        // Загружаем роли
        loadRolesForUserForm();
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

function generateLogin() {
    const surname = document.getElementById('userLastName').value.trim();
    const name = document.getElementById('userFirstName').value.trim();
    
    if (surname && name) {
        const login = generateLoginFromName(surname, name);
        document.getElementById('userLogin').value = login;
    }
}

// Функция для генерации логина из имени и фамилии
function generateLoginFromName(surname, name) {
    if (!surname || !name) return '';
    
    // Транслитерация
    const translitMap = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
        'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
        'с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh',
        'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
    };
    
    let surnameLat = '';
    for (let char of surname.toLowerCase()) {
        surnameLat += translitMap[char] || char;
    }
    
    let nameFirstLat = '';
    const firstChar = name.charAt(0).toLowerCase();
    nameFirstLat += translitMap[firstChar] || firstChar;
    
    let login = `${surnameLat}.${nameFirstLat}`;
    login = login.replace(/[^a-z0-9.]/g, '').toLowerCase();
    if (login.length > 50) login = login.substring(0, 50);
    
    return login;
}

// // Генерация пароля
// function generateRandomPassword() {
//     const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
//     let password = '';
//     for (let i = 0; i < 12; i++) {
//         password += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
//     document.getElementById('userPassword').value = password;
// }

// Навешиваем обработчики на поля ввода
document.getElementById('userLastName')?.addEventListener('input', generateLoginFromFields);
document.getElementById('userFirstName')?.addEventListener('input', generateLoginFromFields);

// Кнопка генерации пароля
document.getElementById('generatePasswordBtn')?.addEventListener('click', generateRandomPasswordField);

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
            // Редактирование (не меняем пароль)
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
                    roleId: parseInt(formData.roleId)
                })
            });
        } else {
            // Создание пользователя — отправляем пароль
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
                    password: formData.password,  // ← ОТПРАВЛЯЕМ ПАРОЛЬ
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
        
        // Очищаем форму
        document.getElementById('addUserForm').reset();
        currentEditingUserId = null;
        
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
    
    const currentUser = window.currentUser;
    const isSuperAdmin = currentUser?.is_super_admin === true;
    
    // Проверяем права на действия
    const canEdit = hasPermission('users', 'edit');
    const canBlock = hasPermission('users', 'block');
    const canDelete = hasPermission('users', 'delete');
    const canCreate = hasPermission('users', 'create');
    const canChangeRole = hasPermission('users', 'edit');
    const canViewAllUsers = hasPermission('users', 'view_all') || isSuperAdmin;
    
    // Скрываем кнопку добавления, если нет прав на создание
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.style.display = canCreate ? 'flex' : 'none';
    }
    
    // Фильтруем пользователей в зависимости от прав
    let filteredUsers = users;
    if (!canViewAllUsers && !isSuperAdmin) {
        // Показываем только пользователей из своего отдела
        filteredUsers = users.filter(user => user.department_id === currentUser?.department_id);
    }
    // Если пользователь НЕ супер-админ и НЕ имеет права просмотра всех пользователей
    if (!isSuperAdmin && !hasPermission('users', 'view_all')) {
        // Показываем только пользователей из своего отдела
        filteredUsers = users.filter(user => user.department_id === currentUser?.department_id);
    }
    
    // Супер-админ видит всех, остальные не видят супер-админов
    if (!isSuperAdmin) {
        filteredUsers = filteredUsers.filter(user => !user.is_super_admin);
    }
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px;">📭 Нет доступных пользователей</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => {
        const isSuperAdminUser = user.is_super_admin === true;
        const isCurrentUser = user.id === currentUser?.id;
        
        // Права на действия
        const canEditThisUser = canEdit && !isSuperAdminUser;
        const canBlockThisUser = canBlock && !isSuperAdminUser && !isCurrentUser;
        const canDeleteThisUser = canDelete && !isSuperAdminUser && !isCurrentUser;
        const canResetPasswordUser = (hasPermission('users', 'reset_password') || isSuperAdmin) && !isSuperAdminUser;
        
        return `
            <tr ${isSuperAdminUser ? 'style="background: rgba(255, 215, 0, 0.1);"' : ''}>
                <td>${user.id}</td>
                <td>
                    <strong>${escapeHtml(user.surname)} ${escapeHtml(user.name)}</strong>
                    ${user.patronymic ? ` ${escapeHtml(user.patronymic)}` : ''}
                    <br><small style="color:#999;">@${escapeHtml(user.username)}</small>
                    ${isSuperAdminUser ? '<span class="role-badge super-admin">👑 Супер-админ</span>' : ''}
                </td>
                <td>${escapeHtml(user.post_name || '-')}</td>
                <td>${escapeHtml(user.department_name || '-')}</td>
                <td>
                    <select class="role-select" data-user-id="${user.id}" 
                        onchange="updateUserRole(${user.id}, this.value)" 
                        ${!canChangeRole || isSuperAdminUser ? 'disabled' : ''}>
                        <option value="1" ${user.role_id === 1 ? 'selected' : ''}>👑 Администратор</option>
                        <option value="2" ${user.role_id === 2 ? 'selected' : ''}>👤 Пользователь</option>
                    </select>
                </td>
                <td>${getStatusBadge(user.status)}</td>
                <td>
                    <button class="btn-icon buttonbase" title="Информация" onclick="openUserInfoModal(${user.id})">ℹ️</button>
                    ${canEditThisUser ? `<button class="btn-icon buttonbase" title="Редактировать" onclick="openUserModal(${user.id})">✏️</button>` : ''}
                    ${canBlockThisUser ? `<button class="btn-icon buttonbase" title="${user.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}" onclick="openBlockUserModal(${user.id}, '${escapeHtml(user.surname)} ${escapeHtml(user.name)}', '${user.status}')">${user.status === 'blocked' ? '🔓' : '🔒'}</button>` : ''}
                    ${canResetPasswordUser ? `<button class="btn-icon buttonbase" title="Сбросить пароль" onclick="openResetPasswordModal(${user.id}, '${escapeHtml(user.username)}')">🔑</button>` : ''}
                    ${canDeleteThisUser ? `<button class="btn-icon buttonbase" title="Удалить" onclick="deleteUser(${user.id})" style="color: #dc3545;">🗑️</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
    
    // Обновляем пагинацию
    const start = (currentPage - 1) * usersPerPage + 1;
    const end = Math.min(currentPage * usersPerPage, filteredUsers.length);
    document.getElementById('showingFrom').textContent = filteredUsers.length === 0 ? 0 : start;
    document.getElementById('showingTo').textContent = end;
    document.getElementById('totalCount').textContent = filteredUsers.length;
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
            
            // Если заблокировали пользователя — показываем уведомление
            if (isBlocking) {
                showToast(`Пользователь "${userName}" заблокирован`, 'warning');
            } else {
                showToast(`Пользователь "${userName}" разблокирован`, 'success');
            }
            
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
    document.getElementById('resetNewPassword').value = generateRandomPassword(12);
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
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }
            
            closeModal('resetPasswordModal');
            showToast(`Пароль успешно изменён на: ${newPassword}`, 'success');
            
        } catch (error) {
            console.error('Error resetting password:', error);
            showToast(error.message, 'error');
        }
    };
}

function generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function generateNewPassword() {
    document.getElementById('resetNewPassword').value = generateRandomPasswordString();
}
// Генерация и вставка пароля в поле
function generateRandomPasswordField() {
    const passwordField = document.getElementById('userPassword');
    if (passwordField) {
        const newPassword = generateRandomPassword(12);
        passwordField.value = newPassword;
        showToast('Пароль сгенерирован', 'success');
    } else {
        console.error('Password field not found');
    }
}

// Автогенерация логина при вводе имени/фамилии
function generateLoginFromFields() {
    const surname = document.getElementById('userLastName')?.value.trim();
    const name = document.getElementById('userFirstName')?.value.trim();
    const loginField = document.getElementById('userLogin');
    
    if (surname && name && loginField) {
        // Транслитерация
        const translitMap = {
            'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
            'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
            'с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh',
            'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
            'А':'a','Б':'b','В':'v','Г':'g','Д':'d','Е':'e','Ё':'e','Ж':'zh','З':'z',
            'И':'i','Й':'y','К':'k','Л':'l','М':'m','Н':'n','О':'o','П':'p','Р':'r',
            'С':'s','Т':'t','У':'u','Ф':'f','Х':'h','Ц':'ts','Ч':'ch','Ш':'sh',
            'Щ':'sch','Ъ':'','Ы':'y','Ь':'','Э':'e','Ю':'yu','Я':'ya'
        };
        
        let surnameLat = '';
        for (let char of surname) {
            surnameLat += translitMap[char] || char;
        }
        
        let nameFirstLat = '';
        const firstChar = name.charAt(0);
        nameFirstLat += translitMap[firstChar] || firstChar;
        
        let login = `${surnameLat}.${nameFirstLat}`.toLowerCase();
        login = login.replace(/[^a-z0-9.]/g, '');
        
        if (login.length > 50) login = login.substring(0, 50);
        
        loginField.value = login;
    }
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
    
    if (!rolesList || rolesList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">📭 Нет ролей</div>';
        return;
    }
    
    const canEditRoles = hasPermission('roles', 'edit');
    const canDeleteRoles = hasPermission('roles', 'delete');
    
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
                        ${canEditRoles && !isSystem ? `<button class="btn-icon buttonbase" title="Редактировать" onclick="openRoleModal(${role.id})">✏️</button>` : ''}
                        ${canDeleteRoles && !isSystem ? `<button class="btn-icon buttonbase" title="Удалить" onclick="deleteRole(${role.id})" style="color:#dc3545;">🗑️</button>` : ''}
                        ${!canEditRoles && !canDeleteRoles && isSystem ? `<button class="btn-icon buttonbase" title="Просмотр" onclick="openRoleModal(${role.id})">👁️</button>` : ''}
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
    
    // Собираем права из всех select
    document.querySelectorAll('.permission-select').forEach(select => {
        const resource = select.dataset.resource;
        const action = select.dataset.action;
        
        if (!permissions[resource]) {
            permissions[resource] = {};
        }
        
        const value = select.value;
        if (value !== 'none') {
            permissions[resource][action] = value === 'all' ? true : value;
        }
    });
    
    return {
        name: document.getElementById('roleName').value,
        code: document.getElementById('roleCode').value,
        description: document.getElementById('roleDescription').value,
        permissions: permissions,
        admin_panel: document.getElementById('adminPanelAccess').checked,
        is_default: document.getElementById('roleIsDefault').checked,
        is_system: document.getElementById('roleIsSystem').checked
    };
}

// Загрузка данных роли в форму
function loadRoleToForm(role) {
    document.getElementById('roleName').value = role.name;
    document.getElementById('roleCode').value = role.code || '';
    document.getElementById('roleDescription').value = role.description || '';
    document.getElementById('adminPanelAccess').checked = role.permissions?.admin_panel === true;
    document.getElementById('roleIsDefault').checked = role.is_default || false;
    document.getElementById('roleIsSystem').checked = role.is_system || false;
    
    // Загружаем права
    const permissions = role.permissions || {};
    document.querySelectorAll('.permission-select').forEach(select => {
        const resource = select.dataset.resource;
        const action = select.dataset.action;
        const value = permissions[resource]?.[action];
        
        if (value === true) {
            select.value = 'all';
        } else if (value === false || value === 'none') {
            select.value = 'none';
        } else if (value === 'own') {
            select.value = 'own';
        } else {
            select.value = 'none';
        }
    });
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
            
            // ОПРЕДЕЛЯЕМ, ЯВЛЯЕТСЯ ЛИ ПОДРАЗДЕЛЕНИЕ КОРНЕВЫМ
            // Корневое — у которого нет parent_department_id
            const isRootDepartment = !dept.parent_department_id;
            const rootClass = isRootDepartment ? 'root-department' : '';
            
            html += `
                <li class="structure-group-item ${rootClass}" data-dept-id="${dept.id}">
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
function renderSubtree(children) {
    let html = '<ul class="structure-group">';
    
    for (const child of children) {
        const hasChildren = child.children && child.children.length > 0;
        const hasEmployees = child.employees && child.employees.length > 0;
        
        // Корневое подразделение — только на верхнем уровне, в дочерних эта проверка не нужна,
        // но оставим для единообразия
        const isRootDepartment = !child.parent_department_id;
        const rootClass = isRootDepartment ? 'root-department' : '';
        
        html += `
            <li class="structure-group-item ${rootClass}" data-dept-id="${child.id}">
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














// ========== СИСТЕМНЫЕ НАСТРОЙКИ ==========

let currentSettings = {};

// Загрузка настроек
async function loadSystemSettings() {
    const container = document.getElementById('settingsContainer');
    container.innerHTML = '<div style="text-align: center; padding: 40px;">Загрузка...</div>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load settings');
        
        const data = await response.json();
        currentSettings = data.settings;
        renderSettingsForm();
    } catch (error) {
        console.error('Error loading settings:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">❌ Ошибка загрузки настроек</div>';
    }
}

// Отрисовка формы настроек
function renderSettingsForm() {
    const container = document.getElementById('settingsContainer');
    
    container.innerHTML = `
        <!-- Общие настройки -->
        <div class="settings-card">
            <div class="settings-card-header">
                <div class="settings-card-icon">🏢</div>
                <div>
                    <h3 class="settings-card-title">Общие настройки</h3>
                    <p class="settings-card-description">Основные параметры системы</p>
                </div>
            </div>
            <div class="settings-card-content">
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Название организации *</span>
                        <span class="settings-card-hint">Отображается в системе и документах. Также используется как название головного подразделения.</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="text" id="org_name" class="setting-input" value="${escapeHtml(currentSettings.org_name || '')}" style="width: 250px;" required>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Автонумерация документов</span>
                        <span class="settings-card-hint">Автоматическая генерация номеров документов</span>
                    </div>
                    <div class="settings-card-control">
                        <select id="auto_numbering" class="setting-select">
                            <option value="auto" ${currentSettings.auto_numbering === 'auto' ? 'selected' : ''}>Автоматическая</option>
                            <option value="manual" ${currentSettings.auto_numbering === 'manual' ? 'selected' : ''}>Ручная</option>
                        </select>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Контактный email</span>
                        <span class="settings-card-hint">Для связи с поддержкой</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="email" id="org_email" class="setting-input" value="${escapeHtml(currentSettings.org_email || 'info@company.ru')}" style="width: 250px;">
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Контактный телефон</span>
                        <span class="settings-card-hint">Для связи с поддержкой</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="text" id="org_phone" class="setting-input" value="${escapeHtml(currentSettings.org_phone || '+7 (495) 000-00-00')}" style="width: 250px;">
                    </div>
                </div>
            </div>
        </div>

        <!-- Документооборот -->
        <div class="settings-card">
            <div class="settings-card-header">
                <div class="settings-card-icon">📄</div>
                <div>
                    <h3 class="settings-card-title">Документооборот</h3>
                    <p class="settings-card-description">Настройки работы с документами и файлами</p>
                </div>
            </div>
            <div class="settings-card-content">
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Автоархивация документов</span>
                        <span class="settings-card-hint">Документы автоматически архивируются через указанное количество дней</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="number" id="auto_archive_days" class="setting-input" value="${currentSettings.auto_archive_days || 365}" min="30" max="3650" style="width: 100px;">
                        <span class="setting-unit">дней</span>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Максимальный размер файла</span>
                        <span class="settings-card-hint">Ограничение размера загружаемых файлов</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="number" id="max_file_size" class="setting-input" value="${currentSettings.max_file_size || 50}" min="1" max="500" style="width: 100px;">
                        <span class="setting-unit">МБ</span>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Разрешенные типы файлов</span>
                        <span class="settings-card-hint">Форматы файлов, разрешенные для загрузки</span>
                    </div>
                    <div class="settings-card-control">
                        <select id="allowed_file_types" class="setting-select" multiple size="5" style="width: 200px;">
                            <option value="pdf" ${currentSettings.allowed_file_types?.includes('pdf') ? 'selected' : ''}>PDF</option>
                            <option value="doc" ${currentSettings.allowed_file_types?.includes('doc') ? 'selected' : ''}>Word</option>
                            <option value="xls" ${currentSettings.allowed_file_types?.includes('xls') ? 'selected' : ''}>Excel</option>
                            <option value="jpg" ${currentSettings.allowed_file_types?.includes('jpg') ? 'selected' : ''}>Изображения</option>
                            <option value="txt" ${currentSettings.allowed_file_types?.includes('txt') ? 'selected' : ''}>Текстовые файлы</option>
                        </select>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Хранилище</span>
                        <span class="settings-card-hint">Путь к хранилищу файлов</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="text" id="storage_path" class="setting-input" value="${escapeHtml(currentSettings.storage_path || './uploads')}" style="width: 250px;">
                    </div>
                </div>
            </div>
        </div>

        <!-- Безопасность -->
        <div class="settings-card">
            <div class="settings-card-header">
                <div class="settings-card-icon">🔒</div>
                <div>
                    <h3 class="settings-card-title">Безопасность</h3>
                    <p class="settings-card-description">Настройки безопасности и доступа</p>
                </div>
            </div>
            <div class="settings-card-content">
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Срок действия сессии</span>
                        <span class="settings-card-hint">Время бездействия до автоматического выхода</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="number" id="session_timeout" class="setting-input" value="${currentSettings.session_timeout || 8}" min="1" max="24" style="width: 80px;">
                        <span class="setting-unit">часов</span>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Минимальная длина пароля</span>
                        <span class="settings-card-hint">Безопасность учетных записей</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="number" id="password_min_length" class="setting-input" value="${currentSettings.password_min_length || 6}" min="6" max="20" style="width: 80px;">
                        <span class="setting-unit">символов</span>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Требовать спецсимволы</span>
                        <span class="settings-card-hint">!@#$% в пароле</span>
                    </div>
                    <div class="settings-card-control">
                        <label class="switch">
                            <input type="checkbox" id="password_require_special" ${currentSettings.password_require_special ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Двухфакторная аутентификация</span>
                        <span class="settings-card-hint">Дополнительный уровень защиты</span>
                    </div>
                    <div class="settings-card-control">
                        <label class="switch">
                            <input type="checkbox" id="enable_2fa" ${currentSettings.enable_2fa ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Резервное копирование -->
        <div class="settings-card">
            <div class="settings-card-header">
                <div class="settings-card-icon">💾</div>
                <div>
                    <h3 class="settings-card-title">Резервное копирование</h3>
                    <p class="settings-card-description">Настройки автоматического резервного копирования данных</p>
                </div>
            </div>
            <div class="settings-card-content">
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Автоматическое копирование</span>
                        <span class="settings-card-hint">Периодичность создания резервных копий</span>
                    </div>
                    <div class="settings-card-control">
                        <select id="backup_schedule" class="setting-select">
                            <option value="disabled" ${currentSettings.backup_schedule === 'disabled' ? 'selected' : ''}>Отключено</option>
                            <option value="daily" ${currentSettings.backup_schedule === 'daily' ? 'selected' : ''}>Ежедневно</option>
                            <option value="weekly" ${currentSettings.backup_schedule === 'weekly' ? 'selected' : ''}>Еженедельно</option>
                            <option value="monthly" ${currentSettings.backup_schedule === 'monthly' ? 'selected' : ''}>Ежемесячно</option>
                        </select>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Время создания бэкапа</span>
                        <span class="settings-card-hint">Время для автоматического создания копий</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="time" id="backup_time" class="setting-input" value="${currentSettings.backup_time || '02:00'}" style="width: 120px;">
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Хранить бэкапы</span>
                        <span class="settings-card-hint">Срок хранения резервных копий</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="number" id="backup_retention_days" class="setting-input" value="${currentSettings.backup_retention_days || 30}" min="7" max="365" style="width: 80px;">
                        <span class="setting-unit">дней</span>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Создать новый бэкап</span>
                        <span class="settings-card-hint">Создаёт полную копию базы данных</span>
                    </div>
                    <div class="settings-card-control">
                        <button class="buttonbase" id="createBackupBtn">➕ Создать бэкап</button>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Список бэкапов</span>
                        <span class="settings-card-hint">Доступные резервные копии</span>
                    </div>
                    <div class="settings-card-control">
                        <button class="buttonbase" id="viewBackupsBtn">📋 Показать бэкапы</button>
                    </div>
                </div>
                
            </div>
        </div>

        <!-- Системные уведомления -->
        <div class="settings-card">
            <div class="settings-card-header">
                <div class="settings-card-icon">🔔</div>
                <div>
                    <h3 class="settings-card-title">Системные уведомления</h3>
                    <p class="settings-card-description">Настройки оповещений о системных событиях</p>
                </div>
            </div>
            <div class="settings-card-content">
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Email для уведомлений</span>
                        <span class="settings-card-hint">Адрес для получения системных оповещений</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="email" id="notify_email" class="setting-input" value="${escapeHtml(currentSettings.notify_email || 'admin@company.ru')}" style="width: 250px;">
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Критические ошибки</span>
                        <span class="settings-card-hint">Уведомлять о критических сбоях системы</span>
                    </div>
                    <div class="settings-card-control">
                        <label class="switch">
                            <input type="checkbox" id="notify_critical_errors" ${currentSettings.notify_critical_errors !== false ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Подозрительная активность</span>
                        <span class="settings-card-hint">Оповещения о необычных действиях пользователей</span>
                    </div>
                    <div class="settings-card-control">
                        <label class="switch">
                            <input type="checkbox" id="notify_suspicious" ${currentSettings.notify_suspicious !== false ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Логи и мониторинг -->
        <div class="settings-card">
            <div class="settings-card-header">
                <div class="settings-card-icon">📊</div>
                <div>
                    <h3 class="settings-card-title">Логи и мониторинг</h3>
                    <p class="settings-card-description">Настройки логирования и отслеживания системы</p>
                </div>
            </div>
            <div class="settings-card-content">
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Уровень логирования</span>
                        <span class="settings-card-hint">Детализация информации в системных логах</span>
                    </div>
                    <div class="settings-card-control">
                        <select id="log_level" class="setting-select">
                            <option value="error" ${currentSettings.log_level === 'error' ? 'selected' : ''}>Только ошибки</option>
                            <option value="warn" ${currentSettings.log_level === 'warn' ? 'selected' : ''}>Предупреждения и ошибки</option>
                            <option value="info" ${currentSettings.log_level === 'info' ? 'selected' : ''}>Вся информация</option>
                            <option value="debug" ${currentSettings.log_level === 'debug' ? 'selected' : ''}>Отладочная информация</option>
                        </select>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Хранить логи</span>
                        <span class="settings-card-hint">Срок хранения системных логов</span>
                    </div>
                    <div class="settings-card-control">
                        <input type="number" id="log_retention_days" class="setting-input" value="${currentSettings.log_retention_days || 90}" min="7" max="365" style="width: 80px;">
                        <span class="setting-unit">дней</span>
                    </div>
                </div>
                <div class="settings-card-item">
                    <div class="settings-card-info">
                        <span class="settings-card-label">Статус мониторинга</span>
                        <span class="settings-card-hint">Текущее состояние системы мониторинга</span>
                    </div>
                    <div class="settings-card-control">
                        <span class="settings-status status-active">Активен</span>
                    </div>
                </div>
                <div class="settings-card-actions">
                    <button class="buttonbase" id="viewLogsBtn">📋 Просмотр логов</button>
                    <button class="buttonbase" id="viewStatsBtn">📈 Статистика</button>
                </div>
            </div>
        </div>
    `;
    initSettingsButtons();
}

// Сохранение настроек
async function saveSystemSettings() {
    const settings = {
        // Общие
        org_name: document.getElementById('org_name')?.value || '',
        auto_numbering: document.getElementById('auto_numbering')?.value || 'auto',
        org_email: document.getElementById('org_email')?.value || '',
        org_phone: document.getElementById('org_phone')?.value || '',
        
        // Документооборот
        auto_archive_days: parseInt(document.getElementById('auto_archive_days')?.value) || 365,
        max_file_size: parseInt(document.getElementById('max_file_size')?.value) || 50,
        allowed_file_types: Array.from(document.getElementById('allowed_file_types')?.selectedOptions || []).map(opt => opt.value),
        storage_path: document.getElementById('storage_path')?.value || './uploads',
        
        // Безопасность
        session_timeout: parseInt(document.getElementById('session_timeout')?.value) || 8,
        password_min_length: parseInt(document.getElementById('password_min_length')?.value) || 6,
        password_require_special: document.getElementById('password_require_special')?.checked || false,
        enable_2fa: document.getElementById('enable_2fa')?.checked || false,
        
        // Резервное копирование
        backup_schedule: document.getElementById('backup_schedule')?.value || 'disabled',
        backup_time: document.getElementById('backup_time')?.value || '02:00',
        backup_retention_days: parseInt(document.getElementById('backup_retention_days')?.value) || 30,
        
        // Уведомления
        notify_email: document.getElementById('notify_email')?.value || '',
        notify_critical_errors: document.getElementById('notify_critical_errors')?.checked || false,
        notify_suspicious: document.getElementById('notify_suspicious')?.checked || false,
        
        // Логи
        log_level: document.getElementById('log_level')?.value || 'info',
        log_retention_days: parseInt(document.getElementById('log_retention_days')?.value) || 90
    };
    
    console.log('Saving settings:', settings);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save settings');
        }
        
        showToast('Настройки сохранены', 'success');
        
        // Перезагружаем настройки для обновления формы
        await loadSystemSettings();
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Ошибка сохранения настроек: ' + error.message, 'error');
    }
}

// Сброс настроек
async function resetSystemSettings() {
    if (!confirm('Сбросить все настройки к значениям по умолчанию?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/settings/reset', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to reset settings');
        
        showToast('Настройки сброшены', 'success');
        loadSystemSettings();
    } catch (error) {
        console.error('Error resetting settings:', error);
        showToast('Ошибка сброса настроек', 'error');
    }
}

// Создание бэкапа (заглушка)
async function createBackupNow() {
    showToast('Функция в разработке', 'info');
}

// Инициализация обработчиков для системных настроек
function initSystemSettingsHandlers() {
    const saveBtn = document.getElementById('saveSystemSettings');
    const resetBtn = document.getElementById('resetSettingsBtn');
    const backupBtn = document.getElementById('createBackupNowBtn');
    
    if (saveBtn) saveBtn.onclick = saveSystemSettings;
    if (resetBtn) resetBtn.onclick = resetSystemSettings;
    if (backupBtn) backupBtn.onclick = createBackupNow;
}
// Инициализация головного подразделения при первом запуске
async function initRootDepartment() {
    // Проверяем, есть ли уже подразделения
    const { query } = require('../config/database');

    const check = await query(`SELECT COUNT(*) FROM departments`);
    if (parseInt(check.rows[0].count) === 0) {
        // Получаем название организации из настроек
        const orgNameResult = await query(
            `SELECT setting_value FROM system_settings WHERE setting_key = 'org_name'`
        );
        const orgName = orgNameResult.rows[0]?.setting_value || 'Головной офис';
        
        // Создаём корневое подразделение
        await query(
            `INSERT INTO departments (name, parent_department_id) VALUES ($1, NULL)`,
            [orgName]
        );
        console.log('✅ Создано головное подразделение:', orgName);
    }
}
function initSettingsButtons() {
    // Кнопка сохранения настроек
    const saveSettingsBtn = document.getElementById('saveSystemSettings');
    if (saveSettingsBtn) {
        // Удаляем старый обработчик, чтобы не дублировать
        const newSaveBtn = saveSettingsBtn.cloneNode(true);
        saveSettingsBtn.parentNode.replaceChild(newSaveBtn, saveSettingsBtn);
        newSaveBtn.onclick = saveSystemSettings;
    }
    
    // Кнопка "Создать бэкап"
    const createBackupBtn = document.getElementById('createBackupBtn');
    if (createBackupBtn) {
        const newBtn = createBackupBtn.cloneNode(true);
        createBackupBtn.parentNode.replaceChild(newBtn, createBackupBtn);
        newBtn.onclick = async () => {
            showToast('Создание резервной копии...', 'info');
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/admin/backup/create', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) throw new Error('Failed to create backup');
                
                const data = await response.json();
                showToast(`Бэкап создан: ${data.filename} (${data.size})`, 'success');
            } catch (error) {
                console.error('Backup error:', error);
                showToast('Ошибка создания бэкапа', 'error');
            }
        };
    }
    
    // Кнопка "Показать бэкапы"
    const viewBackupsBtn = document.getElementById('viewBackupsBtn');
    if (viewBackupsBtn) {
        const newBtn = viewBackupsBtn.cloneNode(true);
        viewBackupsBtn.parentNode.replaceChild(newBtn, viewBackupsBtn);
        newBtn.onclick = openBackupsModal;
    }
    
    // Кнопка "Просмотр логов"
    const viewLogsBtn = document.getElementById('viewLogsBtn');
    if (viewLogsBtn) {
        const newBtn = viewLogsBtn.cloneNode(true);
        viewLogsBtn.parentNode.replaceChild(newBtn, viewLogsBtn);
        newBtn.onclick = openLogsModal;
    }
    
    // Кнопка "Статистика"
    const viewStatsBtn = document.getElementById('viewStatsBtn');
    if (viewStatsBtn) {
        const newBtn = viewStatsBtn.cloneNode(true);
        viewStatsBtn.parentNode.replaceChild(newBtn, viewStatsBtn);
        newBtn.onclick = openStatsModal;
    }
}
async function openLogsModal() {
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 80vh;">
            <div class="modal-header">
                <h2>📋 Системные логи</h2>
                <button class="modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y: auto;">
                <div class="logs-filters">
                    <select id="logFilter" class="log-filter-select">
                        <option value="all">📋 Все</option>
                        <option value="error">❌ Ошибки</option>
                        <option value="warn">⚠️ Предупреждения</option>
                        <option value="info">ℹ️ Информация</option>
                    </select>
                    <div class="logs-actions">
                        <button class="buttonbase" id="refreshLogsBtn" style="padding: 6px 12px;">🔄 Обновить</button>
                        <button class="buttonbase" id="exportLogsBtn" style="padding: 6px 12px;">📎 Экспорт</button>
                    </div>
                </div>
                <div class="logs-container" id="logsContainer">
                    <div class="empty-logs">
                        <div class="empty-icon">📭</div>
                        <p>Загрузка логов...</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="buttonbase" onclick="this.closest('.admin-modal').remove()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    await loadLogs();
    
    document.getElementById('refreshLogsBtn').onclick = () => loadLogs();
    document.getElementById('exportLogsBtn').onclick = () => exportLogs();
    document.getElementById('logFilter').onchange = () => loadLogs();
}

async function loadLogs() {
    const container = document.getElementById('logsContainer');
    const filter = document.getElementById('logFilter')?.value || 'all';
    
    container.innerHTML = '<div class="empty-logs"><div class="empty-icon">⏳</div><p>Загрузка...</p></div>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/logs?filter=${filter}&limit=200`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load logs');
        
        const data = await response.json();
        const logs = data.logs || [];
        
        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-logs"><div class="empty-icon">📭</div><p>Нет записей</p></div>';
            return;
        }
        
        container.innerHTML = logs.map(log => {
            let levelClass = '';
            let levelIcon = '📌';
            
            if (log.action === 'LOGIN') {
                levelClass = 'log-info';
                levelIcon = '🔐';
            } else if (log.action === 'LOGOUT') {
                levelClass = 'log-info';
                levelIcon = '🚪';
            } else if (log.action.includes('DELETE')) {
                levelClass = 'log-warn';
                levelIcon = '🗑️';
            } else if (log.action.includes('ERROR')) {
                levelClass = 'log-error';
                levelIcon = '❌';
            } else if (log.action.includes('UPDATE')) {
                levelClass = 'log-info';
                levelIcon = '✏️';
            } else if (log.action.includes('CREATE') || log.action.includes('POST')) {
                levelClass = 'log-info';
                levelIcon = '➕';
            }
            
            return `
                <div class="log-entry ${levelClass}">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span class="log-level">${levelIcon}</span>
                        <span class="log-time">${new Date(log.created_at).toLocaleString()}</span>
                        <span class="log-message">
                            <strong>${escapeHtml(log.action)}</strong>
                            ${log.entity_type ? `<span style="color: #666;"> — ${escapeHtml(log.entity_type)}</span>` : ''}
                            ${log.entity_id ? `<span style="color: #999;"> (ID: ${log.entity_id})</span>` : ''}
                        </span>
                        ${log.user_id ? `<span style="color: #999; font-size: 11px;">user: ${log.user_id}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading logs:', error);
        container.innerHTML = '<div class="empty-logs"><div class="empty-icon">❌</div><p>Ошибка загрузки логов</p></div>';
    }
}

function exportLogs() {
    const logsContainer = document.getElementById('logsContainer');
    const logsText = logsContainer.innerText;
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Логи экспортированы', 'success');
}
async function openStatsModal() {
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 650px;">
            <div class="modal-header">
                <h2>📈 Системная статистика</h2>
                <button class="modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="statsContainer" style="min-height: 300px;">
                    <div style="text-align: center; padding: 40px;">
                        <div class="empty-icon">⏳</div>
                        <p>Загрузка статистики...</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="buttonbase" onclick="this.closest('.admin-modal').remove()">Закрыть</button>
                <button class="buttonbase" id="refreshStatsBtn">🔄 Обновить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    await loadStats();
    
    document.getElementById('refreshStatsBtn').onclick = () => loadStats();
}

async function loadStats() {
    const container = document.getElementById('statsContainer');
    
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="empty-icon">⏳</div><p>Загрузка статистики...</p></div>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const data = await response.json();
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stats-card">
                    <div class="stats-number">${data.total_users || 0}</div>
                    <div class="stats-label">Всего пользователей</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number">${data.active_users || 0}</div>
                    <div class="stats-label">Активных сегодня</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number">${data.total_chats || 0}</div>
                    <div class="stats-label">Всего чатов</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number">${data.total_messages || 0}</div>
                    <div class="stats-label">Сообщений</div>
                </div>
            </div>
            
            <div class="stats-section">
                <h4>📊 Детальная статистика</h4>
                <div class="stats-detail-row">
                    <span class="stats-detail-label">👥 Групповые чаты</span>
                    <span class="stats-detail-value">${data.group_chats || 0}</span>
                </div>
                <div class="stats-detail-row">
                    <span class="stats-detail-label">💬 Личные чаты</span>
                    <span class="stats-detail-value">${data.private_chats || 0}</span>
                </div>
                <div class="stats-detail-row">
                    <span class="stats-detail-label">📎 Всего файлов</span>
                    <span class="stats-detail-value">${data.total_files || 0}</span>
                </div>
                <div class="stats-detail-row">
                    <span class="stats-detail-label">👥 Заблокированных пользователей</span>
                    <span class="stats-detail-value">${data.blocked_users || 0}</span>
                </div>
                <div class="stats-detail-row">
                    <span class="stats-detail-label">📅 Новых пользователей за месяц</span>
                    <span class="stats-detail-value">${data.new_users_month || 0}</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading stats:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">❌ Ошибка загрузки статистики</div>';
    }
}
// Вызываем при старте сервера (после подключения к БД)
initRootDepartment().catch(console.error);







// ========== УПРАВЛЕНИЕ БЭКАПАМИ ==========

// Создание бэкапа
document.getElementById('createBackupBtn')?.addEventListener('click', async () => {
    try {
        showToast('Создание резервной копии...', 'info');
        
        const response = await fetch('/api/admin/backup/create', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`Бэкап создан: ${data.filename} (${data.size})`, 'success');
            // Обновляем список бэкапов
            if (typeof loadBackupsList === 'function') {
                loadBackupsList();
            }
        } else {
            showToast(data.error || 'Ошибка создания бэкапа', 'error');
        }
    } catch (error) {
        console.error('Backup error:', error);
        showToast('Ошибка создания бэкапа', 'error');
    }
});

// Просмотр списка бэкапов
document.getElementById('viewBackupsBtn')?.addEventListener('click', async () => {
    await openBackupsModal();
});

async function openBackupsModal() {
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh;">
            <div class="modal-header">
                <h2>💾 Список резервных копий</h2>
                <button class="modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y: auto;">
                <div id="backupsListContainer">
                    <div style="text-align: center; padding: 40px;">Загрузка...</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="buttonbase" onclick="this.closest('.admin-modal').remove()">Закрыть</button>
                <button class="buttonbase" id="refreshBackupsBtn">🔄 Обновить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    await loadBackupsList();
    
    document.getElementById('refreshBackupsBtn').onclick = () => loadBackupsList();
}

async function loadBackupsList() {
    const container = document.getElementById('backupsListContainer');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/backup/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load backups');
        
        const data = await response.json();
        const backups = data.backups || [];
        
        if (backups.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px;">📭 Нет резервных копий</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Имя файла</th>
                        <th>Размер</th>
                        <th>Кто создал</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${backups.map(backup => `
                        <tr>
                            <td>${new Date(backup.created_at).toLocaleString()}</td>
                            <td>${escapeHtml(backup.filename)}</td>
                            <td>${backup.size_formatted || '—'}</td>
                            <td>${escapeHtml(backup.surname || '')} ${escapeHtml(backup.name || '')}</td>
                            <td>
                                <button class="btn-icon buttonbase" onclick="downloadBackup(${backup.id})" title="Скачать">📥</button>
                                <button class="btn-icon buttonbase" onclick="restoreBackup(${backup.id})" title="Восстановить" style="color:#ffc107;">🔄</button>
                                <button class="btn-icon buttonbase" onclick="deleteBackup(${backup.id})" title="Удалить" style="color:#dc3545;">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading backups:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">❌ Ошибка загрузки</div>';
    }
}

async function downloadBackup(backupId) {
    try {
        const token = localStorage.getItem('token');
        window.open(`/api/admin/backup/download/${backupId}?token=${token}`, '_blank');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Ошибка скачивания', 'error');
    }
}

async function deleteBackup(backupId) {
    if (!confirm('Удалить эту резервную копию?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/backup/${backupId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete backup');
        
        showToast('Бэкап удалён', 'success');
        loadBackupsList();
    } catch (error) {
        console.error('Delete backup error:', error);
        showToast('Ошибка удаления', 'error');
    }
}

async function restoreBackup(backupId) {
    if (!confirm('Восстановить базу данных из этого бэкапа? Все текущие данные будут заменены!')) return;
    
    showToast('Восстановление...', 'info');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/backup/restore/${backupId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to restore backup');
        
        showToast('База данных восстановлена! Перезагрузите страницу.', 'success');
    } catch (error) {
        console.error('Restore error:', error);
        showToast('Ошибка восстановления', 'error');
    }
}

// ========== УПРАВЛЕНИЕ ПРАВАМИ ДОСТУПА ==========

let currentUserPermissions = {};

// Загрузка прав текущего пользователя
async function loadUserPermissions() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Получаем текущего пользователя
        const userResponse = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userResponse.ok) {
            const userData = await userResponse.json();
            window.currentUser = userData.user;
            
            // Если пользователь не супер-админ, загружаем его права из роли
            if (!window.currentUser.is_super_admin && window.currentUser.role_id) {
                const permResponse = await fetch(`/api/admin/roles/${window.currentUser.role_id}/permissions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (permResponse.ok) {
                    const permData = await permResponse.json();
                    currentUserPermissions = permData.permissions || {};
                }
            } else if (window.currentUser.is_super_admin) {
                // Супер-админ имеет все права
                currentUserPermissions = { admin_panel: true };
            }
        }
        
        console.log('📋 User permissions loaded:', currentUserPermissions);
        
        // После загрузки прав применяем их к интерфейсу
        applyPermissionsToUI();
        
    } catch (error) {
        console.error('Error loading permissions:', error);
    }
}

// Проверка конкретного права
function hasPermission(resource, action = 'view') {
    // Супер-админ имеет все права
    if (window.currentUser?.is_super_admin) return true;
    
    // Проверяем право в загруженных правах
    const resourcePerm = currentUserPermissions[resource];
    if (!resourcePerm) return false;
    
    // Если resourcePerm — это объект с действиями
    if (typeof resourcePerm === 'object') {
        return resourcePerm[action] === true;
    }
    
    // Если resourcePerm — это просто true/false (полный доступ к ресурсу)
    return resourcePerm === true;
}

// Проверка доступа к админ-панели
function canAccessAdminPanel() {
    if (window.currentUser?.is_super_admin) return true;
    return currentUserPermissions.admin_panel === true;
}
// Применение прав доступа к интерфейсу
function applyPermissionsToUI() {
    console.log('🔒 Applying permissions to UI...');
    
    // Проверяем, есть ли у пользователя права
    const canViewUsers = hasPermission('users', 'view');
    const canViewTemplates = hasPermission('templates', 'view');
    const canViewSettings = hasPermission('settings', 'view');
    const canViewStats = hasPermission('stats', 'view');
    const canViewStructure = hasPermission('structure', 'view');
    const canViewRoles = hasPermission('roles', 'view');
    
    // Скрываем/показываем вкладки в навигации
    const navItems = {
        'users-section': canViewUsers,
        'templates-section': canViewTemplates,
        'system-section': canViewSettings,
        'reports-section': canViewStats,
        'structure-section': canViewStructure,
        'roles-section': canViewRoles
    };
    
    for (const [sectionId, visible] of Object.entries(navItems)) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = visible ? 'block' : 'none';
        }
        
        // Также скрываем кнопки навигации
        const navBtn = document.querySelector(`.nav-btn[data-section="${sectionId.replace('-section', '')}"]`);
        if (navBtn) {
            navBtn.style.display = visible ? 'flex' : 'none';
        }
    }
    
    // Если ни одного раздела не доступно — редирект
    const hasAnyAccess = Object.values(navItems).some(v => v === true);
    if (!hasAnyAccess && !window.currentUser?.is_super_admin) {
        console.warn('No admin sections accessible, redirecting...');
        window.location.href = '/html/base.html';
        return;
    }
    
    // Кнопка добавления пользователя
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.style.display = hasPermission('users', 'create') ? 'flex' : 'none';
    }
    
    // Кнопки структуры
    const structureAddBtn = document.getElementById('addMainDepartmentBtn');
    if (structureAddBtn) {
        structureAddBtn.style.display = hasPermission('structure', 'edit') ? 'flex' : 'none';
    }
    
    // Кнопки настроек
    const saveSettingsBtn = document.getElementById('saveSystemSettings');
    if (saveSettingsBtn) {
        saveSettingsBtn.style.display = hasPermission('settings', 'edit') ? 'flex' : 'none';
    }
    
    // Кнопки бэкапов
    const createBackupBtn = document.getElementById('createBackupBtn');
    if (createBackupBtn) {
        createBackupBtn.style.display = hasPermission('backup', 'create') ? 'flex' : 'none';
    }
    
    // Кнопки ролей
    const addRoleBtn = document.getElementById('addRoleBtn');
    if (addRoleBtn) {
        addRoleBtn.style.display = hasPermission('roles', 'create') ? 'flex' : 'none';
    }
    
    console.log('✅ Permissions applied to UI');
}
