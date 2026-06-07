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
        
        // Вызываем проверку после закрытия
        onSectionClosed(windowId);
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

// ========== КАЛЕНДАРЬ И ЗАДАЧИ (С БД) ==========

let currentCalendarDate = new Date();
let calendarEvents = [];
let currentTasks = [];

// Загрузка событий календаря из БД
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
            renderFullscreenCalendar();
            renderGanttTasks();
        }
    } catch (error) {
        console.error('Error loading calendar events:', error);
    }
}

// Загрузка задач из БД
async function loadTasks() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentTasks = data.tasks || [];
            
            // Обновляем список задач
            renderFullscreenTasks();
            renderGanttTasks();
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Рендер мини-календаря
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
    
    // Функция проверки наличия события на дату
    const hasEventOnDate = (dateStr) => {
        return calendarEvents.some(event => event.date === dateStr);
    };
    
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
        const hasEvent = hasEventOnDate(dateStr);
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}"
                 onclick="openDateModal(${year}, ${month + 1}, ${day})">
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

// Рендер полноэкранного календаря
function renderFullscreenCalendar() {
    const container = document.getElementById('fullscreenCalendar');
    if (!container) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const hasEventOnDate = (dateStr) => calendarEvents.some(event => event.date === dateStr);
    
    // let html = `
    //     <div class="calendar-fullscreen-controls">
    //         <button class="cal-nav-btn" onclick="fullscreenPrevMonth()">◀ Назад</button>
    //         <button class="today-btn" onclick="fullscreenToday()">Сегодня</button>
    //         <button class="cal-nav-btn" onclick="fullscreenNextMonth()">Вперёд ▶</button>
    //     </div>
    //     <div class="full-calendar-weekdays">
    //         <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
    //     </div>
    //     <div class="full-calendar-grid">
    // `;
    let html = `
        <div class="calendar-header">
            <button onclick="prevMonth()">◀</button>
            <div class="calendar-month-selector">
                <select id="monthSelect" onchange="changeMonth()">
                </select>
                <select id="yearSelect" onchange="changeYear()">
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
        const hasEvent = hasEventOnDate(dateStr);
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}"
                 onclick="openDateModal(${year}, ${month + 1}, ${day})">
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

// Рендер задач в полноэкранном режиме
function renderFullscreenTasks() {
    const container = document.getElementById('fullscreenTasksList');
    if (!container) return;
    
    if (!currentTasks || currentTasks.length === 0) {
        container.innerHTML = '<div class="empty-tasks">Нет активных задач</div>';
        return;
    }
    
    // Фильтруем активные задачи
    const activeTasks = currentTasks.filter(t => t.status !== 'completed');
    
    container.innerHTML = activeTasks.map(task => `
        <div class="task-item" onclick="openTaskModal(${task.id})">
            <input type="checkbox" class="task-checkbox" 
                   ${task.status === 'completed' ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleTaskStatus(${task.id}, event)">
            <div class="task-info">
                <span class="task-name">${escapeHtml(task.title)}</span>
                <span class="task-date">до ${task.due_date || '—'}</span>
            </div>
            <span class="task-priority ${task.priority}">
                ${task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
            </span>
        </div>
    `).join('');
}

// Рендер Ганта
function renderGanttTasks() {
    // Преобразуем задачи из БД в формат Ганта
    const ganttData = currentTasks
        .filter(task => task.start_date && task.due_date)
        .map(task => ({
            id: task.id,
            name: task.title,
            start: task.start_date,
            end: task.due_date,
            progress: task.progress || 0,
            priority: task.priority,
            status: task.status,
            color: getPriorityColor(task.priority)
        }));
    
    // Ограничиваем отображение (первые 10 активных задач)
    const activeTasks = ganttData.filter(t => t.status !== 'completed').slice(0, 10);
    
    renderGanttChart(activeTasks);
}

// Получение цвета по приоритету
function getPriorityColor(priority) {
    switch(priority) {
        case 'critical': return '#ef4444';
        case 'high': return '#f59e0b';
        case 'medium': return '#10b981';
        default: return '#5194ff';
    }
}

// Рендер диаграммы Ганта
function renderGanttChart(tasks) {
    const tasksContainer = document.getElementById('ganttTasksList');
    const barsContainer = document.getElementById('ganttBarsContainer');
    
    if (!tasksContainer || !barsContainer) return;
    
    if (!tasks || tasks.length === 0) {
        tasksContainer.innerHTML = '<div class="empty-gantt">Нет задач для отображения</div>';
        barsContainer.innerHTML = '';
        return;
    }
    
    tasksContainer.innerHTML = tasks.map(task => `
        <div class="gantt-task-row" onclick="openTaskModal(${task.id})">
            ${escapeHtml(task.name)}
        </div>
    `).join('');
    
    // Вычисляем диапазон дат
    const allDates = tasks.flatMap(t => [new Date(t.start), new Date(t.end)]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    minDate.setDate(minDate.getDate() - 1);
    maxDate.setDate(maxDate.getDate() + 1);
    
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    const dayWidth = 40;
    const totalWidth = totalDays * dayWidth;
    
    barsContainer.innerHTML = '';
    barsContainer.style.width = totalWidth + 'px';
    barsContainer.style.position = 'relative';
    
    const minDateTime = minDate.getTime();
    
    for (const task of tasks) {
        const taskStart = new Date(task.start);
        const taskEnd = new Date(task.end);
        
        let offsetDays = Math.ceil((taskStart - minDateTime) / (1000 * 60 * 60 * 24));
        if (offsetDays < 0) offsetDays = 0;
        const offsetPx = offsetDays * dayWidth;
        
        let durationDays = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;
        if (durationDays < 1) durationDays = 1;
        const widthPx = durationDays * dayWidth;
        
        const barRow = document.createElement('div');
        barRow.className = 'gantt-bars-row';
        barRow.style.height = '44px';
        barRow.style.position = 'relative';
        
        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        bar.style.position = 'absolute';
        bar.style.left = offsetPx + 'px';
        bar.style.width = widthPx + 'px';
        bar.style.height = '28px';
        bar.style.top = '8px';
        bar.style.borderRadius = '6px';
        bar.style.backgroundColor = task.color;
        bar.style.cursor = 'pointer';
        bar.style.display = 'flex';
        bar.style.alignItems = 'center';
        bar.style.padding = '0 8px';
        bar.style.overflow = 'hidden';
        bar.innerHTML = `<span class="gantt-bar-label" style="font-size: 10px; color: white; white-space: nowrap;">${escapeHtml(task.name)}</span>`;
        bar.onclick = () => openTaskModal(task.id);
        
        barRow.appendChild(bar);
        barsContainer.appendChild(barRow);
    }
}

// ========== МОДАЛЬНЫЕ ОКНА ==========

// Модалка информации о дате
function openDateModal(year, month, day) {
    const dateStr = `${year}-${month}-${day}`;
    const eventsOnDate = calendarEvents.filter(e => e.date === dateStr);
    
    const modalHtml = `
        <div id="dateModal" class="admin-modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>📅 ${day}.${month}.${year}</h2>
                    <button class="modal-close" onclick="closeDateModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <h3>📋 Задачи на этот день</h3>
                    <div id="dateEventsList">
                        ${eventsOnDate.length === 0 ? '<p style="color: #999;">Нет задач на этот день</p>' : 
                            eventsOnDate.map(event => `
                                <div class="date-event-item" onclick="openTaskModal(${event.id})" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <strong>${escapeHtml(event.title)}</strong>
                                        <span class="task-priority ${event.priority}">${event.priority === 'high' ? 'Высокий' : event.priority === 'medium' ? 'Средний' : 'Низкий'}</span>
                                    </div>
                                    <div style="font-size: 12px; color: #666;">${event.assignee ? 'Исполнитель: ' + event.assignee : ''}</div>
                                </div>
                            `).join('')
                        }
                    </div>
                    <div style="margin-top: 20px;">
                        <button class="buttonbase" onclick="closeDateModal(); openCreateTaskModal('${dateStr}')">+ Создать задачу на этот день</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="buttonbase" onclick="closeDateModal()">Закрыть</button>
                </div>
            </div>
        </div>
    `;
    
    // Удаляем старую модалку, если есть
    const existingModal = document.getElementById('dateModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Закрытие по Escape
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeDateModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

function closeDateModal() {
    const modal = document.getElementById('dateModal');
    if (modal) modal.remove();
}

// Модалка задачи
function openTaskModal(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) {
        showToast('Задача не найдена', 'error');
        return;
    }
    
    const statusOptions = [
        { value: 'pending', label: '⏳ Ожидает' },
        { value: 'in_progress', label: '🔄 В работе' },
        { value: 'completed', label: '✅ Завершена' },
        { value: 'cancelled', label: '❌ Отменена' }
    ];
    
    const modalHtml = `
        <div id="taskModal" class="admin-modal" style="display: flex;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>✏️ ${escapeHtml(task.title)}</h2>
                    <button class="modal-close" onclick="closeTaskModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Название</label>
                        <input type="text" id="taskTitle" class="form-input" value="${escapeHtml(task.title)}">
                    </div>
                    <div class="form-group">
                        <label>Описание</label>
                        <textarea id="taskDescription" class="form-textarea" rows="3">${escapeHtml(task.description || '')}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Дата начала</label>
                            <input type="date" id="taskStartDate" class="form-input" value="${task.start_date || ''}">
                        </div>
                        <div class="form-group">
                            <label>Дата окончания</label>
                            <input type="date" id="taskDueDate" class="form-input" value="${task.due_date || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Приоритет</label>
                            <select id="taskPriority" class="form-select">
                                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Низкий</option>
                                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Средний</option>
                                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Высокий</option>
                                <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Критический</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Статус</label>
                            <select id="taskStatus" class="form-select">
                                ${statusOptions.map(opt => `<option value="${opt.value}" ${task.status === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Прогресс: <span id="progressValue">${task.progress || 0}</span>%</label>
                        <input type="range" id="taskProgress" class="form-range" min="0" max="100" value="${task.progress || 0}" oninput="document.getElementById('progressValue').textContent = this.value">
                    </div>
                    <hr>
                    <h4>📝 Комментарии</h4>
                    <div id="taskCommentsList" style="max-height: 200px; overflow-y: auto; margin-bottom: 10px;">
                        ${task.comments?.length ? task.comments.map(c => `
                            <div style="padding: 8px; border-bottom: 1px solid #eee;">
                                <strong>${escapeHtml(c.user_name)}</strong> <small style="color: #999;">${new Date(c.created_at).toLocaleString()}</small>
                                <div>${escapeHtml(c.content)}</div>
                            </div>
                        `).join('') : '<p style="color: #999;">Нет комментариев</p>'}
                    </div>
                    <div class="form-group">
                        <textarea id="newComment" class="form-textarea" rows="2" placeholder="Написать комментарий..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="buttonbase btn-danger" onclick="deleteTask(${task.id})" style="background-color: #dc3545;">🗑️ Удалить</button>
                    <button class="buttonbase" onclick="closeTaskModal()">Отмена</button>
                    <button class="buttonbase" onclick="saveTask(${task.id})">💾 Сохранить</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('taskModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Обработчик для комментария по Enter
    const commentField = document.getElementById('newComment');
    if (commentField) {
        commentField.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await addComment(task.id);
            }
        });
    }
    
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeTaskModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.remove();
}

// Сохранение задачи
async function saveTask(taskId) {
    const title = document.getElementById('taskTitle')?.value;
    const description = document.getElementById('taskDescription')?.value;
    const startDate = document.getElementById('taskStartDate')?.value;
    const dueDate = document.getElementById('taskDueDate')?.value;
    const priority = document.getElementById('taskPriority')?.value;
    const status = document.getElementById('taskStatus')?.value;
    const progress = document.getElementById('taskProgress')?.value;
    
    if (!title || title.trim() === '') {
        showToast('Введите название задачи', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title.trim(),
                description,
                startDate: startDate || null,
                dueDate: dueDate || null,
                priority,
                status,
                progress: parseInt(progress)
            })
        });
        
        if (response.ok) {
            showToast('Задача сохранена', 'success');
            closeTaskModal();
            await loadTasks();
            await loadCalendarEvents();
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Save task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// Добавление комментария
async function addComment(taskId) {
    const content = document.getElementById('newComment')?.value;
    if (!content || content.trim() === '') return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: content.trim() })
        });
        
        if (response.ok) {
            document.getElementById('newComment').value = '';
            // Перезагружаем задачу
            const taskResponse = await fetch(`/api/tasks/${taskId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const taskData = await taskResponse.json();
            const taskIndex = currentTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                currentTasks[taskIndex] = taskData.task;
            }
            // Обновляем модалку
            closeTaskModal();
            openTaskModal(taskId);
        }
    } catch (error) {
        console.error('Add comment error:', error);
    }
}

// Удаление задачи
async function deleteTask(taskId) {
    if (!confirm('Удалить эту задачу?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('Задача удалена', 'success');
            closeTaskModal();
            await loadTasks();
            await loadCalendarEvents();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (error) {
        console.error('Delete task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// Создание новой задачи
async function openCreateTaskModal(defaultDueDate = null) {
    const modalHtml = `
        <div id="createTaskModal" class="admin-modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>➕ Новая задача</h2>
                    <button class="modal-close" onclick="closeCreateTaskModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Название *</label>
                        <input type="text" id="newTaskTitle" class="form-input" placeholder="Введите название задачи">
                    </div>
                    <div class="form-group">
                        <label>Описание</label>
                        <textarea id="newTaskDesc" class="form-textarea" rows="3"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Дата начала</label>
                            <input type="date" id="newTaskStart" class="form-input">
                        </div>
                        <div class="form-group">
                            <label>Дата окончания</label>
                            <input type="date" id="newTaskDue" class="form-input" value="${defaultDueDate || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Приоритет</label>
                        <select id="newTaskPriority" class="form-select">
                            <option value="low">Низкий</option>
                            <option value="medium" selected>Средний</option>
                            <option value="high">Высокий</option>
                            <option value="critical">Критический</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="buttonbase" onclick="closeCreateTaskModal()">Отмена</button>
                    <button class="buttonbase" onclick="createTask()">Создать</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('createTaskModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeCreateTaskModal() {
    const modal = document.getElementById('createTaskModal');
    if (modal) modal.remove();
}

async function createTask() {
    const title = document.getElementById('newTaskTitle')?.value;
    const description = document.getElementById('newTaskDesc')?.value;
    const startDate = document.getElementById('newTaskStart')?.value;
    const dueDate = document.getElementById('newTaskDue')?.value;
    const priority = document.getElementById('newTaskPriority')?.value;
    
    if (!title || title.trim() === '') {
        showToast('Введите название задачи', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title.trim(),
                description,
                startDate: startDate || null,
                dueDate: dueDate || null,
                priority
            })
        });
        
        if (response.ok) {
            showToast('Задача создана', 'success');
            closeCreateTaskModal();
            await loadTasks();
            await loadCalendarEvents();
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка создания', 'error');
        }
    } catch (error) {
        console.error('Create task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// Переключение статуса задачи
async function toggleTaskStatus(taskId, event) {
    event.stopPropagation();
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    
    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        await loadTasks();
        await loadCalendarEvents();
    } catch (error) {
        console.error('Toggle task error:', error);
    }
}

// Навигация по месяцам
function prevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    updateCalendarSelectors();
    renderMiniCalendar();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    updateCalendarSelectors();
    renderMiniCalendar();
}

function fullscreenPrevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderFullscreenCalendar();
}

function fullscreenNextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderFullscreenCalendar();
}

function fullscreenToday() {
    currentCalendarDate = new Date();
    renderFullscreenCalendar();
}

function changeMonth() {
    const month = parseInt(document.getElementById('monthSelect')?.value);
    const year = parseInt(document.getElementById('yearSelect')?.value);
    if (!isNaN(month) && !isNaN(year)) {
        currentCalendarDate = new Date(year, month, 1);
        renderMiniCalendar();
    }
}

function changeYear() {
    const month = parseInt(document.getElementById('monthSelect')?.value);
    const year = parseInt(document.getElementById('yearSelect')?.value);
    if (!isNaN(month) && !isNaN(year)) {
        currentCalendarDate = new Date(year, month, 1);
        renderMiniCalendar();
    }
}

function updateCalendarSelectors() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    if (monthSelect) monthSelect.value = currentCalendarDate.getMonth();
    if (yearSelect) yearSelect.value = currentCalendarDate.getFullYear();
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

// Открытие полноэкранного календаря
function openFullCalendar() {
    renderFullscreenCalendar();
    renderFullscreenTasks();
    renderGanttTasks();
    openWindow('base-section-calendar');
}

function openCalendarModal() {
    openFullCalendar();
}

// Инициализация
async function initCalendar() {
    await loadTasks();
    await loadCalendarEvents();
}

// Запускаем инициализацию
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalendar);
} else {
    initCalendar();
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






// ========== ЗАГЛУШКИ ДЛЯ ОТСУТСТВУЮЩИХ API ==========

// Заметки - заглушка
async function loadNotes() {
    // Тестовые данные вместо API
    const testPersonalNotes = [
        { id: 1, content: 'Созвониться с клиентом в 15:00', created_at: new Date().toISOString() },
        { id: 2, content: 'Подготовить отчёт по проекту', created_at: new Date().toISOString() }
    ];
    const testGroupNotes = [
        { id: 3, content: 'Общее собрание в пятницу в 10:00', created_at: new Date().toISOString() },
        { id: 4, content: 'Сдать отчёты до 20 числа', created_at: new Date().toISOString() }
    ];
    
    renderNotes('personalNotesList', testPersonalNotes);
    renderNotes('groupNotesList', testGroupNotes);
    
    const personalCount = document.getElementById('personalNotesCount');
    const groupCount = document.getElementById('groupNotesCount');
    if (personalCount) personalCount.textContent = testPersonalNotes.length;
    if (groupCount) groupCount.textContent = testGroupNotes.length;
}

// Календарь - заглушка
function loadCalendarEvents() {
    calendarEvents = [
        { date: '2025-06-10', title: 'Встреча с клиентом', type: 'task' },
        { date: '2025-06-15', title: 'Сдача отчёта', type: 'deadline' },
        { date: '2025-06-20', title: 'Собеседование', type: 'task' }
    ];
    renderMiniCalendar();
}

// Статистика - заглушка
function loadDashboardStats() {
    const statsTasks = document.getElementById('statsTasks');
    const statsDocs = document.getElementById('statsDocs');
    const statsProcesses = document.getElementById('statsProcesses');
    const statsUnread = document.getElementById('statsUnread');
    
    if (statsTasks) statsTasks.textContent = '12';
    if (statsDocs) statsDocs.textContent = '8';
    if (statsProcesses) statsProcesses.textContent = '3';
    if (statsUnread) statsUnread.textContent = '5';
}





// ========== АВТОМАТИЧЕСКОЕ ОТКРЫТИЕ ДАШБОРДА ==========

// Функция проверки, виден ли дашборд
function isDashboardVisible() {
    const dashboard = document.getElementById('base-section-dashboard');
    return dashboard && dashboard.style.display === 'block';
}

// Функция проверки, есть ли открытые секции (кроме дашборда)
function hasAnyOpenSections() {
    const sections = document.querySelectorAll('.base-section');
    for (const section of sections) {
        // Пропускаем дашборд
        if (section.id === 'base-section-dashboard') continue;
        // Если секция видима и активна
        if (section.style.display === 'block' && section.classList.contains('active')) {
            return true;
        }
    }
    return false;
}

// Функция проверки, есть ли открытые модальные окна
function hasAnyOpenModals() {
    // Проверяем стандартные модалки администратора
    const adminModals = document.querySelectorAll('.admin-modal.active');
    if (adminModals.length > 0) return true;
    
    // Проверяем кастомные модалки чатов
    const customModals = document.querySelectorAll('.custom-modal[style*="display: flex"], .create-chat-modal.active');
    if (customModals.length > 0) return true;
    
    // Проверяем модалку подтверждения
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal && confirmModal.classList.contains('active')) return true;
    
    return false;
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
// ----------------------ИНИЦИАЛИЗАЦИЯ ----------------------
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