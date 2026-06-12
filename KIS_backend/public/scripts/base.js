// ========== base.js - РАБОЧЕЕ ПРОСТРАНСТВО ==========






// =====================================================
// 1. ИНИЦИАЛИЗАЦИЯ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =====================================================
// - DOM элементы (кнопки меню)
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

// Обработчики кнопок
btn_workflows.addEventListener('click', (e) => { e.stopPropagation(); openWindow('workflow-section'); });
btn_docs_last.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-doc-last'); });
btn_docs_at_work.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-doc-at-work'); });
btn_docs_new.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-doc-new'); });
btn_docs_archive.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-doc-archive'); });
btn_tasks_last.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-last'); });
btn_tasks_at_work.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-at-work'); });
btn_tasks_new.addEventListener('click', (e) => { e.stopPropagation(); openTaskTypeSelector();});
btn_tasks_archive.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-archive'); });
btn_fav.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-favourites'); });
btn_dashboard.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-dashboard'); });
// - Глобальные переменные (currentCalendarDate, calendarEvents, currentTasks и т.д.)
let currentCalendarDate = new Date();
let calendarEvents = [];
let currentTasks = [];
let userTemplates = [];
let currentTemplateFields = [];
let editingFieldIndex = null;
let dragStartIndex = null;
let currentEditingTemplateId = null;
let currentTaskDraft = null;
let confirmCallback = null;
let currentTemplateFilter = 'all';
let currentQuickDueDate = null;


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
// =====================================================
// 3. УПРАВЛЕНИЕ ДАШБОРДОМ (АВТО-ОТКРЫТИЕ)
// =====================================================
// - isDashboardVisible()
// - hasAnyOpenSections()
// - hasAnyOpenModals()
// - ensureDashboardVisible()
// - onSectionClosed()
// - onModalClosed()
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
// =====================================================
// 4. ЗАМЕТКИ (NOTES)
// =====================================================
// - loadNotes()
// - renderNotes()
// - addNote()
// - deleteNote()
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
// =====================================================
// 5. КАЛЕНДАРЬ И ЗАДАЧИ (ОСНОВНЫЕ)
// =====================================================
// - loadCalendarEvents()
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
// - loadTasks()
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
// - renderMiniCalendar()
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
// - renderFullscreenCalendar()
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
// - renderFullscreenTasks()
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
// - renderGanttTasks()
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
// - renderGanttChart()
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
// - getPriorityColor()
// Получение цвета по приоритету
function getPriorityColor(priority) {
    switch(priority) {
        case 'critical': return '#ef4444';
        case 'high': return '#f59e0b';
        case 'medium': return '#10b981';
        default: return '#5194ff';
    }
}
// Навигация по календарю
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
// - getMonthOptions(), getYearOptions()
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
function updateCalendarSelectors() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    if (monthSelect) monthSelect.value = currentCalendarDate.getMonth();
    if (yearSelect) yearSelect.value = currentCalendarDate.getFullYear();
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









// =====================================================
// 6. МОДАЛЬНЫЕ ОКНА (ЗАДАЧИ И КАЛЕНДАРЬ)
// =====================================================
// - openDateModal()
// Модалка информации о дате
function openDateModal(year, month, day) {
    const dateStr = `${year}-${month}-${day}`;
    const eventsOnDate = calendarEvents.filter(e => e.date === dateStr);
    
    document.getElementById('dateModalTitle').textContent = `📅 ${day}.${month}.${year}`;
    
    const eventsContainer = document.getElementById('dateEventsList');
    if (eventsOnDate.length === 0) {
        eventsContainer.innerHTML = '<p style="color: #999;">Нет задач на этот день</p>';
    } else {
        eventsContainer.innerHTML = eventsOnDate.map(event => `
            <div class="date-event-item" onclick="openTaskModal(${event.id})" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${escapeHtml(event.title)}</strong>
                    <span class="task-priority ${event.priority}">${event.priority === 'high' ? 'Высокий' : event.priority === 'medium' ? 'Средний' : 'Низкий'}</span>
                </div>
                <div style="font-size: 12px; color: #666;">${event.assignee ? 'Исполнитель: ' + event.assignee : ''}</div>
            </div>
        `).join('');
    }
    
    const createBtn = document.getElementById('createTaskOnDateBtn');
    createBtn.onclick = () => {
        closeDateModal();
        openQuickCreateTaskModal(dateStr);
    };
    
    openModal('dateModal');
}
// - closeDateModal()
function closeDateModal() {
    closeModal('dateModal');
}
// - openTaskModal()
// Модалка задачи
function openTaskModal(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) {
        showToast('Задача не найдена', 'error');
        return;
    }
    
    document.getElementById('taskModalTitle').textContent = `✏️ ${escapeHtml(task.title)}`;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskStartDate').value = task.start_date || '';
    document.getElementById('taskDueDate').value = task.due_date || '';
    
    // Заполняем приоритет
    const prioritySelect = document.getElementById('taskPriority');
    prioritySelect.innerHTML = `
        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Низкий</option>
        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Средний</option>
        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Высокий</option>
        <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Критический</option>
    `;
    
    // Заполняем статус
    const statusSelect = document.getElementById('taskStatus');
    statusSelect.innerHTML = `
        <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>⏳ Ожидает</option>
        <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>🔄 В работе</option>
        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>✅ Завершена</option>
        <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>❌ Отменена</option>
    `;
    
    document.getElementById('taskProgress').value = task.progress || 0;
    document.getElementById('progressValue').textContent = task.progress || 0;
    
    // Комментарии
    const commentsContainer = document.getElementById('taskCommentsList');
    if (task.comments?.length) {
        commentsContainer.innerHTML = task.comments.map(c => `
            <div style="padding: 8px; border-bottom: 1px solid #eee;">
                <strong>${escapeHtml(c.user_name)}</strong> <small style="color: #999;">${new Date(c.created_at).toLocaleString()}</small>
                <div>${escapeHtml(c.content)}</div>
            </div>
        `).join('');
    } else {
        commentsContainer.innerHTML = '<p style="color: #999;">Нет комментариев</p>';
    }
    
    // Обработчики
    document.getElementById('saveTaskBtn').onclick = () => saveTask(taskId);
    document.getElementById('deleteTaskBtn').onclick = () => deleteTask(taskId);
    
    // Комментарий по Enter
    const commentField = document.getElementById('newComment');
    commentField.onkeypress = async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            await addComment(taskId);
        }
    };
    
    openModal('taskModal');
}
// - closeTaskModal()
function closeTaskModal() {
    closeModal('taskModal');
}
// - saveTask()
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
// - addComment()
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
// - deleteTask()
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
// - openCreateTaskModal()
function openQuickCreateTaskModal(defaultDueDate = null) {
    currentQuickDueDate = defaultDueDate;
    document.getElementById('quickTaskTitle').value = '';
    document.getElementById('quickTaskDesc').value = '';
    document.getElementById('quickTaskStart').value = '';
    document.getElementById('quickTaskDue').value = defaultDueDate || '';
    document.getElementById('quickTaskPriority').value = 'medium';
    
    document.getElementById('quickCreateTaskBtn').onclick = quickCreateTask;
    openModal('quickCreateTaskModal');
}

function closeQuickCreateTaskModal() {
    closeModal('quickCreateTaskModal');
}

async function quickCreateTask() {
    const title = document.getElementById('quickTaskTitle')?.value.trim();
    const description = document.getElementById('quickTaskDesc')?.value;
    const startDate = document.getElementById('quickTaskStart')?.value;
    const dueDate = document.getElementById('quickTaskDue')?.value;
    const priority = document.getElementById('quickTaskPriority')?.value;
    
    if (!title) {
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
            closeQuickCreateTaskModal();
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

// - toggleTaskStatus()
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



















// =====================================================
// 7. РЕДАКТОР ЗАДАЧ (СЕКЦИЯ TASK-NEW-EDIT)
// =====================================================
// - loadTaskAssignees()
// Загрузка списка пользователей для выбора исполнителя
async function loadTaskAssignees() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const users = data.users || [];
            
            const assigneeSelect = document.getElementById('taskAssignee');
            const observersSelect = document.getElementById('taskObservers');
            
            if (assigneeSelect) {
                assigneeSelect.innerHTML = '<option value="">— Выберите исполнителя —</option>' +
                    users.map(user => `<option value="${user.id}">${escapeHtml(user.surname)} ${escapeHtml(user.name)} (${escapeHtml(user.username)})</option>`).join('');
            }
            
            if (observersSelect) {
                observersSelect.innerHTML = '<option value="">— Выберите наблюдателей —</option>' +
                    users.map(user => `<option value="${user.id}">${escapeHtml(user.surname)} ${escapeHtml(user.name)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}
// - loadRelatedChats()
// Загрузка списка чатов для привязки
async function loadRelatedChats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/chats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const chats = data.chats || [];
            
            const chatSelect = document.getElementById('taskRelatedChat');
            if (chatSelect) {
                chatSelect.innerHTML = '<option value="">— Не привязывать —</option>' +
                    chats.map(chat => {
                        let name = chat.name || (chat.is_group ? 'Групповой чат' : 'Личный чат');
                        return `<option value="${chat.id}">${escapeHtml(name)}</option>`;
                    }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}
// - initTaskEditor()
// Инициализация секции создания задачи
function initTaskEditor() {
    // Загружаем данные
    loadTaskAssignees();
    loadRelatedChats();
    
    // Заполняем информацию о создателе
    const currentUser = window.currentUser;
    if (currentUser) {
        const creatorName = document.getElementById('previewCreator');
        if (creatorName) {
            creatorName.textContent = `${currentUser.surname || ''} ${currentUser.name || ''}`.trim() || currentUser.username;
        }
    }
    
    const previewDate = document.getElementById('previewDate');
    if (previewDate) {
        previewDate.textContent = new Date().toLocaleDateString('ru-RU');
    }
    
    // Обработчик ввода названия задачи
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) {
        titleInput.addEventListener('input', updateTaskPreview);
    }
    
    // Обработчик приоритета
    const prioritySelect = document.getElementById('taskPriority');
    if (prioritySelect) {
        prioritySelect.addEventListener('change', updateTaskPreview);
    }
    
    // Обработчик статуса (черновик)
    updateTaskPreview();
}
// - updateTaskPreview()
// Обновление превью
function updateTaskPreview() {
    const title = document.getElementById('taskTitle')?.value;
    const priority = document.getElementById('taskPriority')?.value;
    const statusSpan = document.getElementById('previewStatus');
    
    if (statusSpan) {
        let statusText = '🟡 Черновик';
        if (title && title.trim()) {
            statusText = '📝 Готов к созданию';
        }
        statusSpan.textContent = statusText;
    }
}
// - createTaskFromEditor()
// Создание задачи
async function createTaskFromEditor() {
    const title = document.getElementById('taskTitle')?.value.trim();
    const description = document.getElementById('taskDescription')?.value;
    const taskType = document.getElementById('taskType')?.value;
    const priority = document.getElementById('taskPriority')?.value;
    const startDate = document.getElementById('taskStartDate')?.value;
    const deadline = document.getElementById('taskDeadline')?.value;
    const assigneeId = document.getElementById('taskAssignee')?.value;
    const observersSelect = document.getElementById('taskObservers');
    const observers = observersSelect ? Array.from(observersSelect.selectedOptions).map(opt => opt.value).filter(v => v) : [];
    const relatedChatId = document.getElementById('taskRelatedChat')?.value;
    const tagsInput = document.getElementById('taskTags')?.value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    
    // Валидация
    if (!title) {
        showToast('Введите название задачи', 'error');
        document.getElementById('taskTitle')?.focus();
        return;
    }
    
    if (!deadline) {
        showToast('Укажите срок выполнения', 'error');
        document.getElementById('taskDeadline')?.focus();
        return;
    }
    
    if (!assigneeId) {
        showToast('Выберите ответственного исполнителя', 'error');
        document.getElementById('taskAssignee')?.focus();
        return;
    }
    
    // Формируем данные
    const taskData = {
        title,
        description: description || '',
        taskType,
        priority,
        startDate: startDate || null,
        dueDate: deadline,
        assignedTo: parseInt(assigneeId),
        observers: observers.map(id => parseInt(id)),
        relatedChatId: relatedChatId ? parseInt(relatedChatId) : null,
        tags,
        notifyAssignee: document.getElementById('notifyOnAssign')?.checked || false,
        notifyOnDeadline: document.getElementById('notifyOnDeadline')?.checked || false
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast('✅ Задача успешно создана', 'success');
            
            // Очищаем форму
            clearTaskForm();
            
            // Обновляем календарь и задачи
            await loadTasks();
            await loadCalendarEvents();
            
            // Закрываем секцию создания и открываем дашборд
            closeWindow('base-section-task-new');
            
            // Показываем уведомление с предложением перейти к задаче
            setTimeout(() => {
                const goToTask = confirm(`Задача "${title}" создана. Перейти к ней?`);
                if (goToTask && result.task) {
                    openTaskModal(result.task.id);
                }
            }, 500);
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка создания задачи', 'error');
        }
    } catch (error) {
        console.error('Create task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}
// - clearTaskForm()
// Очистка формы после создания
function clearTaskForm() {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskType').value = 'simple';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskStartDate').value = '';
    document.getElementById('taskDeadline').value = '';
    document.getElementById('taskAssignee').value = '';
    document.getElementById('taskObservers').value = '';
    document.getElementById('taskRelatedChat').value = '';
    document.getElementById('taskTags').value = '';
    document.getElementById('taskUploadedFiles').innerHTML = '';
    
    // Сбрасываем чекбоксы
    document.getElementById('notifyOnAssign').checked = true;
    document.getElementById('notifyOnDeadline').checked = true;
    document.getElementById('notifyOnStatusChange').checked = true;
    
    updateTaskPreview();
}
// - saveTaskDraft()
// Сохранение черновика
async function saveTaskDraft() {
    const title = document.getElementById('taskTitle')?.value;
    if (!title) {
        showToast('Введите название задачи перед сохранением', 'error');
        return;
    }
    
    const draftData = {
        title: title,
        description: document.getElementById('taskDescription')?.value,
        taskType: document.getElementById('taskType')?.value,
        priority: document.getElementById('taskPriority')?.value,
        startDate: document.getElementById('taskStartDate')?.value,
        deadline: document.getElementById('taskDeadline')?.value,
        assigneeId: document.getElementById('taskAssignee')?.value,
        observers: Array.from(document.getElementById('taskObservers')?.selectedOptions || []).map(opt => opt.value),
        relatedChatId: document.getElementById('taskRelatedChat')?.value,
        tags: document.getElementById('taskTags')?.value,
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('taskDraft', JSON.stringify(draftData));
    showToast('Черновик сохранён', 'success');
}
// - loadTaskDraft()
// Загрузка черновика
function loadTaskDraft() {
    const saved = localStorage.getItem('taskDraft');
    if (saved) {
        const draft = JSON.parse(saved);
        if (confirm('Найден сохранённый черновик. Загрузить?')) {
            document.getElementById('taskTitle').value = draft.title || '';
            document.getElementById('taskDescription').value = draft.description || '';
            document.getElementById('taskType').value = draft.taskType || 'simple';
            document.getElementById('taskPriority').value = draft.priority || 'medium';
            document.getElementById('taskStartDate').value = draft.startDate || '';
            document.getElementById('taskDeadline').value = draft.deadline || '';
            if (draft.assigneeId) document.getElementById('taskAssignee').value = draft.assigneeId;
            document.getElementById('taskTags').value = draft.tags || '';
            showToast('Черновик загружен', 'success');
        }
    }
}
// - addTag()
// Добавление тега
function addTag(tag) {
    const tagsInput = document.getElementById('taskTags');
    if (tagsInput) {
        const current = tagsInput.value;
        if (current) {
            tagsInput.value = current + ', ' + tag;
        } else {
            tagsInput.value = tag;
        }
        tagsInput.focus();
    }
}
// - previewTask()
// Предпросмотр задачи
function previewTask() {
    const title = document.getElementById('taskTitle')?.value;
    if (!title) {
        showToast('Введите название задачи', 'error');
        return;
    }
    
    const content = `
        <h3>${escapeHtml(title)}</h3>
        <div class="task-preview-details">
            <p><strong>📝 Описание:</strong> ${escapeHtml(document.getElementById('taskDescription')?.value || '—')}</p>
            <p><strong>🎯 Приоритет:</strong> ${getPriorityLabel(document.getElementById('taskPriority')?.value)}</p>
            <p><strong>📅 Срок:</strong> ${document.getElementById('taskDeadline')?.value || '—'}</p>
            <p><strong>👤 Исполнитель:</strong> ${document.getElementById('taskAssignee')?.selectedOptions[0]?.text || '—'}</p>
        </div>
    `;
    
    document.getElementById('taskPreviewContent').innerHTML = content;
    openModal('taskPreviewModal');
}

function closeTaskPreviewModal() {
    closeModal('taskPreviewModal');
}
// - getPriorityLabel()
function getPriorityLabel(priority) {
    switch(priority) {
        case 'low': return '🟢 Низкий';
        case 'medium': return '🟡 Средний';
        case 'high': return '🟠 Высокий';
        case 'critical': return '🔴 Критический';
        default: return priority;
    }
}
// - initTaskEditorHandlers()
// Инициализация обработчиков для секции создания задач
function initTaskEditorHandlers() {
    const createBtn = document.getElementById('createTaskSubmitBtn');
    if (createBtn) {
        createBtn.onclick = createTaskFromEditor;
    }
    
    const saveDraftBtn = document.getElementById('saveTaskDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.onclick = saveTaskDraft;
    }
    
    const previewBtn = document.getElementById('previewTaskBtn');
    if (previewBtn) {
        previewBtn.onclick = previewTask;
    }
    
    const closeBtn = document.getElementById('closeTaskEditorBtn');
    if (closeBtn) {
        closeBtn.onclick = () => closeWindow('base-section-task-new');
    }
    
    // Загрузка файлов
    const fileInput = document.getElementById('taskFileUpload');
    const uploadArea = document.querySelector('#base-section-task-new .file-upload-area');
    
    if (fileInput && uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const container = document.getElementById('taskUploadedFiles');
            
            for (const file of files) {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'uploaded-file';
                fileDiv.innerHTML = `
                    <div class="file-info">
                        <span class="file-name">${escapeHtml(file.name)}</span>
                        <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button class="file-remove" onclick="this.closest('.uploaded-file').remove()">🗑️</button>
                `;
                container.appendChild(fileDiv);
            }
            fileInput.value = '';
        });
        
        // Drag & drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--c_acc)';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#e0e0e0';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#e0e0e0';
            const files = Array.from(e.dataTransfer.files);
            const container = document.getElementById('taskUploadedFiles');
            
            for (const file of files) {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'uploaded-file';
                fileDiv.innerHTML = `
                    <div class="file-info">
                        <span class="file-name">${escapeHtml(file.name)}</span>
                        <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button class="file-remove" onclick="this.closest('.uploaded-file').remove()">🗑️</button>
                `;
                container.appendChild(fileDiv);
            }
        });
    }
    
    // Подсказки тегов
    const tagsInput = document.getElementById('taskTags');
    if (tagsInput) {
        tagsInput.addEventListener('focus', () => {
            const suggestions = document.getElementById('tagSuggestions');
            if (suggestions) suggestions.style.display = 'block';
        });
        
        tagsInput.addEventListener('blur', () => {
            setTimeout(() => {
                const suggestions = document.getElementById('tagSuggestions');
                if (suggestions) suggestions.style.display = 'none';
            }, 200);
        });
    }
}
// =====================================================
// 8. ВЫБОР ТИПА ЗАДАЧИ (СЕКЦИЯ TASK-NEW-TYPESELECTOR)
// =====================================================
// - loadUserTemplates()
async function loadUserTemplates() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/task-templates', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            userTemplates = data.templates || [];
            renderUserTemplates();
        }
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// - renderUserTemplates()
// Отрисовка списка шаблонов в секции выбора
function renderUserTemplates() {
    const container = document.getElementById('userTemplatesList');
    if (!container) return;
    
    if (userTemplates.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eef2f6;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">📁 Мои шаблоны</h4>
        </div>
    ` + userTemplates.map(template => `
        <button class="type-list-elem" data-template-id="${template.id}" onclick="openTaskFromTemplate(${template.id})">
            <div class="type-icon">📋</div>
            <h4>${escapeHtml(template.name)}</h4>
            <p class="type-desc">${escapeHtml(template.description || 'Пользовательский шаблон')}</p>
            <div style="font-size: 11px; color: #999; margin-top: 8px;">
                ${template.is_shared ? '👥 Общий для отдела' : '🔒 Личный'} | Использован ${template.usage_count || 0} раз
            </div>
        </button>
    `).join('');
}
// - openTaskTypeSelector()
// Открытие секции выбора типа
function openTaskTypeSelector() {
    loadUserTemplates();  // загружаем актуальные шаблоны
    openWindow('base-section-task-new-typeselector');
}
// - openSimpleTaskEditor()
// Открытие обычной задачи
function openSimpleTaskEditor(defaultDate = null) {
    // Очищаем форму
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDeadline').value = defaultDate || '';
    document.getElementById('taskAssignee').value = '';
    document.getElementById('taskObservers').value = '';
    document.getElementById('taskTags').value = '';
    document.getElementById('taskUploadedFiles').innerHTML = '';
    
    // Загружаем список пользователей
    loadTaskUsers();
    
    // Заполняем информацию о создателе
    const currentUser = window.currentUser;
    const creatorSpan = document.getElementById('previewCreator');
    if (creatorSpan && currentUser) {
        creatorSpan.textContent = `${currentUser.surname || ''} ${currentUser.name || ''}`.trim() || currentUser.username;
    }
    
    closeWindow('base-section-task-new-typeselector');
    openWindow('base-section-task-new-edit');
}
// - openTaskFromTemplate()
// Открытие задачи из шаблона
// 8.5 - Открытие задачи из шаблона (с заполнением всех полей)
async function openTaskFromTemplate(templateId) {
    const template = userTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    // Увеличиваем счётчик использования
    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/task-templates/${templateId}/use`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Error incrementing template usage:', error);
    }
    
    const templateData = template.template_data;
    
    // Открываем секцию создания задачи
    openWindow('base-section-task-new-edit');
    
    // Заполняем стандартные поля
    setTimeout(() => {
        // Название
        const titleInput = document.getElementById('taskTitle');
        if (titleInput && templateData.defaultTitle) {
            titleInput.value = templateData.defaultTitle;
        }
        
        // Описание
        const descTextarea = document.getElementById('taskDescription');
        if (descTextarea && templateData.defaultDescription) {
            descTextarea.value = templateData.defaultDescription;
        }
        
        // Приоритет
        const prioritySelect = document.getElementById('taskPriority');
        if (prioritySelect && templateData.defaultPriority) {
            prioritySelect.value = templateData.defaultPriority;
        }
        
        // Срок выполнения
        if (templateData.defaultDeadlineDays) {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + templateData.defaultDeadlineDays);
            const deadlineInput = document.getElementById('taskDeadline');
            if (deadlineInput) {
                deadlineInput.value = deadline.toISOString().slice(0, 10);
            }
        }
        
        // Заполняем кастомные поля
        if (templateData.fields && templateData.fields.length > 0) {
            renderCustomFieldsInTaskForm(templateData.fields);
        }
        
        showToast(`Шаблон "${template.name}" загружен`, 'success');
    }, 100);
}

// Рендер кастомных полей в форме задачи
function renderCustomFieldsInTaskForm(fields) {
    const formContainer = document.querySelector('#base-section-task-new-edit .editor-form');
    if (!formContainer) return;
    
    // Удаляем старую секцию кастомных полей, если есть
    const oldSection = document.getElementById('customFieldsSection');
    if (oldSection) oldSection.remove();
    
    if (fields.length === 0) return;
    
    // Создаём новую секцию
    const section = document.createElement('div');
    section.id = 'customFieldsSection';
    section.className = 'form-section';
    section.innerHTML = `
        <h3>📋 Дополнительные поля</h3>
        <div id="customFieldsContainer" class="custom-fields-grid"></div>
    `;
    formContainer.appendChild(section);
    
    const container = document.getElementById('customFieldsContainer');
    
    container.innerHTML = fields.map(field => {
        let inputHtml = '';
        const value = field.defaultValue || '';
        
        switch (field.type) {
            case 'text':
                inputHtml = `<input type="text" id="custom_${field.key}" class="form-input" placeholder="${escapeHtml(field.placeholder || '')}" value="${escapeHtml(value)}">`;
                break;
            case 'textarea':
                inputHtml = `<textarea id="custom_${field.key}" class="form-textarea" rows="3" placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(value)}</textarea>`;
                break;
            case 'number':
                inputHtml = `<input type="number" id="custom_${field.key}" class="form-input" placeholder="${escapeHtml(field.placeholder || '0')}" value="${value}">`;
                break;
            case 'date':
                inputHtml = `<input type="date" id="custom_${field.key}" class="form-input" value="${value}">`;
                break;
            case 'select':
                inputHtml = `
                    <select id="custom_${field.key}" class="form-select">
                        <option value="">${escapeHtml(field.placeholder || 'Выберите вариант')}</option>
                        ${(field.options || []).map(opt => `<option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
                    </select>
                `;
                break;
            case 'checkbox':
                inputHtml = `
                    <label class="checkbox-label">
                        <input type="checkbox" id="custom_${field.key}" ${value === true || value === 'true' ? 'checked' : ''}>
                        ${escapeHtml(field.label)}
                    </label>
                `;
                break;
            case 'user':
                inputHtml = `<select id="custom_${field.key}" class="form-select"><option value="">Выберите пользователя...</option></select>`;
                break;
            case 'multi-user':
                inputHtml = `<select id="custom_${field.key}" class="form-select" multiple size="3"><option value="">Выберите пользователей...</option></select>`;
                break;
            case 'document':
                inputHtml = `
                    <div class="document-selector-wrapper">
                        <div class="selected-document" id="selected_doc_${field.key}" style="display: ${value ? 'flex' : 'none'};">
                            <span class="doc-icon">📄</span>
                            <span class="doc-name">${escapeHtml(value)}</span>
                            <button type="button" class="doc-remove" onclick="clearDocument('${field.key}')">✖</button>
                        </div>
                        <button type="button" class="buttonbase btn-outline select-doc-btn" onclick="openDocumentSelector('${field.key}')">
                            📁 Выбрать документ
                        </button>
                        <input type="hidden" id="custom_${field.key}" value="${escapeHtml(value)}">
                    </div>
                `;
                break;
            default:
                inputHtml = `<input type="text" id="custom_${field.key}" class="form-input">`;
        }
        
        return `
            <div class="form-group">
                <label>${escapeHtml(field.label)}${field.required ? ' <span class="required-star">*</span>' : ''}</label>
                ${inputHtml}
                ${field.placeholder ? `<small class="form-hint">${escapeHtml(field.placeholder)}</small>` : ''}
            </div>
        `;
    }).join('');
}
// ========== УПРАВЛЕНИЕ ШАБЛОНАМИ ЗАДАЧ ==========



// Загрузка шаблонов пользователя











// Создание задачи
async function createSimpleTask() {
    const title = document.getElementById('taskTitle')?.value.trim();
    const deadline = document.getElementById('taskDeadline')?.value;
    const assignee = document.getElementById('taskAssignee')?.value;
    
    if (!title) {
        showToast('Введите название задачи', 'error');
        return;
    }
    if (!deadline) {
        showToast('Укажите срок выполнения', 'error');
        return;
    }
    if (!assignee) {
        showToast('Выберите ответственного исполнителя', 'error');
        return;
    }
    
    const taskData = {
        title,
        description: document.getElementById('taskDescription')?.value || '',
        priority: document.getElementById('taskPriority')?.value,
        dueDate: deadline,
        assignedTo: parseInt(assignee),
        observers: Array.from(document.getElementById('taskObservers')?.selectedOptions || []).map(opt => parseInt(opt.value)).filter(v => v),
        tags: document.getElementById('taskTags')?.value.split(',').map(t => t.trim()).filter(t => t),
        notifyAssignee: document.getElementById('notifyOnAssign')?.checked || false,
        notifyOnDeadline: document.getElementById('notifyOnDeadline')?.checked || false
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            showToast('✅ Задача создана', 'success');
            
            // Очищаем форму
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskDescription').value = '';
            document.getElementById('taskTags').value = '';
            document.getElementById('taskUploadedFiles').innerHTML = '';
            
            // Обновляем календарь и задачи
            await loadTasks();
            await loadCalendarEvents();
            
            // Закрываем редактор
            closeWindow('base-section-task-new-edit');
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка создания', 'error');
        }
    } catch (error) {
        console.error('Create task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// Загрузка пользователей для селектов
async function loadTaskUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const users = data.users || [];
            const options = users.map(user => 
                `<option value="${user.id}">${escapeHtml(user.surname)} ${escapeHtml(user.name)}</option>`
            ).join('');
            
            const assigneeSelect = document.getElementById('taskAssignee');
            const observersSelect = document.getElementById('taskObservers');
            
            if (assigneeSelect) {
                assigneeSelect.innerHTML = '<option value="">— Выберите —</option>' + options;
            }
            if (observersSelect) {
                observersSelect.innerHTML = options;
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Инициализация обработчиков редактора
function initTaskEditorHandlers() {
    const createBtn = document.getElementById('createTaskSubmitBtn');
    if (createBtn) {
        createBtn.onclick = createSimpleTask;
    }
    
    const closeBtn = document.getElementById('closeTaskEditorBtn');
    if (closeBtn) {
        closeBtn.onclick = () => closeWindow('base-section-task-new-edit');
    }
    
    const saveDraftBtn = document.getElementById('saveTaskDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.onclick = () => {
            const draft = {
                title: document.getElementById('taskTitle')?.value,
                description: document.getElementById('taskDescription')?.value,
                priority: document.getElementById('taskPriority')?.value,
                deadline: document.getElementById('taskDeadline')?.value,
                assignee: document.getElementById('taskAssignee')?.value,
                tags: document.getElementById('taskTags')?.value,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('taskDraft', JSON.stringify(draft));
            showToast('Черновик сохранён', 'success');
        };
    }
    
    // Загрузка файлов
    const fileInput = document.getElementById('taskFiles');
    const uploadArea = document.querySelector('#base-section-task-new-edit .file-upload-area');
    
    if (fileInput && uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const container = document.getElementById('taskUploadedFiles');
            
            for (const file of files) {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'uploaded-file';
                fileDiv.innerHTML = `
                    <div class="file-info">
                        <span class="file-name">${escapeHtml(file.name)}</span>
                        <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button class="file-remove" onclick="this.closest('.uploaded-file').remove()">🗑️</button>
                `;
                container.appendChild(fileDiv);
            }
            fileInput.value = '';
        });
    }
}

// Создание шаблона
async function createTemplate() {
    const name = document.getElementById('templateName')?.value.trim();
    const description = document.getElementById('templateDescription')?.value;
    const templateDataStr = document.getElementById('templateData')?.value;
    const isShared = document.getElementById('templateIsShared')?.checked || false;
    
    if (!name) {
        showToast('Введите название шаблона', 'error');
        return;
    }
    
    let templateData;
    try {
        templateData = JSON.parse(templateDataStr);
    } catch (e) {
        showToast('Неверный формат JSON', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/task-templates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description, templateData, isShared })
        });
        
        if (response.ok) {
            showToast('Шаблон создан', 'success');
            closeModal('templateEditorModal');
            await loadUserTemplates();
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Create template error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// Управление шаблонами
async function openManageTemplates() {
    await loadUserTemplates();
    
    const container = document.getElementById('templatesListContainer');
    if (container) {
        if (userTemplates.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px;">📭 У вас пока нет шаблонов</div>';
        } else {
            container.innerHTML = userTemplates.map(template => `
                <div class="template-item" style="padding: 15px; border-bottom: 1px solid #eef2f6;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${escapeHtml(template.name)}</strong>
                            <div style="font-size: 12px; color: #666;">${escapeHtml(template.description || '—')}</div>
                            <div style="font-size: 11px; margin-top: 5px;">
                                ${template.is_shared ? '👥 Общий для отдела' : '🔒 Личный'} | Использован: ${template.usage_count || 0} раз
                            </div>
                        </div>
                        <div>
                            <button class="buttonbase" style="padding: 4px 12px;" onclick="deleteTemplate(${template.id})">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    openModal('manageTemplatesModal');
}

async function deleteTemplate(templateId) {
    if (!confirm('Удалить этот шаблон?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/task-templates/${templateId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('Шаблон удалён', 'success');
            await loadUserTemplates();
            openManageTemplates(); // обновляем список
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (error) {
        console.error('Delete template error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// =====================================================
// 9. КОНСТРУКТОР ШАБЛОНОВ (ПОЛНОЭКРАННЫЙ)
// =====================================================
// =====================================================
// 9.1 СТАНДАРТНЫЕ ПОЛЯ ШАБЛОНА (НЕУДАЛЯЕМЫЕ)
// =====================================================

const defaultTemplateFields = [
    { 
        key: 'title', 
        label: 'Название задачи', 
        type: 'text', 
        required: true, 
        builtin: true,
        placeholder: 'Введите название задачи',
        order: 1
    },
    { 
        key: 'description', 
        label: 'Описание', 
        type: 'textarea', 
        required: false, 
        builtin: true,
        placeholder: 'Опишите задачу...',
        order: 2
    },
    { 
        key: 'priority', 
        label: 'Приоритет', 
        type: 'select', 
        required: true, 
        builtin: true,
        options: ['Низкий', 'Средний', 'Высокий', 'Критический'],
        defaultValue: 'Средний',
        order: 3
    },
    { 
        key: 'start_date', 
        label: 'Дата начала', 
        type: 'date', 
        required: false, 
        builtin: true,
        order: 4
    },
    { 
        key: 'due_date', 
        label: 'Срок выполнения', 
        type: 'date', 
        required: true, 
        builtin: true,
        order: 5
    },
    { 
        key: 'assignee', 
        label: 'Ответственный', 
        type: 'user', 
        required: true, 
        builtin: true,
        order: 6
    },
    { 
        key: 'observers', 
        label: 'Наблюдатели', 
        type: 'multi-user', 
        required: false, 
        builtin: true,
        order: 7
    }
];
// - fieldTypes (константа)
// Типы полей с иконками
const fieldTypes = {
    text: { icon: '📝', name: 'Текстовое поле', defaultLabel: 'Текстовое поле' },
    textarea: { icon: '📄', name: 'Текстовая область', defaultLabel: 'Описание' },
    number: { icon: '🔢', name: 'Число', defaultLabel: 'Количество' },
    date: { icon: '📅', name: 'Дата', defaultLabel: 'Дата' },
    select: { icon: '📋', name: 'Выпадающий список', defaultLabel: 'Выберите вариант' },
    checkbox: { icon: '☑️', name: 'Чекбокс', defaultLabel: 'Согласен' },
    user: { icon: '👤', name: 'Выбор пользователя', defaultLabel: 'Исполнитель' },
    'multi-user': { icon: '👥', name: 'Выбор нескольких', defaultLabel: 'Наблюдатели' },
    // В fieldTypes добавь:
    document: { icon: '📄', name: 'Связанный документ', defaultLabel: 'Документ' },
};

// - openTemplateBuilder()

// Открытие конструктора шаблонов (в отдельной секции)
function openTemplateBuilder(templateId = null) {
    currentEditingTemplateId = templateId;
    currentTemplateFields = [];
    editingFieldIndex = null;
    
    if (templateId) {
        // Редактирование существующего шаблона
        const template = userTemplates.find(t => t.id === templateId);
        if (template) {
            document.getElementById('builderTemplateName').value = template.name;
            document.getElementById('builderTemplateDesc').value = template.description || '';
            document.getElementById('builderIsShared').checked = template.is_shared || false;
            
            const data = template.template_data;
            document.getElementById('builderDefaultPriority').value = data.defaultPriority || 'medium';
            
            if (data.defaultDeadlineDays) {
                document.getElementById('builderDeadlineType').value = 'relative';
                document.getElementById('builderDeadlineDays').value = data.defaultDeadlineDays;
            } else if (data.fixedDeadline) {
                document.getElementById('builderDeadlineType').value = 'fixed';
                document.getElementById('builderDeadlineFixed').value = data.fixedDeadline;
            } else {
                document.getElementById('builderDeadlineType').value = 'none';
            }
            
            document.getElementById('builderNotifyAssignee').checked = data.notifyAssignee !== false;
            document.getElementById('builderNotifyDeadline').checked = data.notifyDeadline !== false;
            document.getElementById('builderNotifyObservers').checked = data.notifyObservers || false;
            
            currentTemplateFields = data.fields || [];
            renderFieldsList();
            renderTemplatePreview();
            
            document.getElementById('templateBuilderTitle').textContent = '✏️ Редактирование шаблона';
            const idSpan = document.getElementById('templateBuilderId');
            if (idSpan) idSpan.textContent = `ID: ${templateId}`;
        }
    } else {
        // Новый шаблон
        document.getElementById('builderTemplateName').value = '';
        document.getElementById('builderTemplateDesc').value = '';
        document.getElementById('builderIsShared').checked = false;
        document.getElementById('builderDefaultPriority').value = 'medium';
        document.getElementById('builderDeadlineType').value = 'relative';
        document.getElementById('builderDeadlineDays').value = '7';
        document.getElementById('builderNotifyAssignee').checked = true;
        document.getElementById('builderNotifyDeadline').checked = true;
        document.getElementById('builderNotifyObservers').checked = false;
        currentTemplateFields = [];
        renderFieldsList();
        renderTemplatePreview();
        document.getElementById('templateBuilderTitle').textContent = '📋 Конструктор шаблона';
        const idSpan = document.getElementById('templateBuilderId');
        if (idSpan) idSpan.textContent = '';
    }
    
    updateDeadlineFieldsVisibility();
    
    // Закрываем секцию выбора и открываем конструктор
    closeWindow('base-section-task-new-typeselector');
    openWindow('base-section-template-builder');
}
// - closeTemplateBuilder()
// Закрытие конструктора
function closeTemplateBuilder() {
    closeWindow('base-section-template-builder');
    // Возвращаемся к выбору шаблонов
    openWindow('base-section-task-new-typeselector');
}
// - updateDeadlineFieldsVisibility()
// Обновление видимости полей срока
function updateDeadlineFieldsVisibility() {
    const deadlineType = document.getElementById('builderDeadlineType')?.value;
    const daysGroup = document.getElementById('builderDeadlineDaysGroup');
    const fixedGroup = document.getElementById('builderDeadlineFixedGroup');
    
    if (daysGroup && fixedGroup) {
        if (deadlineType === 'relative') {
            daysGroup.style.display = 'block';
            fixedGroup.style.display = 'none';
        } else if (deadlineType === 'fixed') {
            daysGroup.style.display = 'none';
            fixedGroup.style.display = 'block';
        } else {
            daysGroup.style.display = 'none';
            fixedGroup.style.display = 'none';
        }
    }
}
// - openFieldEditor()
// Открытие редактора поля (НЕ закрывает конструктор)
function openFieldEditor(fieldIndex = null) {
    editingFieldIndex = fieldIndex;
    const field = fieldIndex !== null ? currentTemplateFields[fieldIndex] : null;
    
    const titleEl = document.getElementById('fieldEditorTitle');
    const deleteBtn = document.getElementById('deleteFieldBtn');
    
    if (field) {
        titleEl.textContent = '✏️ Редактирование поля';
        deleteBtn.style.display = 'block';
        document.getElementById('fieldType').value = field.type;
        document.getElementById('fieldLabel').value = field.label;
        document.getElementById('fieldKey').value = field.key || '';
        document.getElementById('fieldPlaceholder').value = field.placeholder || '';
        document.getElementById('fieldDefaultValue').value = field.defaultValue || '';
        document.getElementById('fieldRequired').checked = field.required || false;
        
        toggleOptionsVisibility(field.type);
        if (field.type === 'select' && field.options) {
            renderOptionsList(field.options);
        } else {
            renderOptionsList(['Вариант 1']);
        }
    } else {
        titleEl.textContent = '➕ Добавление поля';
        deleteBtn.style.display = 'none';
        document.getElementById('fieldType').value = 'text';
        document.getElementById('fieldLabel').value = '';
        document.getElementById('fieldKey').value = '';
        document.getElementById('fieldPlaceholder').value = '';
        document.getElementById('fieldDefaultValue').value = '';
        document.getElementById('fieldRequired').checked = false;
        toggleOptionsVisibility('text');
        renderOptionsList(['Вариант 1']);
    }
    
    openModal('fieldEditorModal');
}
// - closeFieldEditorModal()
// Закрытие модалки поля (без закрытия конструктора)
function closeFieldEditorModal() {
    closeModal('fieldEditorModal');
}
// - toggleOptionsVisibility()
// Переключение видимости опций
function toggleOptionsVisibility(type) {
    const optionsGroup = document.getElementById('fieldOptionsGroup');
    if (optionsGroup) {
        optionsGroup.style.display = type === 'select' ? 'block' : 'none';
    }
}
// - renderOptionsList()
// Отрисовка списка опций
function renderOptionsList(options) {
    const container = document.getElementById('optionsList');
    if (!container) return;
    
    container.innerHTML = options.map((opt, idx) => `
        <div class="option-item">
            <input type="text" class="option-input" value="${escapeHtml(opt)}" data-index="${idx}">
            <button type="button" class="remove-option-btn" onclick="removeOption(${idx})">×</button>
        </div>
    `).join('');
}
// - addOption()
// Добавление опции
function addOption() {
    const container = document.getElementById('optionsList');
    if (!container) return;
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-item';
    optionDiv.innerHTML = `
        <input type="text" class="option-input" value="Новый вариант">
        <button type="button" class="remove-option-btn" onclick="removeOption(${container.children.length})">×</button>
    `;
    container.appendChild(optionDiv);
}
// - removeOption()
// Удаление опции
function removeOption(index) {
    const container = document.getElementById('optionsList');
    if (!container) return;
    
    if (container.children.length <= 1) {
        showToast('Должен быть хотя бы один вариант', 'error');
        return;
    }
    container.children[index].remove();
}
// - getCurrentOptions()
// Получение текущих опций
function getCurrentOptions() {
    const inputs = document.querySelectorAll('#optionsList .option-input');
    return Array.from(inputs).map(input => input.value.trim()).filter(v => v);
}
// - saveField()
// Сохранение поля (возвращаемся к конструктору, НЕ закрывая его)
function saveField() {
    const type = document.getElementById('fieldType').value;
    const label = document.getElementById('fieldLabel').value.trim();
    let key = document.getElementById('fieldKey').value.trim();
    const placeholder = document.getElementById('fieldPlaceholder').value;
    const defaultValue = document.getElementById('fieldDefaultValue').value;
    const required = document.getElementById('fieldRequired').checked;
    
    if (!label) {
        showToast('Введите название поля', 'error');
        return;
    }
    
    // Генерация ключа из названия, если не указан
    if (!key) {
        key = label.toLowerCase()
            .replace(/[^а-яa-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    
    const fieldData = {
        type,
        label,
        key,
        placeholder,
        defaultValue,
        required
    };
    
    if (type === 'select') {
        fieldData.options = getCurrentOptions();
    }
    
    if (editingFieldIndex !== null) {
        currentTemplateFields[editingFieldIndex] = fieldData;
    } else {
        currentTemplateFields.push(fieldData);
    }
    
    renderFieldsList();
    renderTemplatePreview();
    closeFieldEditorModal(); // Закрываем только модалку, конструктор остаётся открытым
}
// - deleteField()
// Удаление поля
function deleteField() {
    if (editingFieldIndex !== null && confirm('Удалить это поле?')) {
        currentTemplateFields.splice(editingFieldIndex, 1);
        renderFieldsList();
        renderTemplatePreview();
        closeFieldEditorModal();
    }
}
// - renderFieldsList()
// Отрисовка списка полей с drag&drop
function renderFieldsList() {
    const container = document.getElementById('templateFieldsList');
    if (!container) return;
    
    // Смешиваем стандартные и кастомные поля
    const allFields = [
        ...defaultTemplateFields.map(f => ({ ...f, isBuiltin: true, id: f.key })),
        ...currentTemplateFields.map((f, idx) => ({ ...f, isBuiltin: false, id: `custom_${idx}` }))
    ].sort((a, b) => (a.order || 999) - (b.order || 999));
    
    if (allFields.length === 0) {
        container.innerHTML = `
            <div class="empty-fields">
                <div class="empty-icon">📝</div>
                <p>Нет добавленных полей</p>
                <small>Нажмите "Добавить поле", чтобы создать кастомное поле</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allFields.map((field, idx) => `
        <div class="field-item ${field.isBuiltin ? 'builtin-field' : ''}" 
             data-field-key="${field.key}" 
             data-is-builtin="${field.isBuiltin}"
             draggable="${!field.isBuiltin}">
            <div class="field-info">
                <div class="field-label">
                    ${getFieldIcon(field.type)} ${escapeHtml(field.label)}
                    ${field.required ? '<span class="field-required">*</span>' : ''}
                    ${field.isBuiltin ? '<span class="builtin-badge">Стандартное</span>' : ''}
                </div>
                <div class="field-type">${getFieldTypeName(field.type)}</div>
            </div>
            <div class="field-actions">
                ${!field.isBuiltin ? `
                    <button onclick="openFieldEditorForCustom(${idx})" title="Редактировать">✏️</button>
                    <button onclick="deleteCustomField(${idx})" title="Удалить">🗑️</button>
                ` : `
                    <button onclick="openFieldEditorForBuiltin('${field.key}')" title="Настроить">⚙️</button>
                `}
            </div>
        </div>
    `).join('');
    
    initDragAndDrop();
}

// Иконки для типов полей
function getFieldIcon(type) {
    const icons = {
        text: '📝',
        textarea: '📄',
        number: '🔢',
        date: '📅',
        select: '📋',
        checkbox: '☑️',
        user: '👤',
        'multi-user': '👥'
    };
    return icons[type] || '📌';
}

function getFieldTypeName(type) {
    const names = {
        text: 'Текстовое поле',
        textarea: 'Текстовая область',
        number: 'Число',
        date: 'Дата',
        select: 'Выпадающий список',
        checkbox: 'Чекбокс',
        user: 'Выбор пользователя',
        'multi-user': 'Выбор нескольких'
    };
    return names[type] || type;
}

// Редактирование стандартного поля
function openFieldEditorForBuiltin(fieldKey) {
    const field = defaultTemplateFields.find(f => f.key === fieldKey);
    if (!field) return;
    
    editingFieldIndex = null;
    editingBuiltinFieldKey = fieldKey;
    
    document.getElementById('fieldEditorTitle').textContent = `⚙️ Настройка: ${field.label}`;
    document.getElementById('deleteFieldBtn').style.display = 'none';
    document.getElementById('fieldType').value = field.type;
    document.getElementById('fieldType').disabled = true;  // Тип нельзя менять
    document.getElementById('fieldLabel').value = field.label;
    document.getElementById('fieldLabel').disabled = true;  // Название нельзя менять
    document.getElementById('fieldKey').value = field.key;
    document.getElementById('fieldKey').disabled = true;
    document.getElementById('fieldPlaceholder').value = field.placeholder || '';
    document.getElementById('fieldDefaultValue').value = field.defaultValue || '';
    document.getElementById('fieldRequired').checked = field.required || false;
    
    toggleOptionsVisibility(field.type);
    if (field.type === 'select' && field.options) {
        renderOptionsList(field.options);
    } else {
        renderOptionsList(['Вариант 1']);
    }
    
    openModal('fieldEditorModal');
}

// Сохранение настроек стандартного поля
function saveBuiltinFieldSettings() {
    const fieldKey = editingBuiltinFieldKey;
    const field = defaultTemplateFields.find(f => f.key === fieldKey);
    if (!field) return;
    
    field.required = document.getElementById('fieldRequired').checked;
    field.placeholder = document.getElementById('fieldPlaceholder').value;
    
    if (field.type === 'select') {
        field.options = getCurrentOptions();
        field.defaultValue = document.getElementById('fieldDefaultValue').value;
    } else if (field.type === 'checkbox') {
        field.defaultValue = document.getElementById('fieldDefaultValue').value === 'true';
    } else {
        field.defaultValue = document.getElementById('fieldDefaultValue').value;
    }
    
    renderFieldsList();
    renderTemplatePreview();
    closeFieldEditorModal();
}

// Редактирование кастомного поля
function openFieldEditorForCustom(fieldIndex) {
    editingFieldIndex = fieldIndex;
    editingBuiltinFieldKey = null;
    const field = currentTemplateFields[fieldIndex];
    
    // Убеждаемся, что в селекте есть опция "document"
    const typeSelect = document.getElementById('fieldType');
    if (typeSelect && !Array.from(typeSelect.options).some(opt => opt.value === 'document')) {
        const option = document.createElement('option');
        option.value = 'document';
        option.textContent = '📄 Связанный документ';
        typeSelect.appendChild(option);
    }
    
    document.getElementById('fieldEditorTitle').textContent = '✏️ Редактирование поля';
    document.getElementById('deleteFieldBtn').style.display = 'block';
    document.getElementById('fieldType').disabled = false;
    document.getElementById('fieldLabel').disabled = false;
    document.getElementById('fieldKey').disabled = false;
    document.getElementById('fieldType').value = field.type;
    document.getElementById('fieldLabel').value = field.label;
    document.getElementById('fieldKey').value = field.key;
    document.getElementById('fieldPlaceholder').value = field.placeholder || '';
    document.getElementById('fieldDefaultValue').value = field.defaultValue || '';
    document.getElementById('fieldRequired').checked = field.required || false;
    
    toggleOptionsVisibility(field.type);
    if (field.type === 'select' && field.options) {
        renderOptionsList(field.options);
    } else {
        renderOptionsList(['Вариант 1']);
    }
    
    openModal('fieldEditorModal');
}
// - deleteFieldFromList()
// Удаление поля из списка
function deleteFieldFromList(index) {
    if (confirm('Удалить это поле?')) {
        currentTemplateFields.splice(index, 1);
        renderFieldsList();
        renderTemplatePreview();
    }
}
// - initDragAndDrop()
// Инициализация drag&drop
function initDragAndDrop() {
    const items = document.querySelectorAll('.field-item');
    
    items.forEach(item => {
        item.removeEventListener('dragstart', handleDragStart);
        item.removeEventListener('dragend', handleDragEnd);
        item.removeEventListener('dragover', handleDragOver);
        item.removeEventListener('drop', handleDrop);
        
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
    });
}
// - handleDragStart/End/Over/Drop()
function handleDragStart(e) {
    dragStartIndex = parseInt(e.target.closest('.field-item')?.dataset.index);
    e.target.closest('.field-item')?.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.closest('.field-item')?.classList.remove('dragging');
    dragStartIndex = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const dragEndElement = e.target.closest('.field-item');
    if (!dragEndElement) return;
    
    const dragEndIndex = parseInt(dragEndElement.dataset.index);
    
    if (dragStartIndex !== null && dragStartIndex !== dragEndIndex) {
        const draggedItem = currentTemplateFields[dragStartIndex];
        currentTemplateFields.splice(dragStartIndex, 1);
        currentTemplateFields.splice(dragEndIndex, 0, draggedItem);
        renderFieldsList();
        renderTemplatePreview();
    }
}
// - renderTemplatePreview()
// Предпросмотр формы
// 9.3 - Рендер предпросмотра (как мини-страница)
function renderTemplatePreview() {
    const container = document.getElementById('templatePreview');
    if (!container) return;
    
    // Собираем все поля (стандартные + кастомные)
    const allFields = [
        ...defaultTemplateFields,
        ...currentTemplateFields
    ].sort((a, b) => (a.order || 999) - (b.order || 999));
    
    if (allFields.length === 0) {
        container.innerHTML = '<div class="empty-preview">📭 Нет полей для отображения</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="google-form-preview">
            <div class="preview-header">
                <div class="preview-title">Предпросмотр формы</div>
                <div class="preview-url">https://forms.example.com/template</div>
            </div>
            <div class="preview-body">
                ${allFields.map(field => renderPreviewField(field)).join('')}
                <div class="preview-actions">
                    <button class="preview-submit-btn" disabled>Отправить</button>
                    <button class="preview-clear-btn" disabled>Очистить</button>
                </div>
            </div>
            <div class="preview-footer">
                <span class="preview-powered">Google Forms • Предпросмотр</span>
            </div>
        </div>
    `;
}

function renderPreviewField(field) {
    let inputHtml = '';
    const value = field.defaultValue || '';
    
    switch (field.type) {
        case 'text':
            inputHtml = `<input type="text" class="preview-input" placeholder="${escapeHtml(field.placeholder || 'Введите текст...')}" value="${escapeHtml(value)}" ${field.required ? 'required' : ''}>`;
            break;
        case 'textarea':
            inputHtml = `<textarea class="preview-textarea" placeholder="${escapeHtml(field.placeholder || 'Введите текст...')}" rows="3" ${field.required ? 'required' : ''}>${escapeHtml(value)}</textarea>`;
            break;
        case 'number':
            inputHtml = `<input type="number" class="preview-input" placeholder="${escapeHtml(field.placeholder || '0')}" value="${value}" ${field.required ? 'required' : ''}>`;
            break;
        case 'date':
            inputHtml = `<input type="date" class="preview-input" value="${value}" ${field.required ? 'required' : ''}>`;
            break;
        case 'select':
            inputHtml = `
                <select class="preview-select" ${field.required ? 'required' : ''}>
                    <option value="">${escapeHtml(field.placeholder || 'Выберите вариант')}</option>
                    ${(field.options || []).map(opt => `<option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
                </select>
            `;
            break;
        case 'checkbox':
            inputHtml = `
                <label class="preview-checkbox">
                    <input type="checkbox" ${value === true || value === 'true' ? 'checked' : ''}>
                    <span>Да / Нет</span>
                </label>
            `;
            break;
        case 'user':
            inputHtml = `<select class="preview-select" ${field.required ? 'required' : ''}><option value="">Выберите пользователя...</option><option value="1">Иванов И.И.</option><option value="2">Петрова М.С.</option></select>`;
            break;
        case 'multi-user':
            inputHtml = `
                <div class="preview-multiselect">
                    <label class="preview-checkbox"><input type="checkbox" value="1"> Иванов И.И.</label>
                    <label class="preview-checkbox"><input type="checkbox" value="2"> Петрова М.С.</label>
                    <label class="preview-checkbox"><input type="checkbox" value="3"> Сидоров А.В.</label>
                </div>
            `;
            break;
            case 'document':
                inputHtml = `
                    <div class="preview-document-attachment">
                        <div class="attachment-preview">
                            <span class="attachment-icon">📄</span>
                            <span class="attachment-name">${escapeHtml(value || 'Не выбран')}</span>
                            <button class="attachment-remove" type="button" disabled>✖</button>
                        </div>
                        <button class="attachment-select-btn" type="button" disabled>Выбрать документ</button>
                    </div>
                `;
                break;
        default:
            inputHtml = `<input type="text" class="preview-input">`;
    }
    
    return `
        <div class="preview-field ${field.required ? 'required' : ''}">
            <div class="preview-field-label">
                ${escapeHtml(field.label)}
                ${field.required ? '<span class="preview-required-star">*</span>' : ''}
            </div>
            <div class="preview-field-help">${escapeHtml(field.placeholder || '')}</div>
            <div class="preview-field-input">${inputHtml}</div>
        </div>
    `;
}
// - saveTemplateFromBuilder()
// Сохранение шаблона из конструктора
async function saveTemplateFromBuilder() {
    const name = document.getElementById('builderTemplateName')?.value.trim();
    const description = document.getElementById('builderTemplateDesc')?.value;
    const isShared = document.getElementById('builderIsShared')?.checked || false;
    const defaultPriority = document.getElementById('builderDefaultPriority')?.value;
    const deadlineType = document.getElementById('builderDeadlineType')?.value;
    
    if (!name) {
        showToast('Введите название шаблона', 'error');
        return;
    }
    
    // Формируем данные шаблона
    const templateData = {
        fields: currentTemplateFields,
        defaultPriority: defaultPriority,
        notifyAssignee: document.getElementById('builderNotifyAssignee')?.checked || false,
        notifyDeadline: document.getElementById('builderNotifyDeadline')?.checked || false,
        notifyObservers: document.getElementById('builderNotifyObservers')?.checked || false
    };
    
    if (deadlineType === 'relative') {
        templateData.defaultDeadlineDays = parseInt(document.getElementById('builderDeadlineDays')?.value) || 7;
    } else if (deadlineType === 'fixed') {
        templateData.fixedDeadline = document.getElementById('builderDeadlineFixed')?.value;
    }
    
    try {
        const token = localStorage.getItem('token');
        let response;
        
        if (currentEditingTemplateId) {
            // Обновление существующего шаблона
            response = await fetch(`/api/task-templates/${currentEditingTemplateId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    description,
                    templateData,
                    isShared
                })
            });
        } else {
            // Создание нового шаблона
            response = await fetch('/api/task-templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    description,
                    templateData,
                    isShared
                })
            });
        }
        
        if (response.ok) {
            showToast(currentEditingTemplateId ? 'Шаблон обновлён' : 'Шаблон сохранён', 'success');
            await loadUserTemplates();
            closeTemplateBuilder(); // Закрываем конструктор, возвращаемся к выбору
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Save template error:', error);
        showToast('Ошибка сервера', 'error');
    }
}
// - previewTemplate()
// Предпросмотр шаблона в модалке
function previewTemplate() {
    const name = document.getElementById('builderTemplateName')?.value;
    if (!name) {
        showToast('Введите название шаблона', 'error');
        return;
    }
    
    document.getElementById('templatePreviewTitle').textContent = `👁️ Предпросмотр: ${escapeHtml(name)}`;
    document.getElementById('templatePreviewContent').innerHTML = document.getElementById('templatePreview')?.innerHTML || 'Нет полей';
    openModal('templateFullPreviewModal');
}

function closeTemplateFullPreviewModal() {
    closeModal('templateFullPreviewModal');
}
// - saveTemplateDraft()
// Сохранение черновика шаблона
function saveTemplateDraft() {
    const name = document.getElementById('builderTemplateName')?.value;
    if (!name) {
        showToast('Введите название шаблона перед сохранением', 'error');
        return;
    }
    
    const draft = {
        name: name,
        description: document.getElementById('builderTemplateDesc')?.value,
        isShared: document.getElementById('builderIsShared')?.checked,
        defaultPriority: document.getElementById('builderDefaultPriority')?.value,
        deadlineType: document.getElementById('builderDeadlineType')?.value,
        deadlineDays: document.getElementById('builderDeadlineDays')?.value,
        deadlineFixed: document.getElementById('builderDeadlineFixed')?.value,
        notifyAssignee: document.getElementById('builderNotifyAssignee')?.checked,
        notifyDeadline: document.getElementById('builderNotifyDeadline')?.checked,
        notifyObservers: document.getElementById('builderNotifyObservers')?.checked,
        fields: currentTemplateFields,
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('templateDraft', JSON.stringify(draft));
    showToast('Черновик шаблона сохранён', 'success');
}
// - loadTemplateDraft()
// Загрузка черновика шаблона
function loadTemplateDraft() {
    const saved = localStorage.getItem('templateDraft');
    if (saved) {
        const draft = JSON.parse(saved);
        if (confirm('Найден сохранённый черновик шаблона. Загрузить?')) {
            document.getElementById('builderTemplateName').value = draft.name || '';
            document.getElementById('builderTemplateDesc').value = draft.description || '';
            document.getElementById('builderIsShared').checked = draft.isShared || false;
            document.getElementById('builderDefaultPriority').value = draft.defaultPriority || 'medium';
            document.getElementById('builderDeadlineType').value = draft.deadlineType || 'relative';
            document.getElementById('builderDeadlineDays').value = draft.deadlineDays || '7';
            document.getElementById('builderDeadlineFixed').value = draft.deadlineFixed || '';
            document.getElementById('builderNotifyAssignee').checked = draft.notifyAssignee !== false;
            document.getElementById('builderNotifyDeadline').checked = draft.notifyDeadline !== false;
            document.getElementById('builderNotifyObservers').checked = draft.notifyObservers || false;
            
            currentTemplateFields = draft.fields || [];
            renderFieldsList();
            renderTemplatePreview();
            updateDeadlineFieldsVisibility();
            
            showToast('Черновик загружен', 'success');
        }
    }
}
// - initTemplateBuilderHandlers()
// Инициализация обработчиков конструктора
function initTemplateBuilderHandlers() {
    // Кнопки в конструкторе
    const addFieldBtn = document.getElementById('addFieldBtn');
    if (addFieldBtn) addFieldBtn.onclick = () => openFieldEditor();
    
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    if (saveTemplateBtn) saveTemplateBtn.onclick = saveTemplateFromBuilder;
    
    const previewTemplateBtn = document.getElementById('previewTemplateBtn');
    if (previewTemplateBtn) previewTemplateBtn.onclick = previewTemplate;
    
    const saveDraftBtn = document.getElementById('saveTemplateDraftBtn');
    if (saveDraftBtn) saveDraftBtn.onclick = saveTemplateDraft;
    
    const closeBtn = document.getElementById('closeTemplateBuilderBtn');
    if (closeBtn) closeBtn.onclick = closeTemplateBuilder;
    
    const deadlineType = document.getElementById('builderDeadlineType');
    if (deadlineType) deadlineType.onchange = updateDeadlineFieldsVisibility;
    
    // Кнопки в модалке поля
    const saveFieldBtn = document.getElementById('saveFieldBtn');
    if (saveFieldBtn) saveFieldBtn.onclick = saveField;
    
    const deleteFieldBtn = document.getElementById('deleteFieldBtn');
    if (deleteFieldBtn) deleteFieldBtn.onclick = deleteField;
    
    const addOptionBtn = document.getElementById('addOptionBtn');
    if (addOptionBtn) addOptionBtn.onclick = addOption;
    
    const fieldType = document.getElementById('fieldType');
    if (fieldType) fieldType.onchange = (e) => toggleOptionsVisibility(e.target.value);
    
    // Генерация ключа из названия
    const fieldLabel = document.getElementById('fieldLabel');
    if (fieldLabel) {
        fieldLabel.oninput = (e) => {
            const keyInput = document.getElementById('fieldKey');
            if (keyInput && !keyInput.value) {
                const key = e.target.value
                    .toLowerCase()
                    .replace(/[^а-яa-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
                keyInput.value = key;
            }
        };
    }
}





// =====================================================
// 10. УПРАВЛЕНИЕ ШАБЛОНАМИ (СЕКЦИЯ TEMPLATES)
// =====================================================
// - allTemplates (переменная)
let allTemplates = {
    tasks: [],
    documents: [],
    workflows: []
};
// - loadAllTemplates()
// Загрузка всех шаблонов пользователя
async function loadAllTemplates() {
    try {
        const token = localStorage.getItem('token');
        
        // Загружаем шаблоны задач
        const tasksRes = await fetch('/api/task-templates', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tasksRes.ok) {
            const data = await tasksRes.json();
            allTemplates.tasks = data.templates || [];
        }
        
        // TODO: Загружаем шаблоны документов (когда будут готовы)
        // const docsRes = await fetch('/api/document-templates', ...
        allTemplates.documents = [];
        
        // TODO: Загружаем шаблоны процессов (когда будут готовы)
        allTemplates.workflows = [];
        
        renderTemplatesGrid();
        
    } catch (error) {
        console.error('Error loading templates:', error);
        showToast('Ошибка загрузки шаблонов', 'error');
    }
}
// - renderTemplatesGrid()
// Отрисовка сетки шаблонов
function renderTemplatesGrid() {
    const container = document.getElementById('templatesGridContainer');
    if (!container) return;
    
    let allItems = [];
    
    if (currentTemplateFilter === 'all' || currentTemplateFilter === 'task') {
        allItems.push(...allTemplates.tasks.map(t => ({ ...t, type: 'task', typeIcon: '📝', typeName: 'Задача' })));
    }
    if (currentTemplateFilter === 'all' || currentTemplateFilter === 'document') {
        allItems.push(...allTemplates.documents.map(t => ({ ...t, type: 'document', typeIcon: '📄', typeName: 'Документ' })));
    }
    if (currentTemplateFilter === 'all' || currentTemplateFilter === 'workflow') {
        allItems.push(...allTemplates.workflows.map(t => ({ ...t, type: 'workflow', typeIcon: '🔄', typeName: 'Процесс' })));
    }
    
    if (allItems.length === 0) {
        container.innerHTML = `
            <div class="empty-templates">
                <div class="empty-icon">📋</div>
                <h3>Нет шаблонов</h3>
                <p>Создайте свой первый шаблон, чтобы ускорить работу</p>
                <button class="buttonbase" id="emptyStateCreateBtn">+ Создать шаблон</button>
            </div>
        `;
        
        const emptyBtn = document.getElementById('emptyStateCreateBtn');
        if (emptyBtn) emptyBtn.onclick = () => openTemplateTypeSelector();
        return;
    }
    
    container.innerHTML = `
        <div class="templates-grid">
            ${allItems.map(template => `
                <div class="template-card" data-type="${template.type}" data-id="${template.id}">
                    <div class="template-card-header">
                        <div class="template-card-icon">${template.typeIcon}</div>
                        <div class="template-card-type">${template.typeName}</div>
                    </div>
                    <h3 class="template-card-title">${escapeHtml(template.name)}</h3>
                    <p class="template-card-desc">${escapeHtml(template.description || 'Нет описания')}</p>
                    <div class="template-card-meta">
                        <span>${template.usage_count || 0} использований</span>
                        <span>${template.is_shared ? '👥 Общий' : '🔒 Личный'}</span>
                        <div class="template-card-actions">
                            <button onclick="editTemplate(${template.id}, '${template.type}')" title="Редактировать">✏️</button>
                            <button onclick="useTemplate('${template.type}', ${template.id})" title="Использовать">🚀</button>
                            <button onclick="deleteTemplate(${template.id}, '${template.type}')" title="Удалить">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
// - openTemplateTypeSelector()
// Открытие выбора типа шаблона для создания
function openTemplateTypeSelector() {
    document.getElementById('createTaskTemplateBtn').onclick = () => {
        closeTemplateTypeModal();
        openTemplateBuilder();
    };
    openModal('templateTypeModal');
}

function closeTemplateTypeModal() {
    closeModal('templateTypeModal');
}
// - createNewTemplate()
// Создание нового шаблона
function createNewTemplate(type) {
    closeModal('templateTypeModal');
    
    if (type === 'task') {
        openTemplateBuilder();
    } else {
        showToast('Этот тип шаблонов пока в разработке', 'info');
    }
}
// - editTemplate()
// Редактирование шаблона
async function editTemplate(templateId, type) {
    if (type === 'task') {
        // Загружаем данные шаблона перед открытием
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/task-templates/${templateId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const template = data.template;
                if (template) {
                    openTemplateBuilder(templateId);
                }
            }
        } catch (error) {
            console.error('Error loading template:', error);
            showToast('Ошибка загрузки шаблона', 'error');
        }
    } else {
        showToast('Редактирование пока недоступно', 'info');
    }
}
// - deleteTemplate()
// Удаление шаблона
async function deleteTemplate(templateId, type) {
    if (!confirm('Удалить этот шаблон?')) return;
    
    try {
        const token = localStorage.getItem('token');
        let response;
        
        if (type === 'task') {
            response = await fetch(`/api/task-templates/${templateId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
        
        if (response && response.ok) {
            showToast('Шаблон удалён', 'success');
            await loadAllTemplates();
            await loadUserTemplates();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (error) {
        console.error('Delete template error:', error);
        showToast('Ошибка сервера', 'error');
    }
}
// - useTemplate()
// Использование шаблона
async function useTemplate(type, templateId) {
    if (type === 'task') {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/task-templates/${templateId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const template = data.template;
                
                // Увеличиваем счётчик использования
                await fetch(`/api/task-templates/${templateId}/use`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                // Открываем редактор задачи с данными из шаблона
                openTaskFromTemplate(template);
                
                // Закрываем секцию шаблонов
                closeWindow('base-section-templates');
            }
        } catch (error) {
            console.error('Error using template:', error);
            showToast('Ошибка загрузки шаблона', 'error');
        }
    }
}
// - openTaskFromTemplate()
// Открытие редактора задачи с данными из шаблона
function openTaskFromTemplate(template) {
    const templateData = template.template_data;
    
    // Открываем секцию создания задачи
    openWindow('base-section-task-new-edit');
    
    // Заполняем поля из шаблона
    setTimeout(() => {
        const titleInput = document.getElementById('taskTitle');
        if (titleInput && templateData.defaultTitle) {
            titleInput.value = templateData.defaultTitle;
        }
        
        const prioritySelect = document.getElementById('taskPriority');
        if (prioritySelect && templateData.defaultPriority) {
            prioritySelect.value = templateData.defaultPriority;
        }
        
        // Если есть срок по умолчанию
        if (templateData.defaultDeadlineDays) {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + templateData.defaultDeadlineDays);
            const deadlineInput = document.getElementById('taskDeadline');
            if (deadlineInput) {
                deadlineInput.value = deadline.toISOString().slice(0, 10);
            }
        }
        
        // Если есть описание по умолчанию
        const descTextarea = document.getElementById('taskDescription');
        if (descTextarea && templateData.defaultDescription) {
            descTextarea.value = templateData.defaultDescription;
        }
        
        // Если в шаблоне есть кастомные поля — добавляем их в форму
        if (templateData.fields && templateData.fields.length > 0) {
            addCustomFieldsToForm(templateData.fields);
        }
        
        showToast(`Шаблон "${template.name}" загружен`, 'success');
    }, 100);
}
// - addCustomFieldsToForm()
// Добавление кастомных полей в форму задачи
function addCustomFieldsToForm(fields) {
    const formContainer = document.querySelector('#base-section-task-new-edit .editor-form');
    if (!formContainer) return;
    
    // Находим или создаём секцию для дополнительных полей
    let customSection = document.getElementById('customFieldsSection');
    if (!customSection) {
        const section = document.createElement('div');
        section.id = 'customFieldsSection';
        section.className = 'form-section';
        section.innerHTML = '<h3>📋 Дополнительные поля</h3><div id="customFieldsContainer"></div>';
        formContainer.appendChild(section);
        customSection = section;
    }
    
    const container = document.getElementById('customFieldsContainer');
    if (!container) return;
    
    container.innerHTML = fields.map(field => {
        let inputHtml = '';
        switch (field.type) {
            case 'text':
                inputHtml = `<input type="text" id="custom_${field.key}" class="form-input" placeholder="${escapeHtml(field.placeholder || '')}" value="${escapeHtml(field.defaultValue || '')}">`;
                break;
            case 'textarea':
                inputHtml = `<textarea id="custom_${field.key}" class="form-textarea" rows="3" placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(field.defaultValue || '')}</textarea>`;
                break;
            case 'date':
                inputHtml = `<input type="date" id="custom_${field.key}" class="form-input" value="${field.defaultValue || ''}">`;
                break;
            case 'select':
                inputHtml = `
                    <select id="custom_${field.key}" class="form-select">
                        <option value="">${escapeHtml(field.placeholder || 'Выберите вариант')}</option>
                        ${(field.options || []).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
                    </select>
                `;
                break;
            case 'checkbox':
                inputHtml = `
                    <label class="checkbox-label">
                        <input type="checkbox" id="custom_${field.key}" ${field.defaultValue === 'true' ? 'checked' : ''}>
                        ${escapeHtml(field.label)}
                    </label>
                `;
                break;
            default:
                inputHtml = `<input type="text" id="custom_${field.key}" class="form-input">`;
        }
        
        return `
            <div class="form-group">
                <label>${escapeHtml(field.label)}${field.required ? ' <span style="color: red;">*</span>' : ''}</label>
                ${inputHtml}
            </div>
        `;
    }).join('');
}
// - initTemplatesSection()
// Инициализация обработчиков секции шаблонов
function initTemplatesSection() {
    const templatesBtn = document.getElementById('top-menu-btn-templates');
    if (templatesBtn) {
        templatesBtn.addEventListener('click', () => {
            loadAllTemplates();
            openWindow('base-section-templates');
        });
    }
    
    const createNewBtn = document.getElementById('createNewTemplateBtn');
    if (createNewBtn) {
        createNewBtn.onclick = openTemplateTypeSelector;
    }
    
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTemplateFilter = btn.dataset.type;
            renderTemplatesGrid();
        });
    });
}
// =====================================================
// 12.6 ВЫБОР СВЯЗАННОГО ДОКУМЕНТА
// =====================================================

let currentDocumentFieldKey = null;

// Открытие селектора документов
async function openDocumentSelector(fieldKey) {
    currentDocumentFieldKey = fieldKey;
    
    // TODO: Загрузить список документов пользователя
    // Пока заглушка
    const mockDocuments = [
        { id: 1, name: 'Договор оказания услуг.pdf', type: 'contract', url: '/docs/contract.pdf' },
        { id: 2, name: 'Приказ о приёме.docx', type: 'order', url: '/docs/order.docx' },
        { id: 3, name: 'Служебная записка.docx', type: 'memo', url: '/docs/memo.docx' }
    ];
    
    const modalHtml = `
        <div id="documentSelectorModal" class="admin-modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>📄 Выбор документа</h2>
                    <button class="modal-close" onclick="closeDocumentSelector()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="search-box" style="margin-bottom: 16px;">
                        <input type="text" id="docSearchInput" class="form-input" placeholder="Поиск документов...">
                    </div>
                    <div id="documentsList" class="documents-list">
                        ${mockDocuments.map(doc => `
                            <div class="document-item" onclick="selectDocument(${doc.id}, '${escapeHtml(doc.name)}')">
                                <div class="doc-icon">📄</div>
                                <div class="doc-info">
                                    <div class="doc-name">${escapeHtml(doc.name)}</div>
                                    <div class="doc-type">${doc.type}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 16px;">
                        <label class="checkbox-label">
                            <input type="checkbox" id="createNewDocCheckbox"> 
                            Или указать ссылку вручную
                        </label>
                    </div>
                    <div id="manualDocLink" style="display: none; margin-top: 12px;">
                        <input type="text" id="manualDocUrl" class="form-input" placeholder="https://... или /docs/...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="buttonbase" onclick="closeDocumentSelector()">Отмена</button>
                    <button class="buttonbase" id="confirmDocumentBtn">Подтвердить</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('documentSelectorModal');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Обработчики
    const checkbox = document.getElementById('createNewDocCheckbox');
    checkbox.onchange = (e) => {
        const manualDiv = document.getElementById('manualDocLink');
        manualDiv.style.display = e.target.checked ? 'block' : 'none';
    };
    
    const searchInput = document.getElementById('docSearchInput');
    searchInput.oninput = (e) => {
        const searchText = e.target.value.toLowerCase();
        const items = document.querySelectorAll('#documentsList .document-item');
        items.forEach(item => {
            const name = item.querySelector('.doc-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(searchText) ? 'flex' : 'none';
        });
    };
    
    document.getElementById('confirmDocumentBtn').onclick = () => {
        const manualCheckbox = document.getElementById('createNewDocCheckbox');
        if (manualCheckbox.checked) {
            const manualUrl = document.getElementById('manualDocUrl').value;
            if (manualUrl) {
                selectDocument(null, manualUrl);
            } else {
                alert('Введите ссылку на документ');
            }
        }
    };
}

function closeDocumentSelector() {
    const modal = document.getElementById('documentSelectorModal');
    if (modal) modal.remove();
    currentDocumentFieldKey = null;
}

function selectDocument(docId, docName) {
    if (currentDocumentFieldKey) {
        const hiddenInput = document.getElementById(`custom_${currentDocumentFieldKey}`);
        const selectedDiv = document.getElementById(`selected_doc_${currentDocumentFieldKey}`);
        
        if (hiddenInput) hiddenInput.value = docName;
        if (selectedDiv) {
            selectedDiv.querySelector('.doc-name').textContent = docName;
            selectedDiv.style.display = 'flex';
        }
        
        // Скрываем кнопку выбора
        const selectBtn = selectedDiv?.parentElement?.querySelector('.select-doc-btn');
        if (selectBtn) selectBtn.style.display = 'none';
    }
    closeDocumentSelector();
}

function clearDocument(fieldKey) {
    const hiddenInput = document.getElementById(`custom_${fieldKey}`);
    const selectedDiv = document.getElementById(`selected_doc_${fieldKey}`);
    const selectBtn = selectedDiv?.parentElement?.querySelector('.select-doc-btn');
    
    if (hiddenInput) hiddenInput.value = '';
    if (selectedDiv) selectedDiv.style.display = 'none';
    if (selectBtn) selectBtn.style.display = 'inline-flex';
}

window.openDocumentSelector = openDocumentSelector;
window.closeDocumentSelector = closeDocumentSelector;
window.selectDocument = selectDocument;
window.clearDocument = clearDocument;






// =====================================================
// 11. ПРОЦЕССЫ (WORKFLOW) - МАРШРУТ СОГЛАСОВАНИЯ
// =====================================================
// - class ApprovalFlowManager { ... }
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
// =====================================================
// 12. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================================
// - formatDate()
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
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
// 13. ЗАГЛУШКИ (ДЛЯ ОТСУТСТВУЮЩИХ API)
// =====================================================
// - loadNotes (заглушка, если нужно)
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
// - loadDashboardStats()
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
    // Обработчики для шаблонов
    const createTemplateBtn = document.getElementById('createTemplateBtn');
        if (createTemplateBtn) {
            createTemplateBtn.onclick = () => {
                if (typeof openTemplateBuilder === 'function') {
                    openTemplateBuilder();
                } else {
                    console.error('openTemplateBuilder is not defined');
                }
            };
        }
    
    const manageTemplatesBtn = document.getElementById('manageTemplatesBtn');
    if (manageTemplatesBtn) {
        manageTemplatesBtn.onclick = openManageTemplates;
    }
    
    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    if (saveTemplateBtn) {
        saveTemplateBtn.onclick = createTemplate;
    }
    
    const addNewTemplateFromManageBtn = document.getElementById('addNewTemplateFromManageBtn');
    if (addNewTemplateFromManageBtn) {
        addNewTemplateFromManageBtn.onclick = () => {
            closeModal('manageTemplatesModal');
            if (typeof openTemplateBuilder === 'function') {
                openTemplateBuilder();
            }
        };
    }
    
    // Поиск по типам задач
    const searchInput = document.getElementById('taskTypeSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchText = e.target.value.toLowerCase();
            const types = document.querySelectorAll('#taskTypeList .type-list-elem');
            types.forEach(type => {
                const title = type.querySelector('h4')?.textContent.toLowerCase() || '';
                const desc = type.querySelector('.type-desc')?.textContent.toLowerCase() || '';
                if (title.includes(searchText) || desc.includes(searchText)) {
                    type.style.display = 'flex';
                } else {
                    type.style.display = 'none';
                }
            });
        });
    }
    const defaultWindow = document.getElementById('base-section-dashboard');
    if (defaultWindow) {
        defaultWindow.style.display = 'block';
        defaultWindow.classList.add('active');
    }
    // Маршрут согласования
    const flowManager = new ApprovalFlowManager();
    loadTasks();
    loadCalendarEvents();
    updateTemplateButtons();
    initTaskEditorHandlers();
    initTemplateBuilderHandlers();
    initUserSelectorHandlers();
    initTemplatesSection();
    initCalendar();
    loadNotes();
    loadDashboardStats();
    setTimeout(() => {
        if (document.getElementById('miniCalendar')) {
            renderMiniCalendar();
        }
    }, 100);
});

// Экспортируем функции в глобальную область
window.addTag = addTag;
window.previewTask = previewTask;
window.saveTaskDraft = saveTaskDraft;
window.createTaskFromEditor = createTaskFromEditor;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.toggleTaskStatus = toggleTaskStatus;
window.openFieldEditor = openFieldEditor;
window.deleteFieldFromList = deleteFieldFromList;
window.removeOption = removeOption;
window.openTemplateBuilder = openTemplateBuilder;
window.closeTemplateBuilder = closeTemplateBuilder;
window.closeFieldEditorModal = closeFieldEditorModal;















// ИНОЕ
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
function updateTemplateButtons() {
    const createTemplateBtn = document.getElementById('createTemplateBtn');
    if (createTemplateBtn) {
        createTemplateBtn.onclick = () => openTemplateBuilder();
    }
    
    const addNewTemplateFromManageBtn = document.getElementById('addNewTemplateFromManageBtn');
    if (addNewTemplateFromManageBtn) {
        addNewTemplateFromManageBtn.onclick = () => {
            closeModal('manageTemplatesModal');
            openTemplateBuilder();
        };
    }
    
    // Кнопка редактирования шаблона в списке управления
    document.querySelectorAll('.edit-template-btn').forEach(btn => {
        btn.onclick = () => openTemplateBuilder(parseInt(btn.dataset.id));
    });
}