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
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
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

function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('userPassword').value = password;
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

function openUserModal(userId = null) {
    currentEditingUserId = userId;
    
    const modal = document.getElementById('addUserModal');
    const title = modal.querySelector('.modal-header h2');
    const submitBtn = modal.querySelector('.modal-footer button[type="submit"]');
    
    if (userId) {
        title.textContent = '✏️ Редактирование сотрудника';
        submitBtn.textContent = 'Сохранить изменения';
        loadUserDataToForm(userId);
    } else {
        title.textContent = '👤 Добавление сотрудника';
        submitBtn.textContent = 'Добавить сотрудника';
        clearForm();
        generateCredentials();
    }
    
    openModal('addUserModal');
}

// Загрузка данных пользователя в форму (для редактирования)
async function loadUserDataToForm(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load user');
        
        const data = await response.json();
        const user = data.user;
        
        document.getElementById('userLastName').value = user.surname || '';
        document.getElementById('userFirstName').value = user.name || '';
        document.getElementById('userMiddleName').value = user.patronymic || '';
        document.getElementById('userBirthDate').value = user.birthday ? user.birthday.split('T')[0] : '';
        document.getElementById('userPhone').value = user.tel_num || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPosition').value = user.post_name || '';
        document.getElementById('userDepartment').value = user.department_id || '';
        document.getElementById('userStartDate').value = user.created_at ? user.created_at.split('T')[0] : '';
        document.getElementById('userLogin').value = user.username || '';
        document.getElementById('userPassword').value = '••••••••';
        
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showToast('Ошибка загрузки данных', 'error');
        closeModal('addUserModal');
    }
}

// Очистка формы
function clearForm() {
    document.getElementById('addUserForm').reset();
    currentEditingUserId = null;
}

// Генерация логина и пароля
function generateCredentials() {
    const lastName = document.getElementById('userLastName').value;
    const firstName = document.getElementById('userFirstName').value;
    
    if (lastName && firstName) {
        const login = `${lastName.toLowerCase()}.${firstName.charAt(0).toLowerCase()}`;
        document.getElementById('userLogin').value = login;
        generatePassword();
    }
}

function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('userPassword').value = password;
}

// Получение данных из формы
function getFormData() {
    return {
        username: document.getElementById('userLogin').value,
        surname: document.getElementById('userLastName').value,
        name: document.getElementById('userFirstName').value,
        patronymic: document.getElementById('userMiddleName').value,
        birthday: document.getElementById('userBirthDate').value,
        email: document.getElementById('userEmail').value,
        telNum: document.getElementById('userPhone').value,
        password: document.getElementById('userPassword').value,
        postId: 1, // временно, потом можно доработать
        departmentId: 1, // временно
        roleId: 2 // по умолчанию пользователь
    };
}

// Отправка формы
document.getElementById('addUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = getFormData();
    
    // Валидация
    if (!formData.username || !formData.surname || !formData.name || !formData.email || !formData.telNum || !formData.password) {
        showToast('Заполните все обязательные поля', 'error');
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
                body: JSON.stringify(formData)
            });
        } else {
            // Создание нового пользователя
            response = await fetch('/api/admin/users', {
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
            throw new Error(error.error || 'Operation failed');
        }
        
        closeModal('addUserModal');
        loadUsers(currentPage, currentSearchTerm);
        showToast(currentEditingUserId ? 'Пользователь обновлён' : 'Пользователь создан', 'success');
        clearForm();
        
    } catch (error) {
        console.error('Error saving user:', error);
        showToast(error.message, 'error');
    }
});

// Автогенерация при вводе имени/фамилии
document.getElementById('userLastName').addEventListener('blur', generateCredentials);
document.getElementById('userFirstName').addEventListener('blur', generateCredentials);

function fillFormWithUserData(userId) {
    const userData = getUserDataById(userId);
    document.getElementById('userLastName').value = userData.lastName;
    document.getElementById('userFirstName').value = userData.firstName;
}

function clearForm() {
    document.getElementById('addUserForm').reset();
    currentEditingUserId = null;
}

document.getElementById('addUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (currentEditingUserId) {
        updateUser(currentEditingUserId, getFormData());
    } else {
        createUser(getFormData());
    }
});






let currentViewedUserId = null;

function openUserInfo(userId) {
    currentViewedUserId = userId;
    const userData = getUserData(userId);
    populateUserInfo(userData);
    loadUserHistory(userId, 30);
    openModal('userInfoModal');
}

function getUserData(userId) {
    return {
        id: userId,
        fullName: "Иванов Иван Иванович",
        position: "Системный администратор",
        department: "ИТ отдел",
        email: "ivanov@company.ru",
        phone: "+7 (000) 000-00-00",
        birthDate: "1985-03-15",
        hireDate: "2020-01-10",
        login: "ivanov.i",
        role: "admin",
        lastLogin: "2024-01-20 14:30",
        status: "active",
        stats: {
            documentsCreated: 24,
            tasksCompleted: 156,
            approvalsDone: 89,
            activeProcesses: 5
        }
    };
}

function populateUserInfo(userData) {
    document.getElementById('info-user-name').textContent = userData.fullName;
    document.getElementById('info-user-position').textContent = userData.position;
    document.getElementById('info-user-email').textContent = `📧 ${userData.email}`;
    document.getElementById('info-user-phone').textContent = `📞 ${userData.phone}`;
    const age = calculateAge(userData.birthDate);
    const experience = calculateExperience(userData.hireDate);
    document.getElementById('info-user-birthdate').textContent = formatDate(userData.birthDate);
    document.getElementById('info-user-age').textContent = `${age} лет`;
    document.getElementById('info-user-department').textContent = userData.department;
    document.getElementById('info-user-hiredate').textContent = formatDate(userData.hireDate);
    document.getElementById('info-user-experience').textContent = experience;
    document.getElementById('info-user-login').textContent = userData.login;
    document.getElementById('info-user-lastlogin').textContent = userData.lastLogin;
    const roleSelect = document.querySelector('.role-select-small');
    roleSelect.value = userData.role;
    document.getElementById('info-docs-created').textContent = userData.stats.documentsCreated;
    document.getElementById('info-tasks-completed').textContent = userData.stats.tasksCompleted;
    document.getElementById('info-approvals-done').textContent = userData.stats.approvalsDone;
    document.getElementById('info-active-processes').textContent = userData.stats.activeProcesses;
    const statusBadge = document.querySelector('.user-status-badge');
    statusBadge.className = `user-status-badge status-${userData.status}`;
    statusBadge.textContent = userData.status === 'active' ? 'Активен' : 
                              userData.status === 'inactive' ? 'Неактивен' : 'В отпуске';
}
function loadUserHistory(userId, days) {
    const timeline = document.getElementById('userHistoryTimeline');
    timeline.innerHTML = '<div class="loading">Загрузка истории...</div>';
    setTimeout(() => {
        const historyData = generateMockHistory(days);
        renderHistoryTimeline(historyData);
    }, 500);
}
function generateMockHistory(days) {
    const actions = [
        { icon: '📄', text: 'Создал документ', doc: 'Отчёт за квартал' },
        { icon: '✅', text: 'Завершил задачу', doc: 'Подготовка презентации' },
        { icon: '🔄', text: 'Отправил на согласование', doc: 'Договор с поставщиком' },
        { icon: '👥', text: 'Назначил исполнителя', doc: 'Задача T-001234' },
        { icon: '📊', text: 'Сгенерировал отчёт', doc: 'Статистика за месяц' }
    ];
    
    const history = [];
    const now = new Date();
    
    for (let i = 0; i < 15; i++) {
        const randomDaysAgo = Math.floor(Math.random() * days);
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        const date = new Date(now);
        date.setDate(date.getDate() - randomDaysAgo);
        
        history.push({
            time: formatDateTime(date),
            action: randomAction
        });
    }
    
    return history.sort((a, b) => new Date(b.time) - new Date(a.time));
}
function renderHistoryTimeline(history) {
    const timeline = document.getElementById('userHistoryTimeline');
    timeline.innerHTML = '';
    
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-time">${item.time}</div>
            <div class="history-action">
                <span class="action-icon">${item.action.icon}</span>
                <span class="action-text">${item.action.text}</span>
                <span class="action-doc">${item.action.doc}</span>
            </div>
        `;
        timeline.appendChild(historyItem);
    });
}
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function calculateExperience(hireDate) {
    const today = new Date();
    const hire = new Date(hireDate);
    const years = today.getFullYear() - hire.getFullYear();
    const months = today.getMonth() - hire.getMonth();
    
    let experience = '';
    if (years > 0) {
        experience += `${years} год${years > 1 ? 'а' : ''} `;
    }
    if (months > 0) {
        experience += `${months} месяц${months > 1 ? 'а' : ''}`;
    }
    
    return experience.trim();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function formatDateTime(date) {
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
document.getElementById('historyPeriod').addEventListener('change', function() {
    const period = this.value;
    
    if (period === 'custom') {
        document.getElementById('customPeriod').style.display = 'flex';
    } else {
        document.getElementById('customPeriod').style.display = 'none';
        loadUserHistory(currentViewedUserId, parseInt(period));
    }
});

function applyCustomPeriod() {
    const start = document.getElementById('periodStart').value;
    const end = document.getElementById('periodEnd').value;
    
    if (start && end) {
        console.log('Загрузка истории с', start, 'по', end);
    }
}
document.getElementById('loadMoreHistory').addEventListener('click', function() {
    console.log('Загрузка дополнительной истории...');
});

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
                <button class="btn-icon buttonbase" title="Сменить статус" onclick="openChangeStatusModal(${user.id}, '${user.status}')">🔄</button>
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
async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) return;
    
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

// Изменение статуса
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const action = newStatus === 'active' ? 'разблокировать' : 'заблокировать';
    
    if (!confirm(`Вы уверены, что хотите ${action} этого пользователя?`)) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) throw new Error('Failed to update status');
        
        loadUsers(currentPage, currentSearchTerm);
        showToast(`Пользователь ${action}н`, 'success');
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Ошибка изменения статуса', 'error');
    }
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
        renderStructureTree(data.structure);
    } catch (error) {
        console.error('Error loading structure:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">❌ Ошибка загрузки структуры</div>';
    }
}

// Отрисовка дерева структуры
function renderStructureTree(departments, level = 0) {
    const container = document.getElementById('structureContent');
    if (!departments || departments.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">📭 Нет подразделений</div>';
        return;
    }
    
    let html = '<ul class="structure-group root-group">';
    
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
                        <span class="structure-employe-status manager-status status-inactive">—</span>
                    </div>
                    <div class="structure-group-actionbuttons">
                        <button class="btn-icon buttonbase" onclick="openAddDepartmentModal(${dept.id})" title="Добавить подразделение">➕</button>
                        <button class="btn-icon buttonbase" onclick="openEditDepartmentModal(${dept.id}, '${escapeHtml(dept.name)}')" title="Редактировать">✏️</button>
                        <button class="btn-icon buttonbase" onclick="deleteDepartment(${dept.id})" title="Удалить" style="color:#dc3545;">🗑️</button>
                    </div>
                </div>
        `;
        
        // Сотрудники
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
        
        // Дочерние подразделения
        if (hasChildren) {
            html += `<div class="structure-subgroups" id="subdepartments-${dept.id}">`;
            html += renderSubtree(dept.children);
            html += `</div>`;
        }
        
        html += `</li>`;
    }
    
    html += `</ul>`;
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
                        <button class="btn-icon buttonbase" onclick="deleteDepartment(${dept.id})" title="Удалить" style="color:#dc3545;">🗑️</button>
                    </div>
                </div>
        `;
        
        if (hasEmployees) {
            html += `<ul class="structure-employees" id="employees-${dept.id}">`;
            for (const emp of dept.employees) {
                html += `
                    <li class="structure-employee-item">
                        <div class="employee-card">
                            <div class="employee-avatar">
                                <img src="${emp.avatar_uri || '../materials/avatar_for_profile.png'}">
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