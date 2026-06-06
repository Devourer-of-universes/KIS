// ========== base.js - РАБОЧЕЕ ПРОСТРАНСТВО ==========

// ---------------------- 1. УПРАВЛЕНИЕ ОКНАМИ ----------------------
const btn_docs_last = document.querySelector('#top-menu-btn-docs-last');
const btn_docs_at_work = document.querySelector('#top-menu-btn-docs-at-work');
const btn_docs_new = document.querySelector('#top-menu-btn-docs-new');
const btn_docs_archive = document.querySelector('#top-menu-btn-docs-archive');
const btn_tasks_last = document.querySelector('#top-menu-btn-tasks-last');
const btn_tasks_at_work = document.querySelector('#top-menu-btn-tasks-at-work');
const btn_tasks_new = document.querySelector('#top-menu-btn-tasks-new');
const btn_tasks_archive = document.querySelector('#top-menu-btn-tasks-archive');
const btn_fav = document.querySelector('#top-menu-btn-favourites');
const btn_files = document.querySelector('#top-menu-btn-files');
const btn_workflows = document.querySelector('#top-menu-btn-workflows');
const btn_dashboard = document.querySelector('#top-menu-btn-dashboard');

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

function closeAllWindowsExcept(exceptWindowId) {
    document.querySelectorAll('.base-section').forEach(window => {
        if (window.id !== exceptWindowId) {
            window.style.display = 'none';
            window.classList.remove('active');
        }
    });
}

function closeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
        windowElement.style.display = 'none';
        windowElement.classList.remove('active');
    }
}

// Обработчики кнопок
btn_workflows.addEventListener('click', (e) => { e.stopPropagation(); openWindow('workflow-section'); });
btn_docs_last.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-doc-last'); });
btn_docs_at_work.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-doc-at-work'); });
btn_docs_new.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-doc-new'); });
btn_docs_archive.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-doc-archive'); });
btn_tasks_last.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-last'); });
btn_tasks_at_work.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-at-work'); });
btn_tasks_new.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-new'); });
btn_tasks_archive.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-archive'); });
btn_fav.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-favourites'); });
btn_dashboard.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-dashboard'); });
// ---------------------- 2. ДОКУМЕНТЫ И ЗАДАЧИ ----------------------
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

function createNewDocument(docType) {
    console.log('Создание документа типа:', docType);
    closeWindow('base-section-doc-new');
    openWindow('base-section-doc-edit');
}

function createNewTask(taskType) {
    console.log('Создание задачи типа:', taskType);
    closeWindow('base-section-task-new');
    openWindow('base-section-task-edit');
}

// ---------------------- 3. ПРОЦЕССЫ (WORKFLOW) ----------------------
function openWorkflowEditor() { console.log('Открываем редактор процесса'); }
function useWorkflow(workflowId) { console.log('Используем процесс:', workflowId); }
function editWorkflow(workflowId) { console.log('Редактируем процесс:', workflowId); }
function duplicateWorkflow(workflowId) { console.log('Копируем процесс:', workflowId); }

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('addWorkflowBtn')?.addEventListener('click', () => openWorkflowEditor());
    
    document.querySelectorAll('.workflow-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.workflow-actions')) {
                useWorkflow(this.dataset.workflowId);
            }
        });
    });
    
    document.querySelectorAll('.workflow-actions .btn-icon').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const workflowId = this.closest('.workflow-item').dataset.workflowId;
            const action = this.title;
            if (action === 'Использовать') useWorkflow(workflowId);
            else if (action === 'Редактировать') editWorkflow(workflowId);
            else if (action === 'Копировать') duplicateWorkflow(workflowId);
        });
    });
});

// ---------------------- 4. МАРШРУТ СОГЛАСОВАНИЯ (DRAG & DROP) ----------------------
class ApprovalFlowManager {
    constructor() {
        this.flowContainer = document.getElementById('approvalFlow');
        this.steps = [];
        this.init();
    }
    
    init() {
        this.loadSteps();
        this.initDragAndDrop();
        this.initEventListeners();
    }
    
    loadSteps() {
        this.steps = Array.from(this.flowContainer.querySelectorAll('.approval-step'));
        this.updateStepNumbers();
    }
    
    initDragAndDrop() {
        this.steps.forEach(step => {
            step.addEventListener('dragstart', this.handleDragStart.bind(this));
            step.addEventListener('dragend', this.handleDragEnd.bind(this));
            step.addEventListener('dragover', this.handleDragOver.bind(this));
            step.addEventListener('dragenter', this.handleDragEnter.bind(this));
            step.addEventListener('dragleave', this.handleDragLeave.bind(this));
            step.addEventListener('drop', this.handleDrop.bind(this));
        });
    }
    
    initEventListeners() {
        document.getElementById('addStepBtn')?.addEventListener('click', () => this.addStep());
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('step-remove')) {
                this.removeStep(e.target.closest('.approval-step'));
            }
        });
        document.getElementById('side-sec-head-btn-choose')?.addEventListener('click', () => this.chooseTemplate());
        document.getElementById('side-sec-head-btn-addPerson')?.addEventListener('click', () => this.addPerson());
    }
    
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.stepId);
        e.target.classList.add('dragging');
        setTimeout(() => e.target.style.display = 'none', 0);
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        e.target.style.display = 'flex';
        document.querySelectorAll('.approval-step.drag-over').forEach(step => {
            step.classList.remove('drag-over');
        });
    }
    
    handleDragOver(e) { e.preventDefault(); }
    
    handleDragEnter(e) {
        e.preventDefault();
        const step = e.target.closest('.approval-step');
        if (step && !step.classList.contains('dragging')) step.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        const step = e.target.closest('.approval-step');
        if (step) step.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        const step = e.target.closest('.approval-step');
        if (step) {
            step.classList.remove('drag-over');
            const draggedStepId = e.dataTransfer.getData('text/plain');
            const draggedStep = this.flowContainer.querySelector(`[data-step-id="${draggedStepId}"]`);
            if (draggedStep && draggedStep !== step) this.moveStep(draggedStep, step);
        }
    }
    
    moveStep(draggedStep, targetStep) {
        const allSteps = Array.from(this.flowContainer.querySelectorAll('.approval-step'));
        const draggedIndex = allSteps.indexOf(draggedStep);
        const targetIndex = allSteps.indexOf(targetStep);
        
        if (draggedIndex < targetIndex) targetStep.after(draggedStep);
        else targetStep.before(draggedStep);
        
        this.updateStepNumbers();
        this.saveFlowState();
    }
    
    addStep() {
        const newStepId = Date.now();
        const newStep = document.createElement('div');
        newStep.className = 'approval-step';
        newStep.draggable = true;
        newStep.dataset.stepId = newStepId;
        newStep.innerHTML = `
            <span class="step-number">${this.steps.length + 1}</span>
            <div class="step-content">
                <span class="step-role">Новый участник</span>
                <span class="step-user">Не назначен</span>
            </div>
            <button class="step-remove" title="Удалить">×</button>
        `;
        this.initStepEventListeners(newStep);
        this.flowContainer.appendChild(newStep);
        this.steps.push(newStep);
        this.updateStepNumbers();
        this.saveFlowState();
        this.editStep(newStep);
    }
    
    removeStep(step) {
        if (this.steps.length <= 1) {
            alert('Должен остаться хотя бы один участник согласования');
            return;
        }
        if (confirm('Удалить этот этап согласования?')) {
            step.remove();
            this.steps = this.steps.filter(s => s !== step);
            this.updateStepNumbers();
            this.saveFlowState();
        }
    }
    
    updateStepNumbers() {
        const steps = Array.from(this.flowContainer.querySelectorAll('.approval-step'));
        steps.forEach((step, index) => {
            step.querySelector('.step-number').textContent = index + 1;
        });
    }
    
    editStep(step) {
        const role = prompt('Введите роль участника:', step.querySelector('.step-role').textContent);
        const user = prompt('Введите ФИО участника:', step.querySelector('.step-user').textContent);
        if (role) step.querySelector('.step-role').textContent = role;
        if (user) step.querySelector('.step-user').textContent = user;
        this.saveFlowState();
    }
    
    initStepEventListeners(step) {
        step.addEventListener('dragstart', this.handleDragStart.bind(this));
        step.addEventListener('dragend', this.handleDragEnd.bind(this));
        step.addEventListener('dragover', this.handleDragOver.bind(this));
        step.addEventListener('dragenter', this.handleDragEnter.bind(this));
        step.addEventListener('dragleave', this.handleDragLeave.bind(this));
        step.addEventListener('drop', this.handleDrop.bind(this));
        step.addEventListener('dblclick', () => this.editStep(step));
    }
    
    chooseTemplate() { console.log('Выбор шаблона маршрута'); }
    addPerson() { console.log('Добавление нового участника'); this.addStep(); }
    
    saveFlowState() {
        const flowData = Array.from(this.flowContainer.querySelectorAll('.approval-step')).map(step => ({
            role: step.querySelector('.step-role').textContent,
            user: step.querySelector('.step-user').textContent
        }));
        localStorage.setItem('approvalFlow', JSON.stringify(flowData));
    }
    
    loadFlowState() {
        const savedFlow = localStorage.getItem('approvalFlow');
        if (savedFlow) JSON.parse(savedFlow);
    }
}

// ---------------------- 5. ЗАМЕТКИ ----------------------
async function loadNotes() {
    try {
        const token = localStorage.getItem('token');
        
        const personalRes = await fetch('/api/notes/personal', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (personalRes.ok) {
            const personal = await personalRes.json();
            renderNotes('personalNotesList', personal.notes || []);
            document.getElementById('personalNotesCount').textContent = personal.notes?.length || 0;
        }
        
        const groupRes = await fetch('/api/notes/group', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (groupRes.ok) {
            const group = await groupRes.json();
            renderNotes('groupNotesList', group.notes || []);
            document.getElementById('groupNotesCount').textContent = group.notes?.length || 0;
        }
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

function renderNotes(containerId, notes) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!notes || notes.length === 0) {
        container.innerHTML = '<div class="empty-notes">📭 Нет заметок</div>';
        return;
    }
    
    container.innerHTML = notes.map(note => `
        <div class="note-item" data-note-id="${note.id}">
            <div class="note-text">${escapeHtml(note.content)}</div>
            <div class="note-meta">
                <span class="note-date">${formatDate(note.created_at)}</span>
                <button class="note-delete" onclick="deleteNote('${note.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function addNote(type) {
    const content = prompt('Введите текст заметки:');
    if (!content || content.trim() === '') return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type, content: content.trim() })
        });
        
        if (response.ok) {
            await loadNotes();
            showToast('Заметка добавлена', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Error adding note:', error);
        showToast('Ошибка добавления', 'error');
    }
}

async function deleteNote(noteId) {
    if (!confirm('Удалить заметку?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/notes/${noteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            await loadNotes();
            showToast('Заметка удалена', 'success');
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        showToast('Ошибка', 'error');
    }
}

// ---------------------- КАЛЕНДАРЬ ----------------------
let currentCalendarDate = new Date();
let calendarEvents = [];

async function loadCalendarEvents() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/calendar/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            calendarEvents = data.events || [];
            renderMiniCalendar();
        }
    } catch (error) {
        console.error('Error loading calendar events:', error);
    }
}

function renderMiniCalendar() {
    const container = document.getElementById('miniCalendar');
    if (!container) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    let html = `
        <div class="calendar-header">
            <button onclick="prevMonth()">◀</button>
            <div class="calendar-month-selector">
                <select id="monthSelect" onchange="changeMonth()">
                    ${getMonthOptions(month)}
                </select>
                <select id="yearSelect" onchange="changeYear()">
                    ${getYearOptions(year)}
                </select>
            </div>
            <button onclick="nextMonth()">▶</button>
        </div>
        <div class="calendar-weekdays">
            <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
        </div>
        <div class="calendar-days" id="calendarDays">
    `;
    
    let startOffset = startDay === 0 ? 6 : startDay - 1;
    
    for (let i = startOffset - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month + 1}-${day}`;
        const isToday = dateStr === todayStr;
        const hasEvent = calendarEvents.some(event => {
            const eventDate = new Date(event.date);
            return eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month && eventDate.getDate() === day;
        });
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}"
                 onclick="openDayEvents(${year}, ${month + 1}, ${day})">
                ${day}
                ${hasEvent ? '<span class="event-dot"></span>' : ''}
            </div>
        `;
    }
    
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const nextMonthDays = totalCells - (startOffset + daysInMonth);
    for (let day = 1; day <= nextMonthDays; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function getMonthOptions(selectedMonth) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months.map((m, i) => `<option value="${i}" ${i === selectedMonth ? 'selected' : ''}>${m}</option>`).join('');
}

function getYearOptions(selectedYear) {
    const currentYear = new Date().getFullYear();
    let options = '';
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
        options += `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`;
    }
    return options;
}

function changeMonth() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    currentCalendarDate = new Date(year, month, 1);
    renderMiniCalendar();
}

function changeYear() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    currentCalendarDate = new Date(year, month, 1);
    renderMiniCalendar();
}

function prevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    updateMiniCalendarSelectors();
    renderMiniCalendar();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    updateMiniCalendarSelectors();
    renderMiniCalendar();
}

function changeMonth() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    currentCalendarDate = new Date(year, month, 1);
    renderMiniCalendar();
}

function changeYear() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    currentCalendarDate = new Date(year, month, 1);
    renderMiniCalendar();
}
// Открытие полноэкранного календаря (вместо модалки)
function openCalendarModal() {
    // Сначала рендерим полноэкранный календарь
    renderFullCalendarGrid();
    // Затем открываем секцию
    openWindow('base-section-calendar');
}
function renderFullCalendarGrid() {
    const container = document.getElementById('fullCalendarGrid');
    if (!container) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    let startOffset = startDay === 0 ? 6 : startDay - 1;
    
    let html = '';
    
    // Дни предыдущего месяца
    for (let i = startOffset - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // Дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEvent = calendarEvents.some(e => e.date === dateStr);
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" 
                 data-date="${dateStr}"
                 onclick="openDayDetails('${dateStr}')">
                ${day}
                ${hasEvent ? '<span class="event-dot"></span>' : ''}
            </div>
        `;
    }
    
    // Дни следующего месяца
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const nextMonthDays = totalCells - (startOffset + daysInMonth);
    for (let day = 1; day <= nextMonthDays; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    container.innerHTML = html;
    
    // Обновляем селекторы месяца и года
    updateFullCalendarSelectors();
}

// Обновление селекторов в полноэкранном календаре
function updateFullCalendarSelectors() {
    const monthSelect = document.getElementById('fullMonthSelect');
    const yearSelect = document.getElementById('fullYearSelect');
    if (monthSelect) monthSelect.value = currentCalendarDate.getMonth();
    if (yearSelect) yearSelect.value = currentCalendarDate.getFullYear();
}
function renderFullCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    let startOffset = startDay === 0 ? 6 : startDay - 1;
    
    let html = '';
    for (let i = startOffset - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        html += `<div class="full-calendar-day other-month">${day}</div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const hasEvent = calendarEvents.some(event => {
            const eventDate = new Date(event.date);
            return eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month && eventDate.getDate() === day;
        });
        html += `
            <div class="full-calendar-day ${hasEvent ? 'has-event' : ''}">
                ${day}
                ${hasEvent ? '<span class="event-dot"></span>' : ''}
            </div>
        `;
    }
    
    document.getElementById('fullCalendarDays').innerHTML = html;
    
    // Загружаем задачи для Ганта
    loadGanttTasks();
}

function loadGanttTasks() {
    const container = document.getElementById('ganttChart');
    // TODO: загрузить задачи с датами
    container.innerHTML = `
        <div class="gantt-row">
            <div class="gantt-task-name">Задача 1</div>
            <div class="gantt-bar" style="width: 30%; background: #5194ff;"></div>
        </div>
        <div class="gantt-row">
            <div class="gantt-task-name">Задача 2</div>
            <div class="gantt-bar" style="width: 60%; background: #f59e0b;"></div>
        </div>
    `;
}

function fullCalendarPrevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    updateMiniCalendarSelectors();
    renderMiniCalendar();
    renderFullCalendarGrid();
}

function fullCalendarNextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    updateMiniCalendarSelectors();
    renderMiniCalendar();
    renderFullCalendarGrid();
}

function fullCalendarToday() {
    currentCalendarDate = new Date();
    updateMiniCalendarSelectors();
    renderMiniCalendar();
    renderFullCalendarGrid();
}

function fullCalendarChangeMonth() {
    const month = parseInt(document.getElementById('fullMonthSelect').value);
    const year = parseInt(document.getElementById('fullYearSelect').value);
    currentCalendarDate = new Date(year, month, 1);
    updateMiniCalendarSelectors();
    renderMiniCalendar();
    renderFullCalendarGrid();
}

function fullCalendarChangeYear() {
    const month = parseInt(document.getElementById('fullMonthSelect').value);
    const year = parseInt(document.getElementById('fullYearSelect').value);
    currentCalendarDate = new Date(year, month, 1);
    updateMiniCalendarSelectors();
    renderMiniCalendar();
    renderFullCalendarGrid();
}

// Обновление селекторов в мини-календаре
function updateMiniCalendarSelectors() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    if (monthSelect) monthSelect.value = currentCalendarDate.getMonth();
    if (yearSelect) yearSelect.value = currentCalendarDate.getFullYear();
}
// ---------------------- СТАТИСТИКА ----------------------
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('statsTasks').textContent = data.tasks_in_progress || 0;
            document.getElementById('statsDocs').textContent = data.documents_total || 0;
            document.getElementById('statsProcesses').textContent = data.active_processes || 0;
            document.getElementById('statsUnread').textContent = data.unread_notifications || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}
// ---------------------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------------------
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

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
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
// ========== УНИВЕРСАЛЬНАЯ МОДАЛКА ПОДТВЕРЖДЕНИЯ ==========
let confirmCallback = null;

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

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}
// ---------------------- 8. ИНИЦИАЛИЗАЦИЯ ----------------------
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
    const defaultWindow = document.getElementById('base-section-dashboard');
    if (defaultWindow) {
        defaultWindow.style.display = 'block';
        defaultWindow.classList.add('active');
    }
    // Маршрут согласования
    const flowManager = new ApprovalFlowManager();
    
    // Заметки
    loadNotes();
    
    // Календарь
    loadCalendarEvents();
    loadDashboardStats();
    setTimeout(() => {
        if (document.getElementById('miniCalendar')) {
            renderMiniCalendar();
        }
    }, 100);
});