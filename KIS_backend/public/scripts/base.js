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
btn_tasks_last.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-last'); loadRecentTasks();});
btn_tasks_at_work.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-at-work'); loadActiveTasks();});
btn_tasks_new.addEventListener('click', (e) => { e.stopPropagation(); openTaskTypeSelector();});
btn_tasks_archive.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-archive'); loadArchivedTasks();});
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
let currentViewTaskId = null;  // ← ДОБАВИТЬ ЭТУ СТРОКУ
let currentViewTask = null; 
// Настройки Ганта
let currentZoom = 'week';     // 'day', 'week', 'month'
let ganttCellWidth = 40;
let ganttHourHeight = 60;

// ИНИЦИАЛИЗАЦИЯ С ТЕКУЩЕЙ ДАТЫ
const now = new Date();
currentGanttDate = new Date(now);

// Для месяца — начало текущего месяца
ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
ganttEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

// Для недели — текущая неделя (понедельник)
const dayOfWeek = now.getDay();
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
weekStart.setHours(0, 0, 0, 0);
currentGanttDate = weekStart;

// Календарь тоже синхронизируем
currentCalendarDate = new Date(now);

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
// =====================================================
// ЗАМЕТКИ - СТИКЕРЫ НА ДОСКЕ
// =====================================================

let currentNoteType = 'personal';
let currentNoteId = null;

// Открытие модалки создания заметки
function openNoteModal(type) {
    currentNoteType = type;
    document.getElementById('noteModalTitle').textContent = type === 'personal' ? ' Моя заметка' : '👥 Общая заметка';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteId').value = '';
    openModal('noteModal');
}

// Сохранение заметки
async function saveNote() {
    const title = document.getElementById('noteTitle')?.value.trim() || '';
    const content = document.getElementById('noteContent')?.value.trim();
    const noteId = document.getElementById('noteId')?.value;
    
    if (!content) {
        showToast('Введите текст заметки', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Не авторизован', 'error');
            return;
        }
        
        const url = noteId ? `/api/notes/${noteId}` : '/api/notes';
        const method = noteId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title || content.substring(0, 30) + (content.length > 30 ? '...' : ''),
                content: content,
                type: currentNoteType
            })
        });
        
        if (response.ok) {
            showToast(noteId ? 'Заметка обновлена' : 'Заметка добавлена', 'success');
            closeModal('noteModal');
            await loadNotes();
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Save note error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// Загрузка заметок
async function loadNotes() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No token, skipping notes load');
            return;
        }
        
        // Загружаем личные заметки
        const personalRes = await fetch('/api/notes/personal', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (personalRes.ok) {
            const personal = await personalRes.json();
            renderNotes('personalNotesList', personal.notes || [], true);
            const countEl = document.getElementById('personalNotesCount');
            if (countEl) countEl.textContent = personal.notes?.length || 0;
        } else {
            console.warn('Failed to load personal notes:', personalRes.status);
        }
        
        // Загружаем общие заметки отдела
        const groupRes = await fetch('/api/notes/group', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (groupRes.ok) {
            const group = await groupRes.json();
            renderNotes('groupNotesList', group.notes || [], false);
            const countEl = document.getElementById('groupNotesCount');
            if (countEl) countEl.textContent = group.notes?.length || 0;
        } else {
            console.warn('Failed to load group notes:', groupRes.status);
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        // Показываем пустые состояния при ошибке
        renderNotes('personalNotesList', [], true);
        renderNotes('groupNotesList', [], false);
    }
}

// Отрисовка заметок
function renderNotes(containerId, notes, isPersonal) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!notes || notes.length === 0) {
        container.innerHTML = '<div class="empty-notes">📭 Нет заметок</div>';
        return;
    }
    
    // Получаем текущего пользователя
    const currentUser = window.currentUser || {};
    const currentUserId = currentUser.id;
    
    container.innerHTML = notes.map(note => {
        const isAuthor = note.user_id === currentUserId;
        const authorName = isAuthor ? 'Вы' : `${note.surname || ''} ${note.name || ''}`.trim() || 'Пользователь';
        
        // Форматируем дату
        const dateStr = formatNoteDate(note.created_at);
        
        return `
            <div class="note-item" data-note-id="${note.id}">
                <div class="pin"></div>
                <div class="note-text">${escapeHtml(note.content)}</div>
                <div class="note-meta">
                    <span class="note-author">${isPersonal ? '' : '👤 ' + escapeHtml(authorName)}</span>
                    <span class="note-date">${dateStr}</span>
                </div>
                <div style="position: absolute; bottom: 8px; right: 8px; display: flex; gap: 4px;">
                    ${isAuthor ? `
                        <button class="note-delete" onclick="confirmDeleteNote('${note.id}')" title="Удалить">🗑️</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Удаление заметки с подтверждением
function confirmDeleteNote(noteId) {
    showConfirm(
        '🗑️ Удаление заметки',
        'Вы уверены, что хотите удалить эту заметку?',
        async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/notes/${noteId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    showToast('Заметка удалена', 'success');
                    await loadNotes();
                } else {
                    showToast('Ошибка удаления', 'error');
                }
            } catch (error) {
                console.error('Delete note error:', error);
                showToast('Ошибка сервера', 'error');
            }
        }
    );
}

// Форматирование даты для заметок
function formatNoteDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    if (diff < 172800000) return 'Вчера';
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн назад`;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
// Используем formatNoteDate вместо formatDate для заметок
function formatDate(dateString) {
    return formatNoteDate(dateString);
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
        
        let events = [];
        
        if (response.ok) {
            const data = await response.json();
            events = data.events || [];
            console.log('📊 Raw events from API:', events.length);
        } else {
            console.warn('Failed to load calendar events, using empty');
        }
        
        // Очищаем calendarEvents
        calendarEvents = [];
        
        // 1. Добавляем задачи из currentTasks на ВСЕ ДНИ длительности
        if (currentTasks && currentTasks.length > 0) {
            currentTasks.forEach(task => {
                // Пропускаем завершённые
                if (task.status === 'completed' || task.status === 'cancelled') return;
                
                const startDate = task.start_date ? new Date(task.start_date) : null;
                const dueDate = task.due_date ? new Date(task.due_date) : null;
                
                // Если есть и start_date, и due_date — добавляем на все дни
                if (startDate && dueDate && startDate <= dueDate) {
                    // Проходим по каждому дню от start до due
                    const current = new Date(startDate);
                    while (current <= dueDate) {
                        const dateStr = formatDateLocal(current);
                        
                        // Добавляем задачу на этот день
                        calendarEvents.push({
                            id: `task_${task.id}_${dateStr}`,
                            title: task.title,
                            date: dateStr,
                            type: 'task',
                            status: task.status || 'pending',
                            priority: task.priority || 'medium',
                            taskId: task.id,
                            assignee: task.assignee_name || null,
                            start_date: task.start_date,
                            due_date: task.due_date
                        });
                        
                        // Если это день дедлайна — добавляем отдельную отметку
                        if (dateStr === formatDateLocal(dueDate)) {
                            calendarEvents.push({
                                id: `deadline_${task.id}`,
                                title: `⚡ ${task.title}`,
                                date: dateStr,
                                type: 'deadline',
                                status: task.status || 'pending',
                                priority: task.priority || 'medium',
                                taskId: task.id,
                                assignee: task.assignee_name || null
                            });
                        }
                        
                        current.setDate(current.getDate() + 1);
                    }
                } 
                // Если только due_date — добавляем только на эту дату
                else if (dueDate) {
                    const dateStr = formatDateLocal(dueDate);
                    calendarEvents.push({
                        id: `task_${task.id}_${dateStr}`,
                        title: task.title,
                        date: dateStr,
                        type: 'task',
                        status: task.status || 'pending',
                        priority: task.priority || 'medium',
                        taskId: task.id,
                        assignee: task.assignee_name || null,
                        start_date: task.start_date,
                        due_date: task.due_date
                    });
                    
                    calendarEvents.push({
                        id: `deadline_${task.id}`,
                        title: `⚡ ${task.title}`,
                        date: dateStr,
                        type: 'deadline',
                        status: task.status || 'pending',
                        priority: task.priority || 'medium',
                        taskId: task.id,
                        assignee: task.assignee_name || null
                    });
                }
                // Если только start_date — добавляем только на эту дату
                else if (startDate) {
                    const dateStr = formatDateLocal(startDate);
                    calendarEvents.push({
                        id: `task_${task.id}_${dateStr}`,
                        title: task.title,
                        date: dateStr,
                        type: 'task',
                        status: task.status || 'pending',
                        priority: task.priority || 'medium',
                        taskId: task.id,
                        assignee: task.assignee_name || null,
                        start_date: task.start_date,
                        due_date: task.due_date
                    });
                }
            });
        }
        
        // 2. Добавляем события из API (если они есть и не дублируются)
        events.forEach(event => {
            // Проверяем, нет ли уже такого события
            const exists = calendarEvents.some(e => 
                e.id === event.id && e.type === event.type
            );
            if (!exists && event.date) {
                calendarEvents.push({
                    id: event.id || `event_${Date.now()}_${Math.random()}`,
                    title: event.title || 'Событие',
                    date: event.date,
                    type: event.type || 'task',
                    status: event.status || 'pending',
                    priority: event.priority || 'medium',
                    assignee: event.assignee || null
                });
            }
        });
        
        console.log('✅ Calendar events processed:');
        console.log('  📋 Tasks:', calendarEvents.filter(e => e.type === 'task').length);
        console.log('  ⚡ Deadlines:', calendarEvents.filter(e => e.type === 'deadline').length);
        console.log('  📅 Total:', calendarEvents.length);
        
        // Отладка: сколько задач на каждую дату
        const tasksByDate = {};
        calendarEvents.filter(e => e.type === 'task').forEach(e => {
            if (e.date) {
                tasksByDate[e.date] = (tasksByDate[e.date] || 0) + 1;
            }
        });
        console.log('📋 Tasks distribution:', tasksByDate);
        
        // Обновляем календари
        renderMiniCalendar();
        renderFullscreenCalendar();
        renderGanttTasks();
        
    } catch (error) {
        console.error('Error loading calendar events:', error);
        calendarEvents = [];
        renderMiniCalendar();
        renderFullscreenCalendar();
    }
}
function renderCalendar(containerId, isFullscreen = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = formatDateLocal(today);
    
    // Получаем диапазон дат Ганта
    let ganttDates = [];
    try {
        ganttDates = getGanttDateRange();
    } catch(e) {
        console.warn('getGanttDateRange not available, skipping gantt range');
    }
    
    // Функция подсчёта задач на дату (активные, не завершённые)
    const getTasksCount = (dateStr) => {
        if (!calendarEvents || !Array.isArray(calendarEvents)) return 0;
        // Используем Set для уникальных ID задач
        const uniqueTaskIds = new Set();
        calendarEvents.forEach(event => {
            if (!event || !event.date) return;
            if (event.date === dateStr && 
                event.type === 'task' && 
                event.status !== 'completed' && 
                event.status !== 'cancelled') {
                // Используем taskId или id как уникальный идентификатор
                const taskId = event.taskId || event.id;
                if (taskId) uniqueTaskIds.add(taskId);
            }
        });
        return uniqueTaskIds.size;
    };

    // Функция подсчёта УНИКАЛЬНЫХ дедлайнов на дату
    const getDeadlinesCount = (dateStr) => {
        if (!calendarEvents || !Array.isArray(calendarEvents)) return 0;
        const uniqueTaskIds = new Set();
        calendarEvents.forEach(event => {
            if (!event || !event.date) return;
            if (event.date === dateStr && event.type === 'deadline') {
                const taskId = event.taskId || event.id;
                if (taskId) uniqueTaskIds.add(taskId);
            }
        });
        return uniqueTaskIds.size;
    };
        
    // Строим календарь
    let html = `
        <div class="calendar-header">
            <button class="cal-nav-btn" onclick="calendarPrevMonth()">◀</button>
            <div class="calendar-month-selector">
                <select id="monthSelect" onchange="calendarChangeMonth()">
                    ${getMonthOptions(month)}
                </select>
                <select id="yearSelect" onchange="calendarChangeYear()">
                    ${getYearOptions(year)}
                </select>
            </div>
            <button class="cal-nav-btn" onclick="calendarNextMonth()">▶</button>
            ${isFullscreen ? `<button class="today-btn" onclick="calendarToday()">Сегодня</button>` : ''}
        </div>
        <div class="calendar-weekdays">
            <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
        </div>
        <div class="calendar-days-grid">
    `;
    
    let startOffset = startDay === 0 ? 6 : startDay - 1;
    
    // Дни предыдущего месяца
    for (let i = startOffset - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
    }
    
    // Дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const inGanttRange = ganttDates.includes(dateStr);
        const tasksCount = getTasksCount(dateStr);
        const deadlinesCount = getDeadlinesCount(dateStr);
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (inGanttRange) classes += ' gantt-range';
        
        html += `
            <div class="${classes}" onclick="openDateModal(${year}, ${month + 1}, ${day})">
                <span class="day-number">${day}</span>
                <div class="day-indicators">
                    ${tasksCount > 0 ? `<span class="indicator tasks">${tasksCount}</span>` : ''}
                    ${deadlinesCount > 0 ? `<span class="indicator deadlines">${deadlinesCount}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    // Дни следующего месяца
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const nextMonthDays = totalCells - (startOffset + daysInMonth);
    for (let day = 1; day <= nextMonthDays; day++) {
        html += `<div class="calendar-day other-month"><span class="day-number">${day}</span></div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}
// - renderMiniCalendar()
// Рендер мини-календаря
function renderMiniCalendar() {
    renderCalendar('miniCalendar', false);
}

function getGanttDateRange() {
    const dates = [];
    
    if (currentZoom === 'day') {
        // Режим ДЕНЬ: одна конкретная дата
        // Используем toISOString() с учётом локального времени
        const year = currentGanttDate.getFullYear();
        const month = String(currentGanttDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentGanttDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        dates.push(dateStr);
        console.log('📅 Gantt day range (fixed):', dates);
    } else if (currentZoom === 'week') {
        // Режим НЕДЕЛЯ: 7 дней (с понедельника по воскресенье)
        const weekStart = new Date(currentGanttDate);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const date = String(day.getDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${date}`);
        }
        console.log('📅 Gantt week range:', dates);
    } else if (currentZoom === 'month') {
        // Режим МЕСЯЦ: все дни текущего месяца
        if (!ganttStartDate) {
            const now = new Date();
            ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            ganttEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        const year = ganttStartDate.getFullYear();
        const month = ganttStartDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            dates.push(dateStr);
        }
        console.log('📅 Gantt month range:', dates.length, 'days');
    }
    
    return dates;
}
// - renderFullscreenCalendar()
// Рендер полноэкранного календаря
function renderFullscreenCalendar() {
    renderCalendar('fullscreenCalendar', true);
}
// - renderFullscreenTasks()
// Рендер задач в полноэкранном режиме
function renderFullscreenTasks() {
    const container = document.getElementById('fullscreenTasksList');
    if (!container) return;
    
    if (!currentTasks || currentTasks.length === 0) {
        container.innerHTML = '<div class="empty-tasks">Нет задач</div>';
        return;
    }
    
    const filterPeriod = document.getElementById('filterGanttPeriod')?.checked !== false;
    
    let filteredTasks = currentTasks.filter(t => t.status !== 'completed');
    
    if (filterPeriod) {
        // Получаем диапазон дат Ганта
        const ganttDates = getGanttDateRange();
        
        // Задача попадает в период, если она пересекается с любым днём из диапазона
        filteredTasks = filteredTasks.filter(task => {
            if (!task.start_date && !task.due_date) return false;
            
            const taskStart = task.start_date ? new Date(task.start_date) : new Date(task.due_date);
            const taskEnd = task.due_date ? new Date(task.due_date) : new Date(task.start_date);
            
            // Проверяем пересечение с любым днём из диапазона
            for (const dateStr of ganttDates) {
                const checkDate = new Date(dateStr);
                if (checkDate >= taskStart && checkDate <= taskEnd) {
                    return true;
                }
            }
            return false;
        });
    }
    
    if (filteredTasks.length === 0) {
        container.innerHTML = '<div class="empty-tasks">Нет задач' + (filterPeriod ? ' на выбранный период' : '') + '</div>';
        return;
    }
    
    container.innerHTML = filteredTasks.map(task => {
        const getPriorityLabel = (priority) => {
            const labels = {
                'critical': 'Критический',
                'high': 'Высокий',
                'medium': 'Средний',
                'low': 'Низкий'
            };
            return labels[priority] || 'Средний';
        };
        
        const getPriorityClass = (priority) => {
            const classes = {
                'critical': 'priority-critical',
                'high': 'priority-high',
                'medium': 'priority-medium',
                'low': 'priority-low'
            };
            return classes[priority] || 'priority-medium';
        };
        
        // Статус дедлайна
        let dueStatus = '';
        if (task.due_date) {
            const daysLeft = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) dueStatus = '⚠️ Просрочена';
            else if (daysLeft <= 3) dueStatus = `⏰ ${daysLeft} дн.`;
            else dueStatus = `📅 ${daysLeft} дн.`;
        }
        
        // Период задачи
        let period = '';
        if (task.start_date && task.due_date) {
            period = `${task.start_date.slice(5)} — ${task.due_date.slice(5)}`;
        } else if (task.due_date) {
            period = `до ${task.due_date.slice(5)}`;
        } else if (task.start_date) {
            period = `с ${task.start_date.slice(5)}`;
        }
        
        return `
            <div class="task-item" onclick="openTaskView(${task.id})">
                <input type="checkbox" class="task-checkbox" 
                       ${task.status === 'completed' ? 'checked' : ''}
                       onclick="event.stopPropagation(); toggleTaskStatus(${task.id}, event)">
                <div class="task-info">
                    <span class="task-name">${escapeHtml(task.title)}</span>
                    <span class="task-date">${period || dueStatus || '—'}</span>
                </div>
                <span class="task-priority ${getPriorityClass(task.priority)}">
                    ${getPriorityLabel(task.priority)}
                </span>
            </div>
        `;
    }).join('');
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
// =====================================================
// 5.8 РЕНДЕР ГАНТА (СТИЛЬ YOUGILE)
// =====================================================

// =====================================================
// РЕНДЕР ГАНТА - ФИНАЛЬНАЯ ВЕРСИЯ
// Ось X = ДАТА, Ось Y = ВРЕМЯ
// =====================================================

function renderGanttChart(tasks) {
    const barsContainer = document.getElementById('ganttBarsContainer');
    const axisHeader = document.getElementById('ganttDatesHeader');
    const tasksContainer = document.getElementById('ganttTasksList');
    
    if (!barsContainer) return;
    
    // Скрываем список задач
    if (tasksContainer) tasksContainer.style.display = 'none';
    
    // СБРАСЫВАЕМ ВЫСОТУ перед рендером
    barsContainer.style.height = 'auto';
    barsContainer.style.minHeight = 'auto';
    barsContainer.style.maxHeight = 'none';
    barsContainer.style.overflow = 'visible';
    
    if (!tasks || tasks.length === 0) {
        barsContainer.innerHTML = '<div class="empty-gantt">Нет задач для отображения</div>';
        barsContainer.style.width = '100%';
        if (axisHeader) axisHeader.innerHTML = '';
        return;
    }
    
    switch(currentZoom) {
        case 'day':
            renderDayView(tasks, barsContainer, axisHeader);
            break;
        case 'week':
            renderWeekView(tasks, barsContainer, axisHeader);
            break;
        case 'month':
            renderMonthView(tasks, barsContainer, axisHeader);
            break;
    }
}

// ==================== РЕЖИМ "ДЕНЬ" ====================
function renderDayView(tasks, barsContainer, axisHeader) {
    const selectedDate = currentGanttDate;
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayTasks = tasks.filter(task => {
        const taskStart = new Date(task.start);
        const taskEnd = new Date(task.end);
        return taskStart <= dayEnd && taskEnd >= dayStart;
    });
    
    // ОЧИЩАЕМ оба контейнера
    if (axisHeader) axisHeader.innerHTML = '';
    barsContainer.innerHTML = '';
    
    // Вычисляем общую высоту (24 часа + заголовок)
    const totalHoursHeight = 24 * ganttHourHeight;
    const headerHeight = 44;
    const totalHeight = totalHoursHeight + headerHeight;
    
    // Создаём единый контейнер
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display: flex;
        flex-direction: row;
        width: 100%;
        height: ${totalHeight}px;
        background: var(--c_surf);
        border-radius: 8px;
        border: 1px solid var(--c_surf_txt);
        position: relative;
        overflow: hidden;
    `;
    
    // 1. ОСЬ ВРЕМЕНИ (СЛЕВА)
    const axisWrapper = document.createElement('div');
    axisWrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        width: 80px;
        flex-shrink: 0;
        background: var(--c_bg);
        border-right: 2px solid var(--c_surf_txt);
        height: 100%;
        overflow: hidden;
        position: sticky;
        left: 0;
        z-index: 5;
    `;
    
    // Заголовок оси
    const axisTitle = document.createElement('div');
    axisTitle.style.cssText = `
        padding: 8px 12px;
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        background: var(--c_acchalf);
        border-bottom: 1px solid var(--c_surf_txt);
        height: ${headerHeight}px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    `;
    axisTitle.textContent = 'Время';
    axisWrapper.appendChild(axisTitle);
    
    // Часы — контейнер без ограничений
    const timeLabels = document.createElement('div');
    timeLabels.style.cssText = `
        display: flex;
        flex-direction: column;
        height: ${totalHoursHeight}px;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
    `;
    
    for (let hour = 0; hour < 24; hour++) {
        const cell = document.createElement('div');
        cell.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 500;
            color: var(--c_surf_txt);
            border-bottom: 1px solid rgba(0,0,0,0.05);
            background: var(--c_bg);
            height: ${ganttHourHeight}px;
            min-height: ${ganttHourHeight}px;
            box-sizing: border-box;
            flex-shrink: 0;
        `;
        cell.textContent = `${hour.toString().padStart(2, '0')}:00`;
        timeLabels.appendChild(cell);
    }
    axisWrapper.appendChild(timeLabels);
    wrapper.appendChild(axisWrapper);
    
    // 2. ОБЛАСТЬ ЗАДАЧ (СПРАВА)
    const tasksArea = document.createElement('div');
    tasksArea.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--c_surf);
        height: 100%;
        overflow: hidden;
        position: relative;
    `;
    
    // Заголовок с датой
    const dateHeader = document.createElement('div');
    dateHeader.style.cssText = `
        padding: 8px 16px;
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        background: var(--c_acchalf);
        border-bottom: 1px solid var(--c_surf_txt);
        height: ${headerHeight}px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    `;
    dateHeader.textContent = selectedDate.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    tasksArea.appendChild(dateHeader);
    
    // Контейнер для колонок задач — полная высота без ограничений
    const columnsContainer = document.createElement('div');
    columnsContainer.style.cssText = `
        display: flex;
        flex-direction: row;
        gap: 8px;
        padding: 0 8px;
        height: ${totalHoursHeight}px;
        background: var(--c_surf);
        align-items: flex-start;
        position: relative;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
    `;
    
    if (dayTasks.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            color: var(--c_surf_txt);
            font-size: 14px;
        `;
        emptyMsg.textContent = 'Нет задач на этот день';
        columnsContainer.appendChild(emptyMsg);
    } else {
        // Вычисляем ширину колонки
        const containerWidth = columnsContainer.clientWidth || 800;
        const columnWidth = Math.max(180, (containerWidth - (dayTasks.length - 1) * 8 - 16) / dayTasks.length);
        
        for (let i = 0; i < dayTasks.length; i++) {
            const task = dayTasks[i];
            const taskStart = new Date(task.start);
            const taskEnd = new Date(task.end);
            
            let startHour = taskStart.getHours() + taskStart.getMinutes() / 60;
            let endHour = taskEnd.getHours() + taskEnd.getMinutes() / 60;
            
            if (taskStart < dayStart) startHour = 0;
            if (taskEnd > dayEnd) endHour = 24;
            
            const topPx = startHour * ganttHourHeight;
            const heightPx = (endHour - startHour) * ganttHourHeight;
            
            if (heightPx <= 2) continue;
            
            const hasDeadline = task.due_date === dateStr;
            const deadlineHour = hasDeadline ? taskEnd.getHours() + taskEnd.getMinutes() / 60 : null;
            const deadlineTop = deadlineHour ? deadlineHour * ganttHourHeight : null;
            
            // Колонка задачи
            const column = document.createElement('div');
            column.style.cssText = `
                position: relative;
                width: ${columnWidth}px;
                flex-shrink: 0;
                height: 100%;
                background: var(--c_surf);
                border-radius: 6px;
                border: 1px solid var(--c_surf_txt);
                overflow: visible;
            `;
            
            // Имя задачи вверху колонки (поверх)
            const colHeader = document.createElement('div');
            colHeader.style.cssText = `
                position: absolute;
                top: -${headerHeight}px;
                left: 0;
                right: 0;
                padding: 8px 8px;
                font-size: 11px;
                font-weight: 600;
                color: var(--c_bg_txt);
                background: var(--c_acchalf);
                border-bottom: 1px solid var(--c_surf_txt);
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                cursor: pointer;
                height: ${headerHeight}px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-sizing: border-box;
            `;
            colHeader.textContent = task.name;
            colHeader.onclick = () => openTaskView(task.id);
            column.appendChild(colHeader);
            
            // Тело колонки (сетка времени) — полная высота
            const colBody = document.createElement('div');
            colBody.style.cssText = `
                position: relative;
                height: ${totalHoursHeight}px;
                width: 100%;
                background: var(--c_surf);
                overflow: hidden;
            `;
            
            // Сетка (тонкие линии)
            for (let h = 0; h <= 24; h++) {
                const line = document.createElement('div');
                line.style.cssText = `
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: ${h * ganttHourHeight}px;
                    height: 1px;
                    background: rgba(0,0,0,0.05);
                `;
                // Подсветка текущего часа
                if (h === new Date().getHours() && selectedDate.toDateString() === new Date().toDateString()) {
                    line.style.background = 'rgba(81,148,255,0.2)';
                    line.style.height = '2px';
                }
                colBody.appendChild(line);
            }
            
            // Полоса задачи
            const bar = document.createElement('div');
            bar.className = `gantt-bar-vertical ${task.priority || 'medium'}`;
            bar.style.cssText = `
                position: absolute;
                left: 4px;
                top: ${topPx}px;
                width: calc(100% - 8px);
                height: ${heightPx}px;
                min-height: 20px;
                border-radius: 6px;
                cursor: pointer;
                background-color: ${getPriorityColor(task.priority)};
                display: flex;
                flex-direction: column;
                padding: 4px 6px;
                overflow: hidden;
                font-size: 9px;
                color: white;
                box-sizing: border-box;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: all 0.2s ease;
                justify-content: center;
            `;
            bar.innerHTML = `
                <div style="font-weight: 600; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${task.name}</div>
                <div style="font-size: 8px; opacity: 0.8;">${formatTime(taskStart)} - ${formatTime(taskEnd)}</div>
                ${task.progress > 0 ? `<div style="font-size: 8px; opacity: 0.7; margin-top: 2px;">📊 ${task.progress}%</div>` : ''}
            `;
            bar.onclick = () => openTaskView(task.id);
            
            bar.addEventListener('mouseenter', function() {
                this.style.transform = 'scaleX(1.03)';
                this.style.zIndex = '10';
                this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
            });
            bar.addEventListener('mouseleave', function() {
                this.style.transform = 'scaleX(1)';
                this.style.zIndex = '1';
                this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            });
            
            colBody.appendChild(bar);
            
            // Отметка дедлайна
            if (hasDeadline && deadlineTop !== null) {
                const deadlineMark = document.createElement('div');
                deadlineMark.className = 'gantt-deadline-mark';
                deadlineMark.style.cssText = `
                    position: absolute;
                    left: 4px;
                    top: ${deadlineTop}px;
                    width: calc(100% - 8px);
                    height: 2px;
                    background: #ef4444;
                    z-index: 20;
                    box-shadow: 0 0 8px rgba(239,68,68,0.5);
                    pointer-events: none;
                `;
                deadlineMark.title = `Дедлайн: ${formatTime(taskEnd)}`;
                colBody.appendChild(deadlineMark);
                
                // Метка с временем дедлайна
                const label = document.createElement('div');
                label.style.cssText = `
                    position: absolute;
                    right: 6px;
                    top: ${deadlineTop - 16}px;
                    font-size: 8px;
                    color: #ef4444;
                    font-weight: 700;
                    z-index: 21;
                    pointer-events: none;
                    background: rgba(255,255,255,0.95);
                    padding: 1px 6px;
                    border-radius: 4px;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
                `;
                label.textContent = `⚡ ${formatTime(taskEnd)}`;
                colBody.appendChild(label);
            }
            
            column.appendChild(colBody);
            columnsContainer.appendChild(column);
        }
    }
    
    tasksArea.appendChild(columnsContainer);
    wrapper.appendChild(tasksArea);
    
    // Вставляем всё в barsContainer
    barsContainer.appendChild(wrapper);
    barsContainer.style.width = '100%';
    barsContainer.style.height = 'auto';
    barsContainer.style.padding = '0';
    barsContainer.style.overflow = 'visible';
    barsContainer.style.background = 'transparent';
    barsContainer.style.minHeight = totalHeight + 'px';
}
function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// ==================== РЕЖИМ "НЕДЕЛЯ" ====================
function renderWeekView(tasks, barsContainer, axisHeader) {
    const weekStart = new Date(currentGanttDate);
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
    weekStart.setHours(0, 0, 0, 0);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        days.push(day);
    }
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekTasks = tasks.filter(task => {
        const taskStart = new Date(task.start);
        const taskEnd = new Date(task.end);
        return taskStart <= weekEnd && taskEnd >= weekStart;
    });
    
    // ОЧИЩАЕМ
    if (axisHeader) axisHeader.innerHTML = '';
    barsContainer.innerHTML = '';
    
    // Получаем ширину контейнера (используем родительский элемент)
    const parentWidth = barsContainer.parentElement?.clientWidth || 800;
    const dayWidth = Math.max(80, parentWidth / 7);
    const rowHeight = 44;
    const tasksHeight = Math.max(weekTasks.length * rowHeight, 60);
    const totalHeight = tasksHeight + 44; // +44 для заголовка
    
    // Контейнер
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        width: 100%;
        height: ${totalHeight}px;
        background: var(--c_surf);
        border-radius: 8px;
        border: 1px solid var(--c_surf_txt);
        overflow: hidden;
        min-height: 80px;
    `;
    
    // 1. ОСЬ X (дни недели) — растягиваем на всю ширину
    const axisWrapper = document.createElement('div');
    axisWrapper.style.cssText = `
        display: flex;
        flex-direction: row;
        width: 100%;
        flex-shrink: 0;
        background: var(--c_acchalf);
        border-bottom: 1px solid var(--c_surf_txt);
        height: 44px;
    `;
    
    // Вычисляем ширину для каждого дня
    const dayWidthPx = (axisWrapper.clientWidth || parentWidth) / 7;
    
    for (let d = 0; d < 7; d++) {
        const dayCell = document.createElement('div');
        dayCell.style.cssText = `
            flex: 1;
            min-width: ${dayWidthPx}px;
            padding: 10px 4px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            border-right: 1px solid var(--c_surf_txt);
            background: var(--c_acchalf);
            color: var(--c_bg_txt);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            box-sizing: border-box;
        `;
        dayCell.textContent = days[d].toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
        axisWrapper.appendChild(dayCell);
    }
    wrapper.appendChild(axisWrapper);
    
    if (weekTasks.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            color: var(--c_surf_txt);
            font-size: 14px;
            width: 100%;
            height: 100%;
        `;
        emptyMsg.textContent = 'Нет задач на эту неделю';
        wrapper.appendChild(emptyMsg);
    } else {
        // Контейнер с задачами — занимает всю ширину
        const tasksContainer = document.createElement('div');
        tasksContainer.style.cssText = `
            flex: 1;
            position: relative;
            background: var(--c_surf);
            overflow-y: auto;
            overflow-x: hidden;
            width: 100%;
            height: ${tasksHeight}px;
        `;
        
        // Пересчитываем ширину для баров (используем ширину контейнера задач)
        const containerWidth = tasksContainer.clientWidth || parentWidth;
        const barDayWidth = containerWidth / 7;
        
        for (let i = 0; i < weekTasks.length; i++) {
            const task = weekTasks[i];
            const taskStart = new Date(task.start);
            const taskEnd = new Date(task.end);
            
            // Определяем, в какие дни попадает задача
            const taskDays = [];
            for (let d = 0; d < 7; d++) {
                const dayStart = new Date(days[d]);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(days[d]);
                dayEnd.setHours(23, 59, 59, 999);
                
                if (taskStart <= dayEnd && taskEnd >= dayStart) {
                    taskDays.push(d);
                }
            }
            
            if (taskDays.length > 0) {
                const firstDay = taskDays[0];
                const lastDay = taskDays[taskDays.length - 1];
                
                const leftPx = firstDay * barDayWidth;
                const widthPx = (lastDay - firstDay + 1) * barDayWidth - 4;
                
                const bar = document.createElement('div');
                bar.className = `gantt-bar-horizontal ${task.priority || 'medium'}`;
                bar.style.cssText = `
                    position: absolute;
                    left: ${leftPx + 2}px;
                    top: ${i * rowHeight + 4}px;
                    width: ${widthPx}px;
                    height: ${rowHeight - 8}px;
                    border-radius: 6px;
                    cursor: pointer;
                    background-color: ${getPriorityColor(task.priority)};
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    overflow: hidden;
                    font-size: 11px;
                    color: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
                    box-sizing: border-box;
                    white-space: nowrap;
                `;
                bar.textContent = task.name;
                bar.onclick = () => openTaskView(task.id);
                
                // Прогресс
                if (task.progress > 0) {
                    const progressFill = document.createElement('div');
                    progressFill.style.cssText = `
                        position: absolute;
                        left: 0;
                        top: 0;
                        height: 100%;
                        width: ${Math.min(task.progress, 100)}%;
                        background: rgba(255,255,255,0.25);
                        border-radius: 6px;
                        pointer-events: none;
                    `;
                    bar.appendChild(progressFill);
                }
                
                tasksContainer.appendChild(bar);
            }
        }
        wrapper.appendChild(tasksContainer);
    }
    
    barsContainer.appendChild(wrapper);
    barsContainer.style.width = '100%';
    barsContainer.style.height = 'auto';
    barsContainer.style.padding = '0';
    barsContainer.style.overflow = 'visible';
    barsContainer.style.background = 'transparent';
}
// ==================== РЕЖИМ "МЕСЯЦ" ====================
function renderMonthView(tasks, barsContainer, axisHeader) {
    if (!ganttStartDate || !ganttEndDate) {
        const now = new Date();
        ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        ganttEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    const year = ganttStartDate.getFullYear();
    const month = ganttStartDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    const monthTasks = tasks.filter(task => {
        const taskStart = new Date(task.start);
        const taskEnd = new Date(task.end);
        return taskStart <= monthEnd && taskEnd >= monthStart;
    });
    
    // ОЧИЩАЕМ
    if (axisHeader) axisHeader.innerHTML = '';
    barsContainer.innerHTML = '';
    
    // Получаем ширину контейнера
    const parentWidth = barsContainer.parentElement?.clientWidth || 800;
    const dayWidth = Math.max(35, parentWidth / daysInMonth);
    const rowHeight = 44;
    const tasksHeight = Math.max(monthTasks.length * rowHeight, 60);
    const totalHeight = tasksHeight + 44;
    
    // Контейнер
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        width: 100%;
        height: ${totalHeight}px;
        background: var(--c_surf);
        border-radius: 8px;
        border: 1px solid var(--c_surf_txt);
        overflow: hidden;
        min-height: 80px;
    `;
    
    // 1. ОСЬ X (дни месяца)
    const axisWrapper = document.createElement('div');
    axisWrapper.style.cssText = `
        display: flex;
        flex-direction: row;
        width: 100%;
        flex-shrink: 0;
        background: var(--c_acchalf);
        border-bottom: 1px solid var(--c_surf_txt);
        height: 44px;
        overflow-x: auto;
    `;
    
    const dayWidthPx = (axisWrapper.clientWidth || parentWidth) / daysInMonth;
    
    for (let i = 0; i < daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.style.cssText = `
            flex: 1;
            min-width: ${Math.max(35, dayWidthPx)}px;
            padding: 10px 2px;
            text-align: center;
            font-size: 11px;
            font-weight: 500;
            border-right: 1px solid var(--c_surf_txt);
            background: var(--c_acchalf);
            color: var(--c_bg_txt);
            flex-shrink: 0;
            box-sizing: border-box;
        `;
        dayCell.textContent = i + 1;
        axisWrapper.appendChild(dayCell);
    }
    wrapper.appendChild(axisWrapper);
    
    if (monthTasks.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            color: var(--c_surf_txt);
            font-size: 14px;
            width: 100%;
            height: 100%;
        `;
        emptyMsg.textContent = 'Нет задач на этот месяц';
        wrapper.appendChild(emptyMsg);
    } else {
        // Контейнер с задачами
        const tasksContainer = document.createElement('div');
        tasksContainer.style.cssText = `
            flex: 1;
            position: relative;
            background: var(--c_surf);
            overflow-y: auto;
            overflow-x: auto;
            width: 100%;
            height: ${tasksHeight}px;
        `;
        
        // Пересчитываем ширину для баров
        const containerWidth = tasksContainer.clientWidth || parentWidth;
        const barDayWidth = containerWidth / daysInMonth;
        
        // Устанавливаем минимальную ширину для горизонтального скролла
        tasksContainer.style.minWidth = (daysInMonth * Math.max(35, barDayWidth)) + 'px';
        
        for (let i = 0; i < monthTasks.length; i++) {
            const task = monthTasks[i];
            const taskStart = new Date(task.start);
            const taskEnd = new Date(task.end);
            
            const startDay = Math.max(1, taskStart.getDate());
            const endDay = Math.min(daysInMonth, taskEnd.getDate());
            
            const leftPx = (startDay - 1) * barDayWidth;
            const widthPx = (endDay - startDay + 1) * barDayWidth - 4;
            
            if (widthPx <= 2) continue;
            
            const bar = document.createElement('div');
            bar.className = `gantt-bar-horizontal ${task.priority || 'medium'}`;
            bar.style.cssText = `
                position: absolute;
                left: ${leftPx + 2}px;
                top: ${i * rowHeight + 4}px;
                width: ${widthPx}px;
                height: ${rowHeight - 8}px;
                border-radius: 6px;
                cursor: pointer;
                background-color: ${getPriorityColor(task.priority)};
                display: flex;
                align-items: center;
                padding: 0 8px;
                overflow: hidden;
                font-size: 10px;
                color: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.08);
                box-sizing: border-box;
                white-space: nowrap;
            `;
            bar.textContent = widthPx > 30 ? task.name : '';
            bar.onclick = () => openTaskView(task.id);
            
            if (task.progress > 0) {
                const progressFill = document.createElement('div');
                progressFill.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: 0;
                    height: 100%;
                    width: ${Math.min(task.progress, 100)}%;
                    background: rgba(255,255,255,0.25);
                    border-radius: 6px;
                    pointer-events: none;
                `;
                bar.appendChild(progressFill);
            }
            
            tasksContainer.appendChild(bar);
        }
        wrapper.appendChild(tasksContainer);
    }
    
    barsContainer.appendChild(wrapper);
    barsContainer.style.width = '100%';
    barsContainer.style.height = 'auto';
    barsContainer.style.padding = '0';
    barsContainer.style.overflow = 'visible';
    barsContainer.style.background = 'transparent';
}

// Вспомогательные функции
function getPriorityColor(priority) {
    switch(priority) {
        case 'critical': return '#ef4444';
        case 'high': return '#f59e0b';
        case 'medium': return '#10b981';
        default: return '#3b82f6';
    }
}

function getPriorityLabel(priority) {
    switch(priority) {
        case 'critical': return 'Критический';
        case 'high': return 'Высокий';
        case 'medium': return 'Средний';
        default: return 'Низкий';
    }
}
function renderGanttDateHeader(minDate, maxDate) {
    const container = document.getElementById('ganttDatesHeader');
    if (!container) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = current.toDateString() === today.toDateString();
        
        days.push({
            date: new Date(current),
            day: current.getDate(),
            month: current.getMonth() + 1,
            dayOfWeek: dayOfWeek,
            isWeekend: isWeekend,
            isToday: isToday
        });
        current.setDate(current.getDate() + 1);
    }
    
    container.innerHTML = days.map(day => `
        <div class="gantt-date-header-cell ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today' : ''}">
            ${day.day}<br>
            <span style="font-size: 9px; opacity: 0.7;">${getMonthShort(day.month)}</span>
        </div>
    `).join('');
}

function renderGanttTasksAndBars(tasks, minDate, maxDate) {
    const tasksContainer = document.getElementById('ganttTasksList');
    const barsContainer = document.getElementById('ganttBarsContainer');
    
    if (!tasksContainer || !barsContainer) return;
    
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    const totalWidth = totalDays * ganttDayWidth;
    
    // Рендер списка задач
    tasksContainer.innerHTML = tasks.map(task => {
        const assignee = task.assignee_name ? `${task.assignee_surname || ''} ${task.assignee_name || ''}`.trim() : 'Не назначен';
        const progress = task.progress || 0;
        const priorityClass = task.priority || 'medium';
        
        return `
            <div class="gantt-task-row" onclick="openTaskView(${task.id})">
                <div class="gantt-task-info">
                    <div class="gantt-task-title">${escapeHtml(task.name)}</div>
                    <div class="gantt-task-meta">
                        <span class="gantt-task-assignee">
                            👤 ${escapeHtml(assignee)}
                        </span>
                    </div>
                </div>
                <div class="gantt-task-progress">${progress}%</div>
            </div>
        `;
    }).join('');
    
    // Рендер баров
    barsContainer.innerHTML = '';
    barsContainer.style.width = totalWidth + 'px';
    barsContainer.style.position = 'relative';
    
    const minDateTime = minDate.getTime();
    
    for (const task of tasks) {
        const taskStart = new Date(task.start);
        const taskEnd = new Date(task.end);
        
        // Вычисляем смещение
        let offsetDays = Math.ceil((taskStart - minDateTime) / (1000 * 60 * 60 * 24));
        if (offsetDays < 0) offsetDays = 0;
        const offsetPx = offsetDays * ganttDayWidth;
        
        // Вычисляем длительность
        let durationDays = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;
        if (durationDays < 1) durationDays = 1;
        const widthPx = durationDays * ganttDayWidth;
        
        const progress = task.progress || 0;
        const priorityClass = task.priority || 'medium';
        const isCompleted = task.status === 'completed';
        
        const barRow = document.createElement('div');
        barRow.className = 'gantt-bar-row';
        barRow.style.height = '52px';
        barRow.style.position = 'relative';
        
        const bar = document.createElement('div');
        bar.className = `gantt-bar ${priorityClass} ${isCompleted ? 'completed' : ''}`;
        bar.style.position = 'absolute';
        bar.style.left = offsetPx + 'px';
        bar.style.width = widthPx + 'px';
        bar.style.height = '36px';
        bar.style.top = '8px';
        bar.style.borderRadius = '6px';
        bar.style.cursor = 'pointer';
        bar.style.display = 'flex';
        bar.style.alignItems = 'center';
        bar.style.padding = '0 8px';
        bar.style.overflow = 'hidden';
        
        bar.innerHTML = `
            <span class="gantt-bar-label" style="font-size: 11px; color: white; white-space: nowrap;">${escapeHtml(task.name)}</span>
            ${progress > 0 ? `<span class="gantt-bar-progress">${progress}%</span>` : ''}
        `;
        
        // Tooltip при наведении
        bar.addEventListener('mouseenter', (e) => showGanttTooltip(e, task));
        bar.addEventListener('mouseleave', hideGanttTooltip);
        bar.onclick = () => openTaskView(task.id);
        
        barRow.appendChild(bar);
        barsContainer.appendChild(barRow);
    }
}

// Tooltip
let ganttTooltip = null;

function showGanttTooltip(event, task) {
    hideGanttTooltip();
    
    ganttTooltip = document.createElement('div');
    ganttTooltip.className = 'gantt-tooltip';
    ganttTooltip.innerHTML = `
        <div class="tooltip-title">${escapeHtml(task.name)}</div>
        <div class="tooltip-row"><span>📅 Начало:</span><span>${formatDate(task.start)}</span></div>
        <div class="tooltip-row"><span>⏰ Окончание:</span><span>${formatDate(task.end)}</span></div>
        <div class="tooltip-row"><span>📊 Прогресс:</span><span>${task.progress || 0}%</span></div>
        <div class="tooltip-row"><span>🎯 Приоритет:</span><span>${getPriorityLabel(task.priority)}</span></div>
        <div class="tooltip-row"><span>👤 Исполнитель:</span><span>${task.assignee_name ? escapeHtml(task.assignee_name) : 'Не назначен'}</span></div>
    `;
    
    document.body.appendChild(ganttTooltip);
    
    const rect = event.target.getBoundingClientRect();
    ganttTooltip.style.left = rect.right + 10 + 'px';
    ganttTooltip.style.top = rect.top + 'px';
}

function hideGanttTooltip() {
    if (ganttTooltip) {
        ganttTooltip.remove();
        ganttTooltip = null;
    }
}

function getMonthShort(month) {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return months[month - 1] || '';
}

function getPriorityLabel(priority) {
    const labels = {
        'critical': 'Критический',
        'high': 'Высокий',
        'medium': 'Средний',
        'low': 'Низкий'
    };
    return labels[priority] || 'Средний';
}

// Инициализация кнопок Ганта
function initGanttControls() {
    const prevBtn = document.getElementById('ganttPrevBtn');
    const nextBtn = document.getElementById('ganttNextBtn');
    const todayBtn = document.getElementById('ganttTodayBtn');
    const exportBtn = document.getElementById('ganttExportBtn');
    const zoomBtns = document.querySelectorAll('.zoom-btn');
    
    // --- КНОПКА НАЗАД ---
    if (prevBtn) {
        const newPrev = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        newPrev.onclick = () => {
            if (currentZoom === 'day') {
                currentGanttDate.setDate(currentGanttDate.getDate() - 1);
            } else if (currentZoom === 'week') {
                currentGanttDate.setDate(currentGanttDate.getDate() - 7);
            } else {
                ganttStartDate.setMonth(ganttStartDate.getMonth() - 1);
                ganttEndDate = new Date(ganttStartDate.getFullYear(), ganttStartDate.getMonth() + 1, 0);
                currentGanttDate = new Date(ganttStartDate);
            }
            renderGantt();
            renderFullscreenTasks();
            renderMiniCalendar();        // ← ОБНОВЛЯЕМ МИНИ-КАЛЕНДАРЬ
            renderFullscreenCalendar();  // ← ОБНОВЛЯЕМ ПОЛНОЭКРАННЫЙ КАЛЕНДАРЬ
            updateMonthYearDisplay();
        };
    }
    
    // --- КНОПКА ВПЕРЁД ---
    if (nextBtn) {
        const newNext = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);
        newNext.onclick = () => {
            if (currentZoom === 'day') {
                currentGanttDate.setDate(currentGanttDate.getDate() + 1);
            } else if (currentZoom === 'week') {
                currentGanttDate.setDate(currentGanttDate.getDate() + 7);
            } else {
                ganttStartDate.setMonth(ganttStartDate.getMonth() + 1);
                ganttEndDate = new Date(ganttStartDate.getFullYear(), ganttStartDate.getMonth() + 1, 0);
                currentGanttDate = new Date(ganttStartDate);
            }
            renderGantt();
            renderFullscreenTasks();
            renderMiniCalendar();        // ← ОБНОВЛЯЕМ МИНИ-КАЛЕНДАРЬ
            renderFullscreenCalendar();  // ← ОБНОВЛЯЕМ ПОЛНОЭКРАННЫЙ КАЛЕНДАРЬ
            updateMonthYearDisplay();
        };
    }
    
    // --- КНОПКА СЕГОДНЯ ---
    if (todayBtn) {
        const newToday = todayBtn.cloneNode(true);
        todayBtn.parentNode.replaceChild(newToday, todayBtn);
        newToday.onclick = () => {
            const now = new Date();
            currentGanttDate = new Date(now);
            ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            ganttEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            currentCalendarDate = new Date(now);
            renderGantt();
            renderFullscreenTasks();
            renderMiniCalendar();        // ← ОБНОВЛЯЕМ МИНИ-КАЛЕНДАРЬ
            renderFullscreenCalendar();  // ← ОБНОВЛЯЕМ ПОЛНОЭКРАННЫЙ КАЛЕНДАРЬ
            updateMonthYearDisplay();
        };
    }
    
    // --- КНОПКИ ЗУМА ---
    zoomBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => {
            document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
            newBtn.classList.add('active');
            
            currentZoom = newBtn.dataset.zoom;
            
            // При переключении на месяц устанавливаем даты
            if (currentZoom === 'month' && !ganttStartDate) {
                const now = new Date();
                ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                ganttEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                currentGanttDate = new Date(ganttStartDate);
            }
            
            switch(currentZoom) {
                case 'day': ganttCellWidth = 80; break;
                case 'week': ganttCellWidth = 40; break;
                case 'month': ganttCellWidth = 30; break;
                default: ganttCellWidth = 40;
            }
            renderGantt();
            renderFullscreenTasks();
            renderMiniCalendar();        // ← ОБНОВЛЯЕМ МИНИ-КАЛЕНДАРЬ
            renderFullscreenCalendar();  // ← ОБНОВЛЯЕМ ПОЛНОЭКРАННЫЙ КАЛЕНДАРЬ
            updateMonthYearDisplay();
        };
    });
}

// Функция обновления отображения месяца/года
function updateMonthYearDisplay() {
    const monthYearSpan = document.getElementById('ganttMonthYear');
    if (!monthYearSpan) return;
    
    if (currentZoom === 'day') {
        monthYearSpan.textContent = currentGanttDate.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    } else if (currentZoom === 'week') {
        const weekStart = new Date(currentGanttDate);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        monthYearSpan.textContent = 
            `${weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - 
             ${weekEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
        // Месяц
        monthYearSpan.textContent = ganttStartDate.toLocaleDateString('ru-RU', { 
            month: 'long', 
            year: 'numeric' 
        });
    }
}

// Экспорт Ганта в PNG
async function exportGanttToPNG() {
    const element = document.querySelector('.gantt-wrapper');
    if (!element) return;
    
    showToast('Функция экспорта в разработке', 'info');
    // TODO: Использовать html2canvas
}

function renderGantt() {
    const calendarSection = document.getElementById('base-section-calendar');
    if (!calendarSection || calendarSection.style.display !== 'block') {
        console.log('⏸️ Calendar section not visible, skipping Gantt render');
        return;
    }
    
    // Если даты не установлены — инициализируем текущими
    if (!currentGanttDate) {
        currentGanttDate = new Date();
        const now = new Date();
        ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        ganttEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    if (currentZoom === 'month' && !ganttStartDate) {
        const now = new Date();
        ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        ganttEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    console.log('🎨 renderGantt called, zoom:', currentZoom, 'date:', currentGanttDate.toISOString().slice(0, 10));
    
    const activeTasks = currentTasks.filter(task => task.status !== 'completed');
    const tasksWithDates = activeTasks.filter(task => task.start_date && task.due_date);
    
    const MAX_GANTT_TASKS = 15;
    const ganttData = tasksWithDates.slice(0, MAX_GANTT_TASKS).map(task => ({
        id: task.id,
        name: task.title,
        start: task.start_date,
        end: task.due_date,
        progress: task.progress || 0,
        priority: task.priority || 'medium',
        status: task.status,
        assignee_name: task.assignee_name,
        assignee_surname: task.assignee_surname
    }));
    
    if (ganttData.length === 0) {
        const barsContainer = document.getElementById('ganttBarsContainer');
        if (barsContainer) {
            barsContainer.innerHTML = '<div class="empty-gantt">Нет активных задач с указанными датами</div>';
            barsContainer.style.width = '100%';
        }
        return;
    }
    
    renderGanttChart(ganttData);
    updateMonthYearDisplay();  // ← добавляем обновление заголовка
}
// Инициализация
let ganttInitTimeout = null;

function initGantt() {
    // Отменяем предыдущий таймаут
    if (ganttInitTimeout) {
        clearTimeout(ganttInitTimeout);
    }
    
    // Инициализируем с задержкой
    ganttInitTimeout = setTimeout(() => {
        console.log('🎬 Initializing Gantt...');
        initGanttControls();
        
        // Делаем рендер с дополнительной задержкой
        setTimeout(() => {
            renderGantt();
        }, 50);
    }, 300);
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
            console.log('✅ Loaded', currentTasks.length, 'tasks');
            
            // Обновляем отображение только если секция видима
            const calendarSection = document.getElementById('base-section-calendar');
            if (calendarSection && calendarSection.style.display === 'block') {
                renderFullscreenTasks();
                renderGantt();
            }
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
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
// =====================================================
// НАВИГАЦИЯ КАЛЕНДАРЯ (ЕДИНАЯ)
// =====================================================

function calendarPrevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderMiniCalendar();
    renderFullscreenCalendar();
}

function calendarNextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderMiniCalendar();
    renderFullscreenCalendar();
}

function calendarToday() {
    currentCalendarDate = new Date();
    renderMiniCalendar();
    renderFullscreenCalendar();
}

function calendarChangeMonth() {
    const month = parseInt(document.getElementById('monthSelect')?.value);
    const year = parseInt(document.getElementById('yearSelect')?.value);
    if (!isNaN(month) && !isNaN(year)) {
        currentCalendarDate = new Date(year, month, 1);
        renderMiniCalendar();
        renderFullscreenCalendar();
    }
}

function calendarChangeYear() {
    const month = parseInt(document.getElementById('monthSelect')?.value);
    const year = parseInt(document.getElementById('yearSelect')?.value);
    if (!isNaN(month) && !isNaN(year)) {
        currentCalendarDate = new Date(year, month, 1);
        renderMiniCalendar();
        renderFullscreenCalendar();
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
    console.log('📅 Opening full calendar');
    
    // Синхронизируем календарь с текущим периодом Ганта
    if (currentZoom === 'month') {
        currentCalendarDate = new Date(ganttStartDate);
    } else {
        // Для дня и недели — берём текущую дату Ганта
        currentCalendarDate = new Date(currentGanttDate);
    }
    
    // Открываем секцию
    openWindow('base-section-calendar');
    
    // Рендерим календарь и задачи
    renderFullscreenCalendar();
    renderFullscreenTasks();
    renderMiniCalendar();
    
    // Инициализируем Гант
    initGantt();
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
    // Формируем дату в правильном формате
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log('📅 Opening date modal for:', dateStr);
    console.log('📊 Available events:', calendarEvents.length);
    
    // Фильтруем события на эту дату
    const eventsOnDate = calendarEvents.filter(e => e.date === dateStr);
    console.log('📋 Events on date:', eventsOnDate.length);
    
    // Разделяем на задачи и дедлайны
    const tasksOnDate = eventsOnDate.filter(e => e.type === 'task' && e.status !== 'completed' && e.status !== 'cancelled');
    const deadlinesOnDate = eventsOnDate.filter(e => e.type === 'deadline');
    
    // Функции для приоритетов
    function getPriorityLabel(priority) {
        const labels = {
            'critical': '🔴 Критический',
            'high': '🟠 Высокий',
            'medium': '🟡 Средний',
            'low': '🟢 Низкий'
        };
        return labels[priority] || '🟡 Средний';
    }
    
    function getPriorityClass(priority) {
        const classes = {
            'critical': 'priority-critical',
            'high': 'priority-high',
            'medium': 'priority-medium',
            'low': 'priority-low'
        };
        return classes[priority] || 'priority-medium';
    }
    
    // Строим HTML модалки
    const modalHtml = `
        <div id="dateModal" class="admin-modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px; max-height: 80vh;">
                <div class="modal-header">
                    <h2>📅 ${day}.${month}.${year}</h2>
                    <button class="modal-close" onclick="closeDateModal()">&times;</button>
                </div>
                <div class="modal-body" style="overflow-y: auto;">
                    <!-- Статистика -->
                    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                        <div style="background: rgba(81,148,255,0.1); padding: 6px 14px; border-radius: 8px; font-size: 13px;">
                            📋 Задачи: <strong>${tasksOnDate.length}</strong>
                        </div>
                        <div style="background: rgba(252,121,46,0.1); padding: 6px 14px; border-radius: 8px; font-size: 13px;">
                            ⚡ Дедлайны: <strong>${deadlinesOnDate.length}</strong>
                        </div>
                    </div>
                    
                    <h3 style="font-size: 15px; margin-bottom: 12px;">📋 События на этот день</h3>
                    <div id="dateEventsList">
                        ${eventsOnDate.length === 0 ? '<p style="color: #999; text-align: center; padding: 20px;">Нет событий на этот день</p>' : 
                            eventsOnDate.map(event => {
                                const isDeadline = event.type === 'deadline';
                                const icon = isDeadline ? '⚡' : '📋';
                                const typeLabel = isDeadline ? 'Дедлайн' : 'Задача';
                                const bgColor = isDeadline ? 'rgba(252,121,46,0.05)' : 'rgba(81,148,255,0.05)';
                                
                                // Определяем статус дедлайна
                                const today = new Date();
                                const dueDate = new Date(event.date);
                                const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                                let deadlineStatus = '';
                                let deadlineClass = '';
                                
                                if (event.status === 'completed') {
                                    deadlineStatus = '✅ Выполнена';
                                    deadlineClass = 'deadline-completed';
                                } else if (daysLeft < 0) {
                                    deadlineStatus = '⚠️ Просрочена';
                                    deadlineClass = 'deadline-overdue';
                                } else if (daysLeft <= 3) {
                                    deadlineStatus = `⏰ ${daysLeft} дн.`;
                                    deadlineClass = 'deadline-urgent';
                                } else {
                                    deadlineStatus = `📅 ${daysLeft} дн.`;
                                    deadlineClass = 'deadline-normal';
                                }
                                
                                // Название события
                                const displayTitle = isDeadline ? event.title.replace('⚡ ', '') : event.title;
                                
                                return `
                                    <div class="date-event-item" onclick="closeDateModal(); openTaskView(${event.taskId || event.id})" style="cursor: pointer; padding: 12px; border-bottom: 1px solid #eee; margin-bottom: 8px; border-radius: 8px; background: ${bgColor}; transition: all 0.2s;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                            <strong>${icon} ${escapeHtml(displayTitle)}</strong>
                                            <span style="font-size: 11px; color: ${isDeadline ? '#f97316' : 'var(--c_acc)'}; font-weight: 500;">${typeLabel}</span>
                                        </div>
                                        <div style="font-size: 12px; color: #666; margin-top: 6px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                                            <span>${event.assignee ? '👤 ' + escapeHtml(event.assignee) : ' Без исполнителя'}</span>
                                            <span class="${deadlineClass}">${deadlineStatus}</span>
                                        </div>
                                        ${event.priority ? `<div style="margin-top: 4px;"><span class="priority-badge ${getPriorityClass(event.priority)}">${getPriorityLabel(event.priority)}</span></div>` : ''}
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                    
                    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee;">
                        <button class="buttonbase" onclick="closeDateModal(); openQuickCreateTaskModal('${dateStr}')">+ Создать задачу на этот день</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="buttonbase" onclick="closeDateModal()">Закрыть</button>
                </div>
            </div>
        </div>
    `;
    
    // Удаляем старую модалку
    const existingModal = document.getElementById('dateModal');
    if (existingModal) existingModal.remove();
    
    // Добавляем новую
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
// - closeDateModal()
function closeDateModal() {
    closeModal('dateModal');
}
// - openTaskModal()
// Модалка задачи
// =====================================================
// ПОЛНОЭКРАННАЯ МОДАЛКА ЗАДАЧИ
// =====================================================

let currentTaskIdFull = null;

function openTaskView(taskId) {
    currentTaskIdFull = taskId;
    openModal('taskModal');
    
    // Показываем индикатор загрузки
    document.getElementById('taskTitleFull').value = 'Загрузка...';
    document.getElementById('taskTitleFull').disabled = true;
    
    fetchTaskDataFull(taskId);
}

async function fetchTaskDataFull(taskId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load task');
        
        const data = await response.json();
        const task = data.task;
        
        // Обновляем локальный массив
        const index = currentTasks.findIndex(t => t.id === taskId);
        if (index !== -1) currentTasks[index] = task;
        
        renderTaskFull(task);
        
    } catch (error) {
        console.error('Error loading task:', error);
        const task = currentTasks.find(t => t.id === taskId);
        if (task) {
            renderTaskFull(task);
        } else {
            showToast('Ошибка загрузки задачи', 'error');
            closeTaskModal();
        }
    }
}

function renderTaskFull(task) {
    console.log('🎨 Rendering full task:', task);
    
    // Основные поля
    document.getElementById('taskTitleFull').value = task.title || '';
    document.getElementById('taskTitleFull').disabled = false;
    document.getElementById('taskIdDisplay').textContent = task.id;
    document.getElementById('taskDescriptionFull').value = task.description || '';
    document.getElementById('taskStartDateFull').value = task.start_date ? task.start_date.slice(0, 10) : '';
    document.getElementById('taskDueDateFull').value = task.due_date ? task.due_date.slice(0, 10) : '';
    
    // Приоритет
    const prioritySelect = document.getElementById('taskPriorityFull');
    prioritySelect.value = task.priority || 'medium';
    
    // Статус
    const statusSelect = document.getElementById('taskStatusFull');
    statusSelect.value = task.status || 'pending';
    updateStatusBadgeFull(task.status || 'pending');
    
    // Исполнитель
    const assigneeName = task.assignee_surname 
        ? `${task.assignee_surname} ${task.assignee_name || ''}`.trim() 
        : 'Не назначен';
    document.getElementById('taskAssigneeFull').value = assigneeName;
    
    // Создатель
    const creatorName = task.creator_surname 
        ? `${task.creator_surname} ${task.creator_name || ''}`.trim() 
        : '—';
    document.getElementById('taskCreatorFull').value = creatorName;
    
    // Прогресс
    const progress = task.progress || 0;
    document.getElementById('taskProgressFull').value = progress;
    document.getElementById('progressValueFull').textContent = progress + '%';
    
    // Даты
    const createdDate = task.created_at ? new Date(task.created_at) : null;
    document.getElementById('taskCreatedDateFull').textContent = createdDate 
        ? createdDate.toLocaleDateString('ru-RU') + ' ' + createdDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})
        : '—';
    
    const updatedDate = task.updated_at ? new Date(task.updated_at) : null;
    document.getElementById('taskUpdatedDateFull').textContent = updatedDate 
        ? updatedDate.toLocaleDateString('ru-RU') + ' ' + updatedDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})
        : '—';
    
    // Обработчики
    document.getElementById('saveTaskFullBtn').onclick = () => saveTaskFull(task.id);
    document.getElementById('deleteTaskFullBtn').onclick = () => deleteTaskFull(task.id);
    document.getElementById('addCommentFullBtn').onclick = () => addCommentFull(task.id);
    
    // Enter в комментарии
    const commentField = document.getElementById('newCommentFull');
    commentField.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addCommentFull(task.id);
        }
    };
    
    // При изменении статуса обновляем бейдж
    statusSelect.onchange = () => updateStatusBadgeFull(statusSelect.value);
    
    // Загружаем комментарии
    loadCommentsFull(task.id);
}

function updateStatusBadgeFull(status) {
    const badge = document.getElementById('taskStatusBadgeFull');
    const statusMap = {
        pending: { label: '⏳ Ожидает', class: 'status-pending' },
        in_progress: { label: '🔄 В работе', class: 'status-in_progress' },
        completed: { label: '✅ Выполнена', class: 'status-completed' },
        cancelled: { label: '❌ Отменена', class: 'status-cancelled' }
    };
    const info = statusMap[status] || statusMap.pending;
    badge.textContent = info.label;
    badge.className = 'task-status-badge ' + info.class;
}

function updateProgressFull(value) {
    document.getElementById('progressValueFull').textContent = value + '%';
}

async function loadCommentsFull(taskId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderCommentsFull(data.comments || []);
        } else {
            renderCommentsFull([]);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        renderCommentsFull([]);
    }
}

function renderCommentsFull(comments) {
    const container = document.getElementById('taskCommentsListFull');
    const countEl = document.getElementById('commentsCountFull');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="task-comments-empty">Нет комментариев</div>';
        if (countEl) countEl.textContent = '0';
        return;
    }
    
    if (countEl) countEl.textContent = comments.length;
    
    container.innerHTML = comments.map(c => {
        const userName = c.user_name || 'Пользователь';
        const date = c.created_at ? new Date(c.created_at).toLocaleString('ru-RU') : '';
        return `
            <div class="task-comment-item">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(userName)}</span>
                    <span>${date}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.content)}</div>
            </div>
        `;
    }).join('');
}

async function addCommentFull(taskId) {
    const content = document.getElementById('newCommentFull')?.value.trim();
    if (!content) {
        showToast('Введите текст комментария', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            document.getElementById('newCommentFull').value = '';
            await loadCommentsFull(taskId);
            showToast('Комментарий добавлен', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка добавления комментария', 'error');
        }
    } catch (error) {
        console.error('Add comment error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

async function saveTaskFull(taskId) {
    const title = document.getElementById('taskTitleFull')?.value.trim();
    const description = document.getElementById('taskDescriptionFull')?.value;
    const startDate = document.getElementById('taskStartDateFull')?.value;
    const dueDate = document.getElementById('taskDueDateFull')?.value;
    const priority = document.getElementById('taskPriorityFull')?.value;
    const status = document.getElementById('taskStatusFull')?.value;
    const progress = parseInt(document.getElementById('taskProgressFull')?.value) || 0;
    
    if (!title) {
        showToast('Введите название задачи', 'error');
        document.getElementById('taskTitleFull').focus();
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
                description: description || '',
                startDate: startDate || null,
                dueDate: dueDate || null,
                priority: priority || 'medium',
                status: status || 'pending',
                progress: progress
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast('Задача сохранена', 'success');
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            
            // Обновляем отображение
            renderTaskFull(data.task);
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Save task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

async function deleteTaskFull(taskId) {
    if (!confirm('Удалить эту задачу?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('Задача удалена', 'success');
            currentTasks = currentTasks.filter(t => t.id !== taskId);
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            closeTaskModal();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (error) {
        console.error('Delete task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

// Переопределяем closeTaskModal для новой модалки
function closeTaskModal() {
    closeModal('taskModal');
    currentTaskIdFull = null;
}
// - saveTask()
// Сохранение задачи
async function saveTask(taskId) {
    const title = document.getElementById('taskTitle')?.value.trim();
    const description = document.getElementById('taskDescription')?.value;
    const startDate = document.getElementById('taskStartDate')?.value;
    const dueDate = document.getElementById('taskDueDate')?.value;
    const priority = document.getElementById('taskPriority')?.value;
    const status = document.getElementById('taskStatus')?.value;
    const progress = parseInt(document.getElementById('taskProgress')?.value) || 0;
    
    if (!title) {
        showToast('Введите название задачи', 'error');
        document.getElementById('taskTitle').focus();
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
                description: description || '',
                startDate: startDate || null,
                dueDate: dueDate || null,
                priority: priority || 'medium',
                status: status || 'pending',
                progress: progress
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const updatedTask = data.task;
            
            // Обновляем в локальном массиве
            const index = currentTasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                currentTasks[index] = updatedTask;
            }
            
            // Обновляем в calendarEvents
            const eventIndex = calendarEvents.findIndex(e => e.id === taskId && e.type === 'task');
            if (eventIndex !== -1) {
                calendarEvents[eventIndex] = {
                    ...calendarEvents[eventIndex],
                    title: updatedTask.title,
                    status: updatedTask.status,
                    priority: updatedTask.priority,
                    date: updatedTask.due_date ? updatedTask.due_date.slice(0, 10) : null
                };
            }
            
            showToast('Задача сохранена', 'success');
            
            // Перезагружаем все списки
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            
            // Обновляем отображение в модалке
            renderTaskModal(updatedTask);
            
            closeTaskModal();
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
    const content = document.getElementById('newComment')?.value.trim();
    if (!content) {
        showToast('Введите текст комментария', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('newComment').value = '';
            
            // Добавляем комментарий в локальный список
            const comment = data.comment;
            const commentsContainer = document.getElementById('taskCommentsList');
            const currentComments = commentsContainer.querySelectorAll('.comment-item');
            
            // Перезагружаем комментарии с сервера
            await loadComments(taskId);
            showToast('Комментарий добавлен', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка добавления комментария', 'error');
        }
    } catch (error) {
        console.error('Add comment error:', error);
        showToast('Ошибка сервера', 'error');
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
            
            // Удаляем из локальных массивов
            currentTasks = currentTasks.filter(t => t.id !== taskId);
            calendarEvents = calendarEvents.filter(e => e.id !== taskId);
            
            // Перезагружаем все списки
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            
            closeTaskModal();
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
function updateStatusBadge(status) {
    const badge = document.getElementById('taskStatusBadge');
    const statusMap = {
        pending: { label: '⏳ Ожидает', color: '#f59e0b' },
        in_progress: { label: '🔄 В работе', color: '#3b82f6' },
        completed: { label: '✅ Выполнена', color: '#10b981' },
        cancelled: { label: '❌ Отменена', color: '#ef4444' }
    };
    const info = statusMap[status] || statusMap.pending;
    badge.textContent = info.label;
    badge.style.background = info.color;
    badge.style.color = 'white';
}
function updateProgressDisplay(value) {
    document.getElementById('progressValue').textContent = value + '%';
}
function renderComments(comments) {
    const container = document.getElementById('taskCommentsList');
    const countEl = document.getElementById('commentsCount');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--c_surf_txt); font-size: 13px;">Нет комментариев</div>';
        if (countEl) countEl.textContent = '0';
        return;
    }
    
    if (countEl) countEl.textContent = comments.length;
    
    container.innerHTML = comments.map(c => {
        const userName = c.user_name || 'Пользователь';
        const date = c.created_at ? new Date(c.created_at).toLocaleString('ru-RU') : '';
        return `
            <div style="padding: 10px 12px; background: var(--c_bg); border-radius: 8px; border-left: 3px solid var(--c_acc);">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--c_surf_txt); margin-bottom: 4px;">
                    <strong>${escapeHtml(userName)}</strong>
                    <span>${date}</span>
                </div>
                <div style="font-size: 14px; color: var(--c_bg_txt); word-wrap: break-word;">${escapeHtml(c.content)}</div>
            </div>
        `;
    }).join('');
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
                    openTaskView(result.task.id);
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
    // Очищаем форму — рендерим стандартные поля
    renderSimpleTaskForm();
    
    // Если передан defaultDate — устанавливаем
    if (defaultDate) {
        const dueDateInput = document.getElementById('form_field_due_date');
        if (dueDateInput) dueDateInput.value = defaultDate;
    }
    
    // Обновляем заголовок
    const formTitle = document.getElementById('googleFormTitle');
    if (formTitle) formTitle.textContent = 'Новая задача';
    
    const formDesc = document.getElementById('googleFormDescription');
    if (formDesc) formDesc.textContent = 'Заполните форму для создания задачи';
    
    const badge = document.getElementById('templateFormBadge');
    if (badge) badge.textContent = 'Обычная задача';
    
    // Закрываем секцию выбора и открываем создание
    closeWindow('base-section-task-new-typeselector');
    openWindow('base-section-task-create');
}
// Рендер формы для обычной задачи (без шаблона)
function renderSimpleTaskForm() {
    const container = document.getElementById('googleFormBody');
    if (!container) return;
    
    // Стандартные поля для обычной задачи
    const defaultFields = [
        {
            key: 'title',
            label: 'Название задачи',
            type: 'text',
            required: true,
            placeholder: 'Введите название задачи'
        },
        {
            key: 'description',
            label: 'Описание',
            type: 'textarea',
            required: false,
            placeholder: 'Опишите задачу...'
        },
        {
            key: 'priority',
            label: 'Приоритет',
            type: 'select',
            required: true,
            options: ['Низкий', 'Средний', 'Высокий', 'Критический'],
            defaultValue: 'Средний'
        },
        {
            key: 'start_date',
            label: 'Дата начала',
            type: 'date',
            required: false
        },
        {
            key: 'due_date',
            label: 'Срок выполнения',
            type: 'date',
            required: true
        },
        {
            key: 'assignee',
            label: 'Ответственный',
            type: 'user',
            required: true
        },
        {
            key: 'observers',
            label: 'Наблюдатели',
            type: 'multi-user',
            required: false
        }
    ];
    
    // Рендерим поля
    container.innerHTML = defaultFields.map(field => renderGoogleFormField(field, {})).join('');
    
    // Инициализируем обработчики для динамических полей
    initGoogleFormHandlers({});
    
    // Загружаем пользователей для селектов
    loadTaskUsers();
}
// =====================================================
// 8.6 ОТКРЫТИЕ ЗАДАЧИ ИЗ ШАБЛОНА (В GOOGLE FORMS СТИЛЕ)
// =====================================================

// Открытие создания обычной задачи (без шаблона)
function openTaskCreate() {
    // Очищаем форму
    document.getElementById('googleFormTitle').textContent = 'Новая задача';
    document.getElementById('googleFormDescription').textContent = 'Заполните форму для создания задачи';
    document.getElementById('templateFormBadge').textContent = 'Обычная задача';
    
    // Очищаем все поля
    document.getElementById('form_field_title').value = '';
    document.getElementById('form_field_description').value = '';
    document.getElementById('form_field_priority').value = 'medium';
    document.getElementById('form_field_start_date').value = '';
    document.getElementById('form_field_due_date').value = '';
    document.getElementById('form_field_assignee').value = '';
    document.getElementById('form_field_observers').value = '';
    document.getElementById('selected_assignee').innerHTML = '<span class="empty-hint">Не выбран</span>';
    document.getElementById('selected_observers').innerHTML = '<span class="empty-hint">Не выбраны</span>';
    
    // Скрываем кастомные поля
    document.getElementById('taskCreateCustomFields').style.display = 'none';
    document.getElementById('taskCreateCustomFieldsContainer').innerHTML = '';
    
    // Открываем секцию
    openWindow('base-section-task-create');
}
async function openTaskFromTemplate(templateId) {
    console.log('📋 openTaskFromTemplate called with id:', templateId);
    
    // Ищем шаблон в загруженном списке
    let template = userTemplates.find(t => t.id === templateId);
    
    // Если не нашли в кэше, пробуем загрузить с сервера
    if (!template) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/task-templates/${templateId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                template = data.template;
                // Добавляем в кэш
                if (template) userTemplates.push(template);
            } else {
                console.error('Template not found on server:', templateId);
                showToast('Шаблон не найден', 'error');
                return;
            }
        } catch (error) {
            console.error('Error loading template:', error);
            showToast('Ошибка загрузки шаблона', 'error');
            return;
        }
    }
    
    if (!template) {
        console.error('Template not found:', templateId);
        showToast('Шаблон не найден', 'error');
        return;
    }
    
    console.log('✅ Template found:', template.name);
    
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
    
    // Открываем форму в Google Forms стиле
    openTaskFormFromTemplate(template);
}
// При выборе шаблона из списка
async function selectTemplateForCreate(templateId) {
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
            
            // Закрываем секцию выбора
            closeWindow('base-section-task-new-typeselector');
            
            // Заполняем форму шаблоном и открываем создание
            fillFormFromTemplate(template);
            openWindow('base-section-task-create');
        }
    } catch (error) {
        console.error('Error selecting template:', error);
        showToast('Ошибка загрузки шаблона', 'error');
    }
}

function fillFormFromTemplate(template) {
    const templateData = template.template_data || {};
    
    // Собираем поля: стандартные + кастомные из шаблона
    const allFields = [
        ...defaultTemplateFields,  // стандартные поля
        ...(templateData.fields || [])  // кастомные поля
    ].sort((a, b) => (a.order || 999) - (b.order || 999));
    
    // Рендерим форму с полями
    const container = document.getElementById('googleFormBody');
    if (container) {
        container.innerHTML = allFields.map(field => renderGoogleFormField(field, templateData)).join('');
        initGoogleFormHandlers(templateData);
    }
    
    // Заполняем значения из шаблона
    if (templateData.defaultPriority) {
        const prioritySelect = document.getElementById('form_field_priority');
        if (prioritySelect) prioritySelect.value = templateData.defaultPriority;
    }
    
    if (templateData.defaultDeadlineDays) {
        const dueDateInput = document.getElementById('form_field_due_date');
        if (dueDateInput) {
            const date = new Date();
            date.setDate(date.getDate() + templateData.defaultDeadlineDays);
            dueDateInput.value = date.toISOString().slice(0, 10);
        }
    }
    
    // Заголовок
    const formTitle = document.getElementById('googleFormTitle');
    if (formTitle) formTitle.textContent = template.name;
    
    const formDesc = document.getElementById('googleFormDescription');
    if (formDesc) formDesc.textContent = template.description || 'Заполните форму для создания задачи';
    
    const badge = document.getElementById('templateFormBadge');
    if (badge) badge.textContent = 'Шаблон: ' + template.name;
}
// Открытие формы в стиле Google Forms
function openTaskFormFromTemplate(template) {
    console.log('🎨 Opening Google Forms style for template:', template.name);
    
    // Проверяем, что секция существует
    const formSection = document.getElementById('base-section-task-create');
    if (!formSection) {
        console.error('Section base-section-task-from-template not found!');
        showToast('Ошибка: секция формы не найдена', 'error');
        return;
    }
    
    currentFormTemplate = template;
    currentFormData = {};
    
    // Устанавливаем заголовок
    const titleEl = document.getElementById('templateFormTitle');
    const badgeEl = document.getElementById('templateFormBadge');
    const googleTitleEl = document.getElementById('googleFormTitle');
    const googleDescEl = document.getElementById('googleFormDescription');
    
    if (titleEl) titleEl.textContent = `📝 Создание задачи`;
    if (badgeEl) badgeEl.textContent = template.name;
    if (googleTitleEl) googleTitleEl.textContent = template.name;
    if (googleDescEl) googleDescEl.textContent = template.description || 'Заполните форму для создания задачи';
    
    // Рендерим форму
    renderGoogleForm(template);
    
    // Закрываем секцию выбора и открываем форму
    const selectorSection = document.getElementById('base-section-task-new-typeselector');
    if (selectorSection) selectorSection.style.display = 'none';
    
    formSection.style.display = 'block';
    formSection.classList.add('active');
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

// Создание задачи
async function createSimpleTask() {
    const title = document.getElementById('taskTitle')?.value.trim();
    const deadline = document.getElementById('taskDeadline')?.value;
    const assignee = document.getElementById('taskAssignee')?.value;
    const priority = document.getElementById('taskPriority')?.value;
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
        priority: priority,
        dueDate: deadline,
        assignedTo: parseInt(assignee),
        observers: Array.from(document.getElementById('taskObservers')?.selectedOptions || []).map(opt => parseInt(opt.value)).filter(v => v),
        tags: document.getElementById('taskTags')?.value.split(',').map(t => t.trim()).filter(t => t),
        notifyAssignee: document.getElementById('notifyOnAssign')?.checked || false,
        notifyOnDeadline: document.getElementById('notifyOnDeadline')?.checked || false
    };
    console.log('📦 taskData:', taskData);  // ← ДОБАВИТЬ

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
// 8.6 СОЗДАНИЕ ЗАДАЧИ ПО ШАБЛОНУ (GOOGLE FORMS СТИЛЬ)
// =====================================================

let currentFormTemplate = null;
let currentFormData = {};

// Открытие формы создания задачи по шаблону
function openTaskFormFromTemplate(template) {
    currentFormTemplate = template;
    currentFormData = {};
    
    // Устанавливаем заголовок
    document.getElementById('templateFormTitle').textContent = `📝 Создание задачи`;
    document.getElementById('templateFormBadge').textContent = template.name;
    document.getElementById('googleFormTitle').textContent = template.name;
    document.getElementById('googleFormDescription').textContent = template.description || 'Заполните форму для создания задачи';
    
    // Рендерим форму
    renderGoogleForm(template);
    
    // Открываем секцию
    openWindow('base-section-task-create');
}

// Рендер формы в стиле Google Forms
function renderGoogleForm(template) {
    const container = document.getElementById('googleFormBody');
    if (!container) return;
    
    const templateData = template.template_data;
    
    // Собираем все поля (стандартные + кастомные)
    const allFields = [
        ...defaultTemplateFields,
        ...(templateData.fields || [])
    ].sort((a, b) => (a.order || 999) - (b.order || 999));
    
    if (allFields.length === 0) {
        container.innerHTML = '<div class="empty-form">Нет полей для отображения</div>';
        return;
    }
    
    container.innerHTML = allFields.map(field => renderGoogleFormField(field, templateData)).join('');
    
    // Инициализируем обработчики для динамических полей
    initGoogleFormHandlers(templateData);
}

// Рендер одного поля
function renderGoogleFormField(field, templateData) {
    let inputHtml = '';
    const fieldId = `form_field_${field.key}`;
    const defaultValue = getFieldDefaultValue(field, templateData);
    
    // Специальная обработка для поля приоритета
    if (field.key === 'priority') {
        inputHtml = `
            <select id="${fieldId}" class="field-input" ${field.required ? 'data-required="true"' : ''}>
                <option value="low" ${defaultValue === 'low' ? 'selected' : ''}>🟢 Низкий</option>
                <option value="medium" ${defaultValue === 'medium' ? 'selected' : ''}>🟡 Средний</option>
                <option value="high" ${defaultValue === 'high' ? 'selected' : ''}>🟠 Высокий</option>
                <option value="critical" ${defaultValue === 'critical' ? 'selected' : ''}>🔴 Критический</option>
            </select>
        `;
    }
    switch (field.type) {
        case 'text':
            inputHtml = `
                <input type="text" id="${fieldId}" class="field-input" 
                       placeholder="${escapeHtml(field.placeholder || '')}" 
                       value="${escapeHtml(defaultValue)}"
                       ${field.required ? 'data-required="true"' : ''}>
            `;
            break;
            
        case 'textarea':
            inputHtml = `
                <textarea id="${fieldId}" class="field-input" rows="4" 
                          placeholder="${escapeHtml(field.placeholder || '')}"
                          ${field.required ? 'data-required="true"' : ''}>${escapeHtml(defaultValue)}</textarea>
            `;
            break;
            
        case 'number':
            inputHtml = `
                <input type="number" id="${fieldId}" class="field-input" 
                       placeholder="${escapeHtml(field.placeholder || '0')}" 
                       value="${defaultValue}"
                       ${field.required ? 'data-required="true"' : ''}>
            `;
            break;
            
        case 'date':
            inputHtml = `
                <input type="date" id="${fieldId}" class="field-input" 
                       value="${defaultValue}"
                       ${field.required ? 'data-required="true"' : ''}>
            `;
            break;
            
        case 'select':
            if (field.key === 'priority') {
                // Специальная обработка для поля приоритета
                inputHtml = `
                    <select id="${fieldId}" class="field-input" ${field.required ? 'data-required="true"' : ''}>
                        <option value="low" ${defaultValue === 'low' ? 'selected' : ''}>🟢 Низкий</option>
                        <option value="medium" ${defaultValue === 'medium' ? 'selected' : ''}>🟡 Средний</option>
                        <option value="high" ${defaultValue === 'high' ? 'selected' : ''}>🟠 Высокий</option>
                        <option value="critical" ${defaultValue === 'critical' ? 'selected' : ''}>🔴 Критический</option>
                    </select>
                `;
            } else {
                inputHtml = `
                    <select id="${fieldId}" class="field-input" ${field.required ? 'data-required="true"' : ''}>
                        <option value="">${escapeHtml(field.placeholder || 'Выберите вариант')}</option>
                        ${(field.options || []).map(opt => `
                            <option value="${escapeHtml(opt)}" ${defaultValue === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>
                        `).join('')}
                    </select>
                `;
            }
            break;  
        case 'checkbox':
            inputHtml = `
                <div class="checkbox-group">
                    <label class="checkbox-option">
                        <input type="checkbox" id="${fieldId}" ${defaultValue === true || defaultValue === 'true' ? 'checked' : ''}>
                        <span>Да / Нет</span>
                    </label>
                </div>
            `;
            break;
            
        case 'user':
            inputHtml = `
                <div class="users-selector" data-field-key="${field.key}" data-multiple="false">
                    <div class="users-selector-header">
                        <span>Выбранный пользователь</span>
                    </div>
                    <div class="selected-users-list" id="selected_${field.key}">
                        ${defaultValue ? `<span class="selected-user-tag" data-user-id="${defaultValue.id}">👤 ${escapeHtml(defaultValue.name)} <button type="button" onclick="removeSelectedUser('${field.key}', ${defaultValue.id})">✖</button></span>` : '<span class="empty-hint">Не выбран</span>'}
                    </div>
                    <button type="button" class="select-users-btn" onclick="openUserSelectorForField('${field.key}', false)">
                        + Выбрать пользователя
                    </button>
                    <input type="hidden" id="${fieldId}" value="${defaultValue ? defaultValue.id : ''}" ${field.required ? 'data-required="true"' : ''}>
                </div>
            `;
            break;
            
        case 'multi-user':
            inputHtml = `
                <div class="users-selector" data-field-key="${field.key}" data-multiple="true">
                    <div class="users-selector-header">
                        <span>Выбранные пользователи (${(defaultValue || []).length})</span>
                    </div>
                    <div class="selected-users-list" id="selected_${field.key}">
                        ${(defaultValue || []).map(user => `
                            <span class="selected-user-tag" data-user-id="${user.id}">👤 ${escapeHtml(user.name)} <button type="button" onclick="removeSelectedUser('${field.key}', ${user.id})">✖</button></span>
                        `).join('')}
                        ${(!defaultValue || defaultValue.length === 0) ? '<span class="empty-hint">Не выбраны</span>' : ''}
                    </div>
                    <button type="button" class="select-users-btn" onclick="openUserSelectorForField('${field.key}', true)">
                        + Выбрать пользователей
                    </button>
                    <input type="hidden" id="${fieldId}" value="${(defaultValue || []).map(u => u.id).join(',')}" ${field.required ? 'data-required="true"' : ''}>
                </div>
            `;
            break;
            
        case 'document':
            inputHtml = `
                <div class="document-attachment" onclick="openDocumentSelectorForField('${field.key}')">
                    <div class="doc-icon">📄</div>
                    <div class="doc-info">
                        <div class="doc-name" id="doc_name_${field.key}">${defaultValue || 'Выберите документ'}</div>
                        <div class="doc-placeholder">${escapeHtml(field.placeholder || 'Нажмите, чтобы выбрать документ')}</div>
                    </div>
                    ${defaultValue ? `<button class="doc-remove" onclick="event.stopPropagation(); clearDocumentField('${field.key}')">✖</button>` : ''}
                </div>
                <input type="hidden" id="${fieldId}" value="${escapeHtml(defaultValue || '')}" ${field.required ? 'data-required="true"' : ''}>
            `;
            break;
            
        default:
            inputHtml = `<input type="text" id="${fieldId}" class="field-input" ${field.required ? 'data-required="true"' : ''}>`;
    }
    
    return `
        <div class="google-form-field" data-field-key="${field.key}" data-required="${field.required}">
            <div class="field-label">
                ${escapeHtml(field.label)}
                ${field.required ? '<span class="required-star">*</span>' : ''}
            </div>
            ${field.placeholder ? `<div class="field-help">${escapeHtml(field.placeholder)}</div>` : ''}
            <div class="field-input">${inputHtml}</div>
            <div class="field-error" style="display: none; color: #d93025; font-size: 12px; margin-top: 4px;"></div>
        </div>
    `;
}

// Получение значения по умолчанию для поля
function getFieldDefaultValue(field, templateData) {
    if (field.builtin) {
        switch(field.key) {
            case 'priority': 
                // Убедись, что возвращается код, а не текст
                const defaultPriority = templateData.defaultPriority || 'medium';
                console.log('🎯 Default priority from template:', defaultPriority);
                return defaultPriority;
            case 'due_date': 
                if (templateData.defaultDeadlineDays) {
                    const date = new Date();
                    date.setDate(date.getDate() + templateData.defaultDeadlineDays);
                    return date.toISOString().slice(0, 10);
                }
                return '';
            default: 
                return field.defaultValue || '';
        }
    }
    return field.defaultValue || '';
}

// Инициализация обработчиков формы
function initGoogleFormHandlers(templateData) {
    // Обработчики для полей с пользователями уже настроены через onclick
    // Обработчики для документов тоже
}

// Выбор пользователя для поля
function openUserSelectorForField(fieldKey, multiple) {
    const currentValue = document.getElementById(`selected_${fieldKey}`).innerHTML;
    const preselectedIds = [];
    
    // Парсим текущие выбранные ID
    const tags = document.querySelectorAll(`#selected_${fieldKey} .selected-user-tag`);
    tags.forEach(tag => {
        const userId = parseInt(tag.dataset.userId);
        if (userId) preselectedIds.push(userId);
    });
    
    openUserSelector({
        mode: multiple ? 'multiple' : 'single',
        preselectedIds: preselectedIds,
        title: multiple ? 'Выберите пользователей' : 'Выберите пользователя',
        onConfirm: (users, userIds) => {
            updateSelectedUsersDisplay(fieldKey, users, userIds, multiple);
        }
    });
}

// Обновление отображения выбранных пользователей
function updateSelectedUsersDisplay(fieldKey, users, userIds, multiple) {
    const container = document.getElementById(`selected_${fieldKey}`);
    const hiddenInput = document.getElementById(`form_field_${fieldKey}`);
    
    if (!container) return;
    
    if (multiple) {
        container.innerHTML = users.map(user => `
            <span class="selected-user-tag" data-user-id="${user.id}">
                👤 ${escapeHtml(user.surname)} ${escapeHtml(user.name)}
                <button type="button" onclick="removeSelectedUser('${fieldKey}', ${user.id})">✖</button>
            </span>
        `).join('');
        
        if (users.length === 0) {
            container.innerHTML = '<span class="empty-hint">Не выбраны</span>';
        }
        
        if (hiddenInput) hiddenInput.value = userIds.join(',');
    } else {
        const user = users[0];
        if (user) {
            container.innerHTML = `
                <span class="selected-user-tag" data-user-id="${user.id}">
                    👤 ${escapeHtml(user.surname)} ${escapeHtml(user.name)}
                    <button type="button" onclick="removeSelectedUser('${fieldKey}', ${user.id})">✖</button>
                </span>
            `;
            if (hiddenInput) hiddenInput.value = user.id;
        } else {
            container.innerHTML = '<span class="empty-hint">Не выбран</span>';
            if (hiddenInput) hiddenInput.value = '';
        }
    }
    
    // Обновляем счетчик в заголовке
    const headerSpan = container.closest('.users-selector')?.querySelector('.users-selector-header span');
    if (headerSpan && multiple) {
        headerSpan.textContent = `Выбранные пользователи (${users.length})`;
    }
}

// Удаление выбранного пользователя
function removeSelectedUser(fieldKey, userId) {
    const hiddenInput = document.getElementById(`form_field_${fieldKey}`);
    const multiple = hiddenInput?.value.includes(',');
    
    if (multiple) {
        const currentIds = hiddenInput.value.split(',').filter(id => id && parseInt(id) !== userId);
        hiddenInput.value = currentIds.join(',');
        
        // Перезагружаем отображение
        const userIds = currentIds.map(id => parseInt(id));
        // Здесь нужно получить данные пользователей, но для простоты просто обновим DOM
        const tag = document.querySelector(`#selected_${fieldKey} .selected-user-tag[data-user-id="${userId}"]`);
        if (tag) tag.remove();
        
        const container = document.getElementById(`selected_${fieldKey}`);
        if (container && container.children.length === 0) {
            container.innerHTML = '<span class="empty-hint">Не выбраны</span>';
        }
        
        // Обновляем счетчик
        const headerSpan = container?.closest('.users-selector')?.querySelector('.users-selector-header span');
        if (headerSpan) {
            const count = currentIds.filter(id => id).length;
            headerSpan.textContent = `Выбранные пользователи (${count})`;
        }
    } else {
        hiddenInput.value = '';
        const container = document.getElementById(`selected_${fieldKey}`);
        if (container) container.innerHTML = '<span class="empty-hint">Не выбран</span>';
    }
}

// Выбор документа для поля
function openDocumentSelectorForField(fieldKey) {
    openDocumentSelector(fieldKey);
}

// Очистка выбранного документа
function clearDocumentField(fieldKey) {
    const hiddenInput = document.getElementById(`form_field_${fieldKey}`);
    const docNameSpan = document.getElementById(`doc_name_${fieldKey}`);
    
    if (hiddenInput) hiddenInput.value = '';
    if (docNameSpan) docNameSpan.textContent = 'Выберите документ';
}

// Сбор данных из формы
function collectFormData() {
    const formData = {};
    const fields = document.querySelectorAll('#googleFormBody .google-form-field');
    
    for (const field of fields) {
        const fieldKey = field.dataset.fieldKey;
        const input = field.querySelector('input, textarea, select');
        const hiddenInput = field.querySelector('input[type="hidden"]');
        
        let value = null;
        let type = 'text';
        let label = fieldKey;
        
        if (hiddenInput) {
            value = hiddenInput.value;
            type = hiddenInput.dataset.fieldType || 'text';
            label = hiddenInput.dataset.fieldLabel || fieldKey;
        } else if (input) {
            type = input.dataset.fieldType || input.type || 'text';
            label = input.dataset.fieldLabel || fieldKey;
            
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = input.value ? parseFloat(input.value) : null;
            } else {
                value = input.value || null;
            }
        }
        
        // Для полей с пользователями (display + hidden)
        if (fieldKey === 'assignee' || fieldKey === 'observers') {
            const hidden = field.querySelector('input[type="hidden"]');
            if (hidden) {
                value = hidden.value;
                type = fieldKey === 'observers' ? 'multi-user' : 'user';
                label = fieldKey === 'assignee' ? 'Исполнитель' : 'Наблюдатели';
            }
        }
        
        formData[fieldKey] = value;
        formData[`${fieldKey}_type`] = type;
        formData[`${fieldKey}_label`] = label;
    }
    
    console.log('📦 Final formData:', formData);
    return formData;
}

// Создание задачи из формы
async function submitTaskFromTemplate() {
    const formData = collectFormData();
    if (!formData) return;
    
    console.log('📋 Raw formData:', formData);
    
    // Получаем приоритет
    const prioritySelect = document.querySelector('#form_field_priority');
    let priorityCode = prioritySelect ? prioritySelect.value : 'medium';
    
    // Маппинг приоритета
    if (priorityCode === 'Низкий') priorityCode = 'low';
    else if (priorityCode === 'Средний') priorityCode = 'medium';
    else if (priorityCode === 'Высокий') priorityCode = 'high';
    else if (priorityCode === 'Критический') priorityCode = 'critical';
    
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priorityCode)) {
        console.warn('⚠️ Unknown priority:', priorityCode, 'using medium');
        priorityCode = 'medium';
    }
    
    // === НОВОЕ: Собираем кастомные поля с типом ===
    // === Собираем кастомные поля с правильным типом ===
    const customFields = {};

    // Получаем все поля из формы (кроме базовых)
    const allFields = document.querySelectorAll('#googleFormBody .google-form-field');
    allFields.forEach(field => {
        const fieldKey = field.dataset.fieldKey;
        // Пропускаем базовые поля
        if (['title', 'description', 'priority', 'start_date', 'due_date', 'assignee', 'observers', 'linked_document'].includes(fieldKey)) {
            return;
        }
        
        // Получаем значение и тип
        let value = null;
        let type = 'text';
        let label = fieldKey;
        
        // Ищем hidden input (для пользователей)
        const hiddenInput = field.querySelector('input[type="hidden"]');
        const input = field.querySelector('input:not([type="hidden"]), textarea, select');
        
        if (hiddenInput) {
            // Для полей с пользователями — берём значение из hidden
            value = hiddenInput.value || null;
            type = hiddenInput.dataset.fieldType || 'text';
            label = hiddenInput.dataset.fieldLabel || fieldKey;
        } else if (input) {
            type = input.dataset.fieldType || input.type || 'text';
            label = input.dataset.fieldLabel || fieldKey;
            
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = input.value ? parseFloat(input.value) : null;
            } else if (input.type === 'select-one' || input.tagName === 'SELECT') {
                value = input.value || null;
            } else {
                value = input.value || null;
            }
        }
        
        // Если значение пустое — пропускаем
        if (value === null || value === undefined || value === '') {
            return;
        }
        
        // Для массива (multi-user) — парсим
        if (type === 'multi-user' && typeof value === 'string' && value.includes(',')) {
            value = value.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        }
        
        // Сохраняем структурированные данные
        customFields[fieldKey] = {
            type: type,
            value: value,
            label: label || fieldKey
        };
    });

    console.log('📦 Custom fields with types:', JSON.stringify(customFields, null, 2));
    
    // Формируем данные для API
    const taskData = {
        title: formData.title || '',
        description: formData.description || '',
        priority: priorityCode,
        startDate: formData.start_date || null,
        dueDate: formData.due_date || null,
        assignedTo: formData.assignee ? parseInt(formData.assignee) : null,
        observers: formData.observers ? formData.observers.split(',').map(id => parseInt(id)).filter(id => id) : [],
        linkedDocument: formData.linked_document || null,
        customFields: customFields,  // ← теперь с типами
        templateId: currentFormTemplate?.id || null
    };
    
    console.log('📤 Final taskData:', taskData);
    
    // Валидация
    if (!taskData.title) {
        showToast('Введите название задачи', 'error');
        return;
    }
    
    if (!taskData.dueDate) {
        showToast('Укажите срок выполнения', 'error');
        return;
    }
    
    if (!taskData.assignedTo) {
        showToast('Выберите ответственного исполнителя', 'error');
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
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast('✅ Задача успешно создана', 'success');
            closeTaskFromTemplate();
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            
            // Предложение открыть созданную задачу
            setTimeout(() => {
                if (result.task && confirm('Задача создана. Открыть?')) {
                    openTaskView(result.task.id);
                }
            }, 300);
        } else {
            const error = await response.json();
            console.error('Server error:', error);
            showToast(error.error || 'Ошибка создания задачи', 'error');
        }
    } catch (error) {
        console.error('Create task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}
// Закрытие формы
function closeTaskFromTemplate() {
    closeWindow('base-section-task-from-template');
}



// Инициализация обработчиков формы
function initTaskFromTemplateHandlers() {
    const cancelBtn = document.getElementById('cancelTaskFromTemplateBtn');
    if (cancelBtn) cancelBtn.onclick = closeTaskFromTemplate;
    
    const closeBtn = document.getElementById('closeTaskFromTemplateBtn');
    if (closeBtn) closeBtn.onclick = closeTaskFromTemplate;
    
    const submitBtn = document.getElementById('submitTaskFromTemplateBtn');
    if (submitBtn) submitBtn.onclick = submitTaskFromTemplate;
    
    const googleSubmitBtn = document.getElementById('googleFormSubmitBtn');
    if (googleSubmitBtn) googleSubmitBtn.onclick = submitTaskFromTemplate;
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
    return icons[type] || '';
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


async function loadUsersList() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            window.allUsersList = data.users || [];
            console.log('👥 Users loaded for custom fields:', window.allUsersList.length);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}


// =====================================================
// 13. ЗАГЛУШКИ (ДЛЯ ОТСУТСТВУЮЩИХ API)
// =====================================================
// - loadNotes (заглушка, если нужно)
// Заметки - заглушка

// - loadDashboardStats()
// =====================================================
// ЗАГРУЗКА СТАТИСТИКИ НА ДАШБОРД
// =====================================================

async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
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
        
        // Обновляем счётчики
        const statsTasks = document.getElementById('statsTasks');
        const statsCompleted = document.getElementById('statsCompleted');
        const statsDocs = document.getElementById('statsDocs');
        const statsProcesses = document.getElementById('statsProcesses');
        const statsChats = document.getElementById('statsChats');
        const statsUnread = document.getElementById('statsUnread');
        
        if (statsTasks) statsTasks.textContent = activeTasks.length;
        if (statsCompleted) statsCompleted.textContent = completedTasks.length;
        if (statsDocs) statsDocs.textContent = '0';
        if (statsProcesses) statsProcesses.textContent = '0';
        if (statsChats) statsChats.textContent = chats.length;
        if (statsUnread) statsUnread.textContent = unread;
        
        // Прогресс месяца
        const totalTasks = tasks.length;
        const monthProgress = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
        
        const progressBar = document.getElementById('monthProgressBar');
        const progressValue = document.getElementById('monthProgressValue');
        
        if (progressBar) progressBar.style.width = monthProgress + '%';
        if (progressValue) progressValue.textContent = monthProgress + '%';
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}
// =====================================================
// УВЕДОМЛЕНИЯ
// =====================================================

let currentNotificationFilter = 'all';
let notificationsData = [];

// Иконки по категориям (emoji как fallback, PNG потом)
const NOTIFICATION_ICONS = {
    admin:     '../materials/icons8-администратор-microsoft-96.png',
    task:      '../materials/icons8-задача-90.png',
    document:  '../materials/icons8-документ-100.png',
    deadline:  '../materials/icons8-дедлайн-96.png',
    message:   '../materials/icons8-сообщение-64.png',
    workflow:  '../materials/icons8-обработать-96.png',
    mention:   '../materials/icons8-@-90.png',
    reminder:  '../materials/icons8-уведомление-100.png',
    system:    '../materials/icons8-модуль-90.png',
};

// Загрузка уведомлений
async function loadNotifications() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            notificationsData = data.notifications || [];
            renderNotifications();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Рендер уведомлений
function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    let filtered = notificationsData;
    
    if (currentNotificationFilter !== 'all') {
        filtered = notificationsData.filter(n => n.category === currentNotificationFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-notifications">Нет уведомлений</div>';
        return;
    }
    
    container.innerHTML = filtered.map(notif => {
        const iconSrc = NOTIFICATION_ICONS[notif.category] || NOTIFICATION_ICONS.system;
        const isUnread = !notif.is_read;
        const timeAgo = formatNotificationTime(notif.created_at);
        const priorityBadge = notif.priority === 'critical' || notif.priority === 'high' 
            ? `<span class="notification-priority ${notif.priority}">${notif.priority === 'critical' ? 'Критично' : 'Важно'}</span>` 
            : '';
        
        // Определяем отправителя
        let senderHtml = '';
        if (notif.category === 'admin' && notif.sender_name) {
            senderHtml = `<span class="notification-sender">от ${escapeHtml(notif.sender_name)}</span>`;
        } else if (notif.category === 'task') {
            senderHtml = `<span class="notification-sender">Система</span>`;
        }
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" 
                 data-category="${notif.category}"
                 data-id="${notif.id}"
                 onclick="openNotification(${notif.id})">
                <div class="notification-icon">
                    <img src="${iconSrc}" alt="" loading="lazy">
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <span class="notification-title">${escapeHtml(notif.title || 'Уведомление')}</span>
                        ${priorityBadge}
                    </div>
                    <div class="notification-text">${escapeHtml(notif.content || '')}</div>
                    <div class="notification-footer">
                        ${senderHtml}
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                </div>
                ${isUnread ? '<div class="notification-unread-dot"></div>' : ''}
                <button class="notification-delete" onclick="event.stopPropagation(); deleteNotification(${notif.id})">✕</button>
            </div>
        `;
    }).join('');
}

// Открытие уведомления
async function openNotification(notifId) {
    const notif = notificationsData.find(n => n.id === notifId);
    if (!notif) return;
    
    // Помечаем как прочитанное
    if (!notif.is_read) {
        await markNotificationRead(notifId);
        notif.is_read = true;
        renderNotifications();
        updateUnreadCount();
    }
    
    // Переходим по ссылке
    if (notif.link_type && notif.link_id) {
        switch (notif.link_type) {
            case 'task':
                if (typeof openTaskView === 'function') {
                    openTaskView(notif.link_id);
                } else if (typeof openTaskEdit === 'function') {
                    openTaskEdit(notif.link_id);
                }
                break;
            case 'chat':
                window.location.href = `/html/chat.html?chat=${notif.link_id}`;
                break;
            case 'document':
                showToast('Документ: ' + notif.title, 'info');
                break;
            case 'workflow':
                showToast('Процесс: ' + notif.title, 'info');
                break;
        }
    }
}

// Пометить как прочитанное
async function markNotificationRead(notifId) {
    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/notifications/${notifId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

// Пометить все как прочитанные
async function markAllNotificationsRead() {
    try {
        const token = localStorage.getItem('token');
        await fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        notificationsData.forEach(n => n.is_read = true);
        renderNotifications();
        updateUnreadCount();
        showToast('Все уведомления прочитаны', 'success');
    } catch (error) {
        console.error('Error marking all read:', error);
    }
}

// Удалить уведомление
async function deleteNotification(notifId) {
    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/notifications/${notifId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        notificationsData = notificationsData.filter(n => n.id !== notifId);
        renderNotifications();
        updateUnreadCount();
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

// Переключение фильтра
function toggleNotificationsFilter() {
    const filter = document.getElementById('notificationsFilter');
    if (filter) {
        filter.style.display = filter.style.display === 'none' ? 'flex' : 'none';
    }
}

// Фильтрация уведомлений
function filterNotifications(category) {
    currentNotificationFilter = category;
    
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.category === category);
    });
    
    renderNotifications();
}

// Обновление счётчика непрочитанных
function updateUnreadCount() {
    const unreadCount = notificationsData.filter(n => !n.is_read).length;
    const statsUnread = document.getElementById('statsUnread');
    if (statsUnread) statsUnread.textContent = unreadCount;
}

// Форматирование времени
function formatNotificationTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    if (diff < 172800000) return 'Вчера';
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн назад`;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
// =====================================================
// ЗАГРУЗКА ИНФОРМАЦИИ ОБ ОТДЕЛЕ (ЗАДЕЛ)
// =====================================================

async function loadMyDepartment() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const user = window.currentUser;
        if (!user || !user.department_id) {
            // Нет отдела
            const nameEl = document.getElementById('departmentName');
            if (nameEl) nameEl.textContent = 'Отдел не указан';
            return;
        }
        
        // Загружаем информацию об отделе
        const deptRes = await fetch(`/api/admin/departments/${user.department_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (deptRes.ok) {
            const data = await deptRes.json();
            const dept = data.department;
            
            const nameEl = document.getElementById('departmentName');
            if (nameEl) nameEl.textContent = dept.name || 'Отдел';
            
            const managerEl = document.getElementById('departmentManager');
            if (managerEl && dept.manager_name) {
                managerEl.textContent = `Руководитель: ${dept.manager_name}`;
            }
        }
        
        // Загружаем сотрудников отдела
        const empRes = await fetch(`/api/admin/departments/${user.department_id}/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (empRes.ok) {
            const data = await empRes.json();
            const employees = data.employees || [];
            
            const empCountEl = document.getElementById('departmentEmployeesCount');
            if (empCountEl) empCountEl.textContent = `${employees.length} сотрудников`;
            
            const membersEl = document.getElementById('deptStatsMembers');
            if (membersEl) membersEl.textContent = employees.length;
        }
        
        // Считаем задачи отдела
        const tasksRes = await fetch('/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (tasksRes.ok) {
            const data = await tasksRes.json();
            const allTasks = data.tasks || [];
            // Здесь в будущем можно фильтровать по отделу
            const activeDeptTasks = allTasks.filter(t => t.status !== 'completed');
            
            const activeEl = document.getElementById('deptStatsActive');
            if (activeEl) activeEl.textContent = activeDeptTasks.length;
            
            const overdue = allTasks.filter(t => {
                if (t.status === 'completed' || !t.due_date) return false;
                return new Date(t.due_date) < new Date();
            });
            
            const overdueEl = document.getElementById('deptStatsOverdue');
            if (overdueEl) overdueEl.textContent = overdue.length;
        }
        
    } catch (error) {
        console.error('Error loading department:', error);
    }
}

// =====================================================
// ОТКРЫТИЕ ПОЛНОЙ СТРАНИЦЫ ОТДЕЛА (ЗАДЕЛ)
// =====================================================

function openFullMyDepartment() {
    showToast('Раздел "Мой отдел" в разработке', 'info');
    // В будущем: открытие отдельной секции с полной информацией об отделе
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
    const filterCheckbox = document.getElementById('filterGanttPeriod');
    if (filterCheckbox) {
        filterCheckbox.addEventListener('change', () => {
            renderFullscreenTasks();
        });
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
    initTaskEditorHandlers();
    initTemplateBuilderHandlers();
    initUserSelectorHandlers();
    initTemplatesSection();
    initTaskFromTemplateHandlers();
    
    loadNotes();
    loadDashboardStats();
    loadMyDepartment();
    loadNotifications();
    
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
window.openTaskView = openTaskView;
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
    openWindow('base-section-task-create');
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

// =====================================================
// ЗАГРУЗКА ЗАДАЧ НА ДАШБОРД
// =====================================================

function renderDashboardTasks() {
    const container = document.getElementById('dashboardTasksList');
    if (!container) return;
    
    if (!currentTasks || currentTasks.length === 0) {
        container.innerHTML = '<div class="empty-tasks">Нет активных задач</div>';
        return;
    }
    
    // Фильтруем активные задачи (не завершённые)
    const activeTasks = currentTasks
        .filter(task => task.status !== 'completed')
        .sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        });
        // УБИРАЕМ .slice(0, 5) — показываем все задачи
    
    if (activeTasks.length === 0) {
        container.innerHTML = '<div class="empty-tasks">Нет активных задач ✅</div>';
        return;
    }
    
    // Ограничиваем высоту контейнера для скролла
    container.style.maxHeight = '300px';
    container.style.overflowY = 'auto';
    
    container.innerHTML = activeTasks.map(task => {
        // Определяем статус дедлайна
        let dueClass = 'ok';
        let dueLabel = '✅ В срок';
        if (task.due_date) {
            const daysLeft = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) {
                dueClass = 'overdue';
                dueLabel = '⚠️ Просрочена';
            } else if (daysLeft <= 3) {
                dueClass = 'soon';
                dueLabel = `⏰ ${daysLeft} дн.`;
            } else {
                dueLabel = `📅 ${daysLeft} дн.`;
            }
        }
        
        const priorityLabels = {
            critical: 'Критический',
            high: 'Высокий',
            medium: 'Средний',
            low: 'Низкий'
        };
        
        return `
            <div class="dashboard-task-item" onclick="openTaskView(${task.id})" style="border-left-color: ${getPriorityColor(task.priority)};">
                <div class="task-info">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span>👤 ${task.assignee_name || 'Не назначен'}</span>
                        ${task.progress ? `<span>📊 ${task.progress}%</span>` : ''}
                        ${task.due_date ? `<span>📅 ${dueLabel}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="task-priority-badge ${task.priority || 'medium'}">${priorityLabels[task.priority] || 'Средний'}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Обновляем loadTasks() — добавляем рендер на дашборд
async function loadTasks() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentTasks = data.tasks || [];
            console.log('✅ Loaded', currentTasks.length, 'tasks');
            
            // Обновляем все места, где отображаются задачи
            renderDashboardTasks(); // ← НОВОЕ
            renderFullscreenTasks();
            
            const calendarSection = document.getElementById('base-section-calendar');
            if (calendarSection && calendarSection.style.display === 'block') {
                renderGantt();
            }
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}
// =====================================================
// ТАБЛИЦЫ ЗАДАЧ - ЗАГРУЗКА ДАННЫХ
// =====================================================

// Загрузка недавних задач (последние 10)
async function loadRecentTasks() {
    const tbody = document.getElementById('recentTasksBody');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks?limit=10&offset=0', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tasks = data.tasks || [];
            renderTasksTable(tbody, tasks, 'recent');
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Ошибка загрузки</td></tr>';
        }
    } catch (error) {
        console.error('Error loading recent tasks:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Ошибка загрузки</td></tr>';
    }
}

// Загрузка задач в работе
async function loadActiveTasks() {
    const tbody = document.getElementById('activeTasksBody');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks?status=pending,in_progress', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tasks = data.tasks || [];
            renderTasksTable(tbody, tasks, 'active');
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Ошибка загрузки</td></tr>';
        }
    } catch (error) {
        console.error('Error loading active tasks:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Ошибка загрузки</td></tr>';
    }
}

// Загрузка архивных задач (выполненные + отменённые)
async function loadArchivedTasks() {
    const tbody = document.getElementById('archivedTasksBody');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks?status=completed,cancelled', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tasks = data.tasks || [];
            renderTasksTable(tbody, tasks, 'archived');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Ошибка загрузки</td></tr>';
        }
    } catch (error) {
        console.error('Error loading archived tasks:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Ошибка загрузки</td></tr>';
    }
}

// Отрисовка таблицы задач
function renderTasksTable(tbody, tasks, mode) {
    if (!tasks || tasks.length === 0) {
        const cols = mode === 'archived' ? 7 : 8;
        tbody.innerHTML = `<tr><td colspan="${cols}" class="loading-row">📭 Нет задач</td></tr>`;
        return;
    }
    
    const priorityLabels = {
        critical: 'Критический',
        high: 'Высокий',
        medium: 'Средний',
        low: 'Низкий'
    };
    
    const priorityClasses = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low'
    };
    
    const statusLabels = {
        pending: 'Ожидает',
        in_progress: 'В работе',
        completed: 'Выполнена',
        cancelled: 'Отменена'
    };
    
    const statusClasses = {
        pending: 'pending',
        in_progress: 'in_progress',
        completed: 'completed',
        cancelled: 'cancelled'
    };
    
    tbody.innerHTML = tasks.map(task => {
        const priorityLabel = priorityLabels[task.priority] || 'Средний';
        const priorityClass = priorityClasses[task.priority] || 'medium';
        const statusLabel = statusLabels[task.status] || 'Неизвестно';
        const statusClass = statusClasses[task.status] || 'pending';
        
        // Форматируем даты
        const startDate = task.start_date ? new Date(task.start_date).toLocaleDateString('ru-RU') : '—';
        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : '—';
        const completedDate = task.completed_at ? new Date(task.completed_at).toLocaleDateString('ru-RU') : '—';
        
        // Имена
        const assignee = task.assignee_surname ? `${task.assignee_surname} ${task.assignee_name}`.trim() : 'Не назначен';
        const creator = task.creator_surname ? `${task.creator_surname} ${task.creator_name}`.trim() : '—';
        
        // Прогресс
        const progress = task.progress || 0;
        
        let row = '';
        if (mode === 'archived') {
            row = `
                <tr onclick="openTaskView(${task.id})">
                    <td>#${task.id}</td>
                    <td><strong>${escapeHtml(task.title)}</strong></td>
                    <td><span class="priority-badge ${priorityClass}">${priorityLabel}</span></td>
                    <td>${escapeHtml(assignee)}</td>
                    <td>${escapeHtml(creator)}</td>
                    <td>${completedDate}</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                </tr>
            `;
        } else {
            row = `
                <tr onclick="openTaskView(${task.id})">
                    <td>#${task.id}</td>
                    <td><strong>${escapeHtml(task.title)}</strong></td>
                    <td><span class="priority-badge ${priorityClass}">${priorityLabel}</span></td>
                    <td>${escapeHtml(assignee)}</td>
                    <td>${escapeHtml(creator)}</td>
                    <td>${startDate}</td>
                    <td>${dueDate}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%;"></div>
                            </div>
                            <span class="progress-text">${progress}%</span>
                        </div>
                    </td>
                </tr>
            `;
        }
        return row;
    }).join('');
}
// =====================================================
// СОРТИРОВКА И ПОИСК В ТАБЛИЦАХ
// =====================================================

// Хранилище данных таблиц
const tableData = {
    recent: { tasks: [], sort: { field: null, direction: null } },
    active: { tasks: [], sort: { field: null, direction: null } },
    archived: { tasks: [], sort: { field: null, direction: null } }
};

// Сортировка таблицы
function sortTasks(mode, field) {
    const data = tableData[mode];
    if (!data || !data.tasks) return;
    
    // Определяем направление сортировки
    if (data.sort.field === field) {
        // Третий клик — отмена сортировки
        if (data.sort.direction === 'desc') {
            data.sort.field = null;
            data.sort.direction = null;
            renderTasksTableWithSort(mode, data.tasks);
            updateSortIcons(mode, null, null);
            return;
        }
        // Второй клик — убывание
        data.sort.direction = 'desc';
    } else {
        // Первый клик — возрастание
        data.sort.field = field;
        data.sort.direction = 'asc';
    }
    
    // Сортируем данные
    const sorted = [...data.tasks];
    sorted.sort((a, b) => {
        let valA = getFieldValue(a, field);
        let valB = getFieldValue(b, field);
        
        // Для строк — сравнение без учёта регистра
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        // Для чисел и дат
        if (valA === valB) return 0;
        if (data.sort.direction === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });
    
    renderTasksTableWithSort(mode, sorted);
    updateSortIcons(mode, field, data.sort.direction);
}

// Получение значения поля для сортировки
function getFieldValue(task, field) {
    switch(field) {
        case 'id': return task.id;
        case 'title': return task.title || '';
        case 'priority': {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return order[task.priority] ?? 999;
        }
        case 'assignee': return task.assignee_surname ? `${task.assignee_surname} ${task.assignee_name}`.trim() : '';
        case 'creator': return task.creator_surname ? `${task.creator_surname} ${task.creator_name}`.trim() : '';
        case 'start_date': return task.start_date || '';
        case 'due_date': return task.due_date || '';
        case 'completed_at': return task.completed_at || '';
        case 'progress': return task.progress || 0;
        case 'status': return task.status || '';
        default: return '';
    }
}

// Обновление иконок сортировки
function updateSortIcons(mode, field, direction) {
    const table = document.getElementById(`${mode}TasksTable`);
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    headers.forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (!icon) return;
        const thField = th.dataset.sort;
        if (thField === field && direction) {
            icon.className = 'sort-icon ' + direction;
        } else {
            icon.className = 'sort-icon none';
        }
    });
}

// Отрисовка таблицы с учётом сортировки
function renderTasksTableWithSort(mode, tasks) {
    const tbody = document.getElementById(`${mode}TasksBody`);
    if (!tbody) return;
    
    const modeMap = {
        recent: { cols: 8, label: 'recent' },
        active: { cols: 8, label: 'active' },
        archived: { cols: 7, label: 'archived' }
    };
    
    const config = modeMap[mode];
    if (!config) return;
    
    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${config.cols}" class="loading-row">📭 Нет задач</td></tr>`;
        return;
    }
    
    // Сохраняем данные для сортировки
    tableData[mode].tasks = tasks;
    
    // Отрисовываем
    const priorityLabels = {
        critical: 'Критический',
        high: 'Высокий',
        medium: 'Средний',
        low: 'Низкий'
    };
    
    const priorityClasses = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low'
    };
    
    const statusLabels = {
        pending: 'Ожидает',
        in_progress: 'В работе',
        completed: 'Выполнена',
        cancelled: 'Отменена'
    };
    
    const statusClasses = {
        pending: 'pending',
        in_progress: 'in_progress',
        completed: 'completed',
        cancelled: 'cancelled'
    };
    
    tbody.innerHTML = tasks.map(task => {
        const priorityLabel = priorityLabels[task.priority] || 'Средний';
        const priorityClass = priorityClasses[task.priority] || 'medium';
        const statusLabel = statusLabels[task.status] || 'Неизвестно';
        const statusClass = statusClasses[task.status] || 'pending';
        
        const startDate = task.start_date ? new Date(task.start_date).toLocaleDateString('ru-RU') : '—';
        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : '—';
        const completedDate = task.completed_at ? new Date(task.completed_at).toLocaleDateString('ru-RU') : '—';
        
        const assignee = task.assignee_surname ? `${task.assignee_surname} ${task.assignee_name}`.trim() : 'Не назначен';
        const creator = task.creator_surname ? `${task.creator_surname} ${task.creator_name}`.trim() : '—';
        
        const progress = task.progress || 0;
        
        let row = '';
        if (mode === 'archived') {
            row = `
                <tr onclick="openTaskView(${task.id})">
                    <td>#${task.id}</td>
                    <td><strong>${escapeHtml(task.title)}</strong></td>
                    <td><span class="priority-badge ${priorityClass}">${priorityLabel}</span></td>
                    <td>${escapeHtml(assignee)}</td>
                    <td>${escapeHtml(creator)}</td>
                    <td>${completedDate}</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                </tr>
            `;
        } else {
            row = `
                <tr onclick="openTaskView(${task.id})">
                    <td>#${task.id}</td>
                    <td><strong>${escapeHtml(task.title)}</strong></td>
                    <td><span class="priority-badge ${priorityClass}">${priorityLabel}</span></td>
                    <td>${escapeHtml(assignee)}</td>
                    <td>${escapeHtml(creator)}</td>
                    <td>${startDate}</td>
                    <td>${dueDate}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%;"></div>
                            </div>
                            <span class="progress-text">${progress}%</span>
                        </div>
                    </td>
                </tr>
            `;
        }
        return row;
    }).join('');
}

// Поиск по таблице
function filterTasks(mode) {
    const searchInput = document.getElementById(`${mode}TasksSearch`);
    if (!searchInput) return;
    
    const searchText = searchInput.value.toLowerCase().trim();
    
    // Получаем ИСХОДНЫЕ данные, а не уже отфильтрованные
    const data = tableData[mode];
    if (!data || !data.originalTasks) {
        // Если originalTasks нет — используем tasks
        const tasks = data?.tasks || [];
        data.originalTasks = [...tasks];
    }
    
    // Берём всегда исходные данные
    const allTasks = data.originalTasks || data.tasks || [];
    let filtered = allTasks;
    
    // Если есть текст поиска — фильтруем
    if (searchText) {
        filtered = allTasks.filter(task => {
            const title = (task.title || '').toLowerCase();
            const assignee = (task.assignee_surname ? `${task.assignee_surname} ${task.assignee_name}` : '').toLowerCase();
            const creator = (task.creator_surname ? `${task.creator_surname} ${task.creator_name}` : '').toLowerCase();
            const id = String(task.id);
            const status = (task.status || '').toLowerCase();
            
            return title.includes(searchText) || 
                   assignee.includes(searchText) || 
                   creator.includes(searchText) || 
                   id.includes(searchText) ||
                   status.includes(searchText);
        });
    }
    
    // Применяем текущую сортировку
    const sort = data.sort;
    if (sort.field && sort.direction) {
        filtered.sort((a, b) => {
            let valA = getFieldValue(a, sort.field);
            let valB = getFieldValue(b, sort.field);
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA === valB) return 0;
            if (sort.direction === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });
    }
    
    renderTasksTableWithSort(mode, filtered);
}

// Очистка поиска
function clearSearch(mode) {
    const searchInput = document.getElementById(`${mode}TasksSearch`);
    if (!searchInput) return;
    
    searchInput.value = '';
    filterTasks(mode);
    searchInput.focus();
}

// Обновляем функции загрузки — сохраняем данные
async function loadRecentTasks() {
    const tbody = document.getElementById('recentTasksBody');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks?limit=50&offset=0', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tasks = data.tasks || [];
            
            // Сохраняем ИСХОДНЫЕ данные
            tableData.recent.originalTasks = [...tasks];
            tableData.recent.tasks = tasks;
            tableData.recent.sort = { field: null, direction: null };
            
            renderTasksTableWithSort('recent', tasks);
            updateSortIcons('recent', null, null);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Ошибка загрузки</td></tr>';
        }
    } catch (error) {
        console.error('Error loading recent tasks:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Ошибка загрузки</td></tr>';
    }
}

// Аналогично для loadActiveTasks и loadArchivedTasks

async function loadActiveTasks() {
    const tbody = document.getElementById('activeTasksBody');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks?status=pending,in_progress', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tasks = data.tasks || [];
            tableData.active.tasks = tasks;
            tableData.active.sort = { field: null, direction: null };
            renderTasksTableWithSort('active', tasks);
            updateSortIcons('active', null, null);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Ошибка загрузки</td></tr>';
        }
    } catch (error) {
        console.error('Error loading active tasks:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Ошибка загрузки</td></tr>';
    }
}

async function loadArchivedTasks() {
    const tbody = document.getElementById('archivedTasksBody');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks?status=completed,cancelled', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tasks = data.tasks || [];
            tableData.archived.tasks = tasks;
            tableData.archived.sort = { field: null, direction: null };
            renderTasksTableWithSort('archived', tasks);
            updateSortIcons('archived', null, null);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Ошибка загрузки</td></tr>';
        }
    } catch (error) {
        console.error('Error loading archived tasks:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Ошибка загрузки</td></tr>';
    }
}

// Экспортируем функции
window.sortTasks = sortTasks;
window.filterTasks = filterTasks;

// =====================================================
// СОЗДАНИЕ ЗАДАЧИ (ПОЛНОЭКРАННАЯ СЕКЦИЯ)
// =====================================================

let createTaskData = {
    assigneeId: null,
    observerIds: [],
    templateId: null,
    templateData: null
};

function openTaskCreate() {
    renderSimpleTaskForm();
    
    const formTitle = document.getElementById('googleFormTitle');
    if (formTitle) formTitle.textContent = 'Новая задача';
    
    const formDesc = document.getElementById('googleFormDescription');
    if (formDesc) formDesc.textContent = 'Заполните форму для создания задачи';
    
    const badge = document.getElementById('templateFormBadge');
    if (badge) badge.textContent = 'Обычная задача';
    
    openWindow('base-section-task-create');
}

function fillFromTemplate(templateData) {
    const data = templateData.template_data || {};
    
    // Приоритет
    if (data.defaultPriority) {
        document.getElementById('taskCreatePriority').value = data.defaultPriority;
    }
    
    // Срок выполнения
    if (data.defaultDeadlineDays) {
        const date = new Date();
        date.setDate(date.getDate() + data.defaultDeadlineDays);
        document.getElementById('taskCreateDueDate').value = date.toISOString().slice(0, 10);
    }
    
    // Кастомные поля
    if (data.fields && data.fields.length > 0) {
        renderCustomFieldsForCreate(data.fields);
    }
}

function renderCustomFieldsForCreate(fields) {
    const container = document.getElementById('taskCreateCustomFieldsContainer');
    const section = document.getElementById('taskCreateCustomFields');
    
    if (!container || !section) return;
    
    section.style.display = 'block';
    container.innerHTML = fields.map(field => {
        let inputHtml = '';
        const fieldId = `custom_${field.key}`;
        
        switch (field.type) {
            case 'text':
                inputHtml = `<input type="text" id="${fieldId}" class="task-input" placeholder="${escapeHtml(field.placeholder || '')}">`;
                break;
            case 'textarea':
                inputHtml = `<textarea id="${fieldId}" class="task-textarea" rows="2" placeholder="${escapeHtml(field.placeholder || '')}"></textarea>`;
                break;
            case 'number':
                inputHtml = `<input type="number" id="${fieldId}" class="task-input" placeholder="${escapeHtml(field.placeholder || '0')}">`;
                break;
            case 'date':
                inputHtml = `<input type="date" id="${fieldId}" class="task-input">`;
                break;
            case 'select':
                inputHtml = `
                    <select id="${fieldId}" class="task-select">
                        <option value="">${escapeHtml(field.placeholder || 'Выберите вариант')}</option>
                        ${(field.options || []).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
                    </select>
                `;
                break;
            case 'checkbox':
                inputHtml = `
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer;">
                        <input type="checkbox" id="${fieldId}"> ${escapeHtml(field.label)}
                    </label>
                `;
                break;
            case 'user':
                inputHtml = `
                    <div style="display: flex; gap: 6px;">
                        <input type="text" id="${fieldId}_display" class="task-input" placeholder="Выберите пользователя..." readonly style="flex: 1; cursor: pointer;">
                        <button class="btn-primary" onclick="openUserSelectorForCustom('${fieldId}')" style="padding: 4px 12px; font-size: 12px;">👤</button>
                    </div>
                    <input type="hidden" id="${fieldId}" value="">
                `;
                break;
            default:
                inputHtml = `<input type="text" id="${fieldId}" class="task-input" placeholder="${escapeHtml(field.placeholder || '')}">`;
        }
        
        return `
            <div class="task-prop" style="grid-column: span 1;">
                <label>${escapeHtml(field.label)}${field.required ? ' <span style="color: red;">*</span>' : ''}</label>
                ${inputHtml}
            </div>
        `;
    }).join('');
}
function renderViewCustomFields(task) {
    const container = document.getElementById('taskViewCustomFieldsContainer');
    const section = document.getElementById('taskViewCustomFields');
    
    if (!container || !section) return;
    
    const customFields = task.custom_fields || {};
    const keys = Object.keys(customFields);
    
    if (keys.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    // Собираем все ID пользователей из кастомных полей
    const userIds = new Set();
    keys.forEach(key => {
        const value = customFields[key];
        // Если значение — строка с числом (ID)
        if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
            userIds.add(parseInt(value));
        }
        // Если массив чисел
        if (Array.isArray(value)) {
            value.forEach(id => {
                if (!isNaN(id)) userIds.add(parseInt(id));
            });
        }
    });
    
    // Если есть пользователи — загружаем их
    if (userIds.size > 0) {
        loadUsersByIds(Array.from(userIds), (usersMap) => {
            renderCustomFieldsWithUsers(container, keys, customFields, usersMap);
        });
    } else {
        renderCustomFieldsWithUsers(container, keys, customFields, {});
    }
}
function renderCustomFieldsWithUsers(container, customFields, usersMap) {
    const keys = Object.keys(customFields);
    
    console.log('🔍 Rendering custom fields with users:', customFields);
    console.log('👤 Users map:', usersMap);
    
    if (keys.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = keys.map(key => {
        const field = customFields[key];
        let displayValue = '—';
        let label = key;
        
        console.log(`🔍 Field ${key}:`, field);
        
        // Если поле — объект с типом (новая структура)
        if (field && typeof field === 'object' && field.type) {
            label = field.label || key;
            const value = field.value;
            
            switch (field.type) {
                case 'user':
                    // Для пользователей — подставляем имя
                    if (value && !isNaN(value)) {
                        const userId = parseInt(value);
                        displayValue = usersMap[userId] || value;
                        console.log(`👤 User ${userId} -> ${displayValue}`);
                    } else {
                        displayValue = value || '—';
                    }
                    break;
                case 'multi-user':
                    // Для множественного выбора пользователей
                    if (Array.isArray(value) && value.length > 0) {
                        displayValue = value.map(id => {
                            const name = usersMap[parseInt(id)];
                            return name || id;
                        }).join(', ');
                        console.log(`👥 Multi-user ${value} -> ${displayValue}`);
                    } else {
                        displayValue = value || '—';
                    }
                    break;
                case 'date':
                    if (value) {
                        const date = new Date(value);
                        displayValue = date.toLocaleDateString('ru-RU');
                    }
                    break;
                case 'checkbox':
                    displayValue = value ? 'Да' : 'Нет';
                    break;
                case 'number':
                    displayValue = value !== null && value !== undefined ? value : '—';
                    break;
                default:
                    displayValue = value || '—';
            }
        } else {
            // Старый формат (просто значение)
            label = key.replace(/^custom_/, '').replace(/_/g, ' ');
            displayValue = field || '—';
        }
        
        // Если displayValue всё ещё ID и есть usersMap — пробуем подставить
        if (typeof displayValue === 'string' && !isNaN(displayValue) && usersMap[parseInt(displayValue)]) {
            displayValue = usersMap[parseInt(displayValue)];
        }
        
        return `
            <div class="task-view-prop">
                <span class="prop-label">${escapeHtml(label)}</span>
                <span class="prop-value">${escapeHtml(String(displayValue))}</span>
            </div>
        `;
    }).join('');
}
// =====================================================
// ВЫБОР ПОЛЬЗОВАТЕЛЕЙ ДЛЯ СОЗДАНИЯ
// =====================================================

function openUserSelectorForCreate(type) {
    const isMultiple = type === 'observers';
    const preselected = isMultiple ? createTaskData.observerIds : (createTaskData.assigneeId ? [createTaskData.assigneeId] : []);
    
    openUserSelector({
        mode: isMultiple ? 'multiple' : 'single',
        preselectedIds: preselected,
        title: isMultiple ? 'Выберите наблюдателей' : 'Выберите исполнителя',
        onConfirm: (users, userIds) => {
            if (isMultiple) {
                createTaskData.observerIds = userIds;
                updateObserversDisplay(users);
            } else {
                if (users && users.length > 0) {
                    const user = users[0];
                    createTaskData.assigneeId = user.id;
                    document.getElementById('taskCreateAssigneeDisplay').value = `${user.surname || ''} ${user.name || ''}`.trim();
                    document.getElementById('taskCreateAssigneeId').value = user.id;
                }
            }
        }
    });
}

function updateObserversDisplay(users) {
    const display = document.getElementById('taskCreateObserversDisplay');
    const tagsContainer = document.getElementById('taskCreateObserversTags');
    const idsInput = document.getElementById('taskCreateObserversIds');
    
    if (!display || !tagsContainer) return;
    
    // Обновляем отображение
    if (users && users.length > 0) {
        display.value = users.map(u => `${u.surname || ''} ${u.name || ''}`.trim()).join(', ');
    } else {
        display.value = '';
    }
    
    // Обновляем теги
    tagsContainer.innerHTML = (users || []).map(user => `
        <span class="task-observer-tag">
            ${escapeHtml(`${user.surname || ''} ${user.name || ''}`.trim())}
            <button class="remove-tag" onclick="removeObserver(${user.id})">✕</button>
        </span>
    `).join('');
    
    // Обновляем скрытое поле
    idsInput.value = (users || []).map(u => u.id).join(',');
}

function removeObserver(userId) {
    createTaskData.observerIds = createTaskData.observerIds.filter(id => id !== userId);
    
    // Получаем обновлённый список пользователей
    const userList = createTaskData.observerIds.map(id => {
        // Ищем пользователя в глобальном списке
        const user = window.allUsersList?.find(u => u.id === id);
        return user || { id, surname: 'Пользователь', name: String(id) };
    });
    
    updateObserversDisplay(userList);
}

function openUserSelectorForCustom(fieldId) {
    openUserSelector({
        mode: 'single',
        title: 'Выберите пользователя',
        onConfirm: (users) => {
            if (users && users.length > 0) {
                const user = users[0];
                document.getElementById(`${fieldId}_display`).value = `${user.surname || ''} ${user.name || ''}`.trim();
                document.getElementById(fieldId).value = user.id;
            }
        }
    });
}

// =====================================================
// ОТПРАВКА ЗАДАЧИ
// =====================================================

async function submitTaskCreate() {
    const title = document.getElementById('taskCreateTitle').value.trim();
    const description = document.getElementById('taskCreateDescription').value;
    const startDate = document.getElementById('taskCreateStartDate').value;
    const dueDate = document.getElementById('taskCreateDueDate').value;
    const priority = document.getElementById('taskCreatePriority').value;
    const assigneeId = createTaskData.assigneeId;
    const observerIds = createTaskData.observerIds;
    
    // Валидация
    if (!title) {
        showToast('Введите название задачи', 'error');
        document.getElementById('taskCreateTitle').focus();
        return;
    }
    
    if (!dueDate) {
        showToast('Укажите срок выполнения', 'error');
        document.getElementById('taskCreateDueDate').focus();
        return;
    }
    
    if (!assigneeId) {
        showToast('Выберите исполнителя', 'error');
        return;
    }
    
    // Собираем кастомные поля
    const customFields = {};
    const customInputs = document.querySelectorAll('#taskCreateCustomFieldsContainer .task-prop');
    customInputs.forEach(prop => {
        const input = prop.querySelector('input, textarea, select');
        const label = prop.querySelector('label')?.textContent?.trim() || '';
        if (input) {
            const key = input.id;
            if (input.type === 'checkbox') {
                customFields[key] = input.checked;
            } else if (input.type === 'hidden') {
                // Для пользователей уже есть display поле
            } else {
                customFields[key] = input.value;
            }
        }
    });
    
    const taskData = {
        title: title,
        description: description || '',
        startDate: startDate || null,
        dueDate: dueDate || null,
        priority: priority || 'medium',
        assignedTo: parseInt(assigneeId),
        observers: observerIds.map(id => parseInt(id)),
        customFields: customFields,
        templateId: createTaskData.templateId
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
            const data = await response.json();
            showToast('✅ Задача создана', 'success');
            closeTaskCreate();
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            
            // Предложение открыть созданную задачу
            setTimeout(() => {
                if (data.task && confirm('Задача создана. Открыть?')) {
                    openTaskEdit(data.task.id);
                }
            }, 300);
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка создания', 'error');
        }
    } catch (error) {
        console.error('Create task error:', error);
        showToast('Ошибка сервера', 'error');
    }
}

function closeTaskCreate() {
    closeWindow('base-section-task-create');
    // Возвращаемся к дашборду
    openWindow('base-section-dashboard');
}


// =====================================================
// УНИВЕРСАЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАДАЧАМИ
// =====================================================

// ----- ОТКРЫТИЕ / ЗАКРЫТИЕ СОЗДАНИЯ -----
// Открытие создания обычной задачи (без шаблона)
function openTaskCreate() {
    // Очищаем форму — используем ID из Google Forms стиля
    const titleInput = document.getElementById('form_field_title');
    if (titleInput) titleInput.value = '';
    
    const descInput = document.getElementById('form_field_description');
    if (descInput) descInput.value = '';
    
    const prioritySelect = document.getElementById('form_field_priority');
    if (prioritySelect) prioritySelect.value = 'medium';
    
    const startDateInput = document.getElementById('form_field_start_date');
    if (startDateInput) startDateInput.value = '';
    
    const dueDateInput = document.getElementById('form_field_due_date');
    if (dueDateInput) dueDateInput.value = '';
    
    // Очищаем выбор пользователей
    const assigneeInput = document.getElementById('form_field_assignee');
    if (assigneeInput) assigneeInput.value = '';
    
    const observersInput = document.getElementById('form_field_observers');
    if (observersInput) observersInput.value = '';
    
    // Очищаем отображение выбранных пользователей
    const assigneeDisplay = document.getElementById('selected_assignee');
    if (assigneeDisplay) assigneeDisplay.innerHTML = '<span class="empty-hint">Не выбран</span>';
    
    const observersDisplay = document.getElementById('selected_observers');
    if (observersDisplay) observersDisplay.innerHTML = '<span class="empty-hint">Не выбраны</span>';
    
    // Скрываем кастомные поля
    const customSection = document.getElementById('taskCreateCustomFields');
    if (customSection) customSection.style.display = 'none';
    
    const customContainer = document.getElementById('taskCreateCustomFieldsContainer');
    if (customContainer) customContainer.innerHTML = '';
    
    // Обновляем заголовок
    const formTitle = document.getElementById('googleFormTitle');
    if (formTitle) formTitle.textContent = 'Новая задача';
    
    const formDesc = document.getElementById('googleFormDescription');
    if (formDesc) formDesc.textContent = 'Заполните форму для создания задачи';
    
    const badge = document.getElementById('templateFormBadge');
    if (badge) badge.textContent = 'Обычная задача';
    
    // Открываем секцию
    openWindow('base-section-task-create');
}

function closeTaskCreate() {
    closeWindow('base-section-task-create');
    openWindow('base-section-dashboard');
}

function fillCreateFromTemplate(templateData) {
    const data = templateData.template_data || {};
    
    if (data.defaultPriority) {
        document.getElementById('taskCreatePriority').value = data.defaultPriority;
    }
    
    if (data.defaultDeadlineDays) {
        const date = new Date();
        date.setDate(date.getDate() + data.defaultDeadlineDays);
        document.getElementById('taskCreateDueDate').value = date.toISOString().slice(0, 10);
    }
    
    if (data.fields && data.fields.length > 0) {
        renderCreateCustomFields(data.fields);
    }
}

function renderCreateCustomFields(fields) {
    const container = document.getElementById('taskCreateCustomFieldsContainer');
    const section = document.getElementById('taskCreateCustomFields');
    
    if (!container || !section) return;
    
    // Если полей нет — скрываем секцию
    if (!fields || fields.length === 0) {
        section.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    section.style.display = 'block';
    
    container.innerHTML = fields.map((field, index) => {
        const fieldId = `custom_${field.key || index}`;
        const fieldType = field.type || 'text';
        const fieldLabel = field.label || field.key || 'Поле';
        const isRequired = field.required || false;
        const placeholder = field.placeholder || '';
        const defaultValue = field.defaultValue || '';
        const options = field.options || [];
        
        let inputHtml = '';
        
        switch (fieldType) {
            case 'text':
                inputHtml = `
                    <input type="text" 
                           id="${fieldId}" 
                           class="task-input" 
                           placeholder="${escapeHtml(placeholder)}" 
                           value="${escapeHtml(defaultValue)}"
                           data-field-type="text" 
                           data-field-label="${escapeHtml(fieldLabel)}">
                `;
                break;
                
            case 'textarea':
                inputHtml = `
                    <textarea id="${fieldId}" 
                              class="task-textarea" 
                              rows="3" 
                              placeholder="${escapeHtml(placeholder)}"
                              data-field-type="textarea" 
                              data-field-label="${escapeHtml(fieldLabel)}">${escapeHtml(defaultValue)}</textarea>
                `;
                break;
                
            case 'number':
                inputHtml = `
                    <input type="number" 
                           id="${fieldId}" 
                           class="task-input" 
                           placeholder="${escapeHtml(placeholder)}" 
                           value="${defaultValue}"
                           data-field-type="number" 
                           data-field-label="${escapeHtml(fieldLabel)}">
                `;
                break;
                
            case 'date':
                inputHtml = `
                    <input type="date" 
                           id="${fieldId}" 
                           class="task-input" 
                           value="${defaultValue}"
                           data-field-type="date" 
                           data-field-label="${escapeHtml(fieldLabel)}">
                `;
                break;
                
            case 'select':
                const optionsHtml = options.map(opt => 
                    `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`
                ).join('');
                inputHtml = `
                    <select id="${fieldId}" 
                            class="task-select" 
                            data-field-type="select" 
                            data-field-label="${escapeHtml(fieldLabel)}">
                        <option value="">${escapeHtml(placeholder || 'Выберите вариант')}</option>
                        ${optionsHtml}
                    </select>
                `;
                break;
                
            case 'checkbox':
                inputHtml = `
                    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
                        <input type="checkbox" 
                               id="${fieldId}" 
                               ${defaultValue === true || defaultValue === 'true' ? 'checked' : ''}
                               data-field-type="checkbox" 
                               data-field-label="${escapeHtml(fieldLabel)}">
                        ${escapeHtml(fieldLabel)}
                    </label>
                `;
                break;
                
            case 'user':
                inputHtml = `
                    <div class="task-user-select">
                        <input type="text" 
                               id="${fieldId}_display" 
                               class="task-input" 
                               placeholder="Выберите пользователя" 
                               readonly
                               data-field-type="user" 
                               data-field-label="${escapeHtml(fieldLabel)}">
                        <button class="btn-select" 
                                onclick="openUserSelectorForCustom('${fieldId}')" 
                                type="button"
                                title="Выбрать пользователя">
                            👤
                        </button>
                    </div>
                    <input type="hidden" 
                           id="${fieldId}" 
                           value=""
                           data-field-type="user" 
                           data-field-label="${escapeHtml(fieldLabel)}">
                `;
                break;
                
            case 'multi-user':
                inputHtml = `
                    <div class="task-user-select">
                        <input type="text" 
                               id="${fieldId}_display" 
                               class="task-input" 
                               placeholder="Выберите пользователей" 
                               readonly
                               data-field-type="multi-user" 
                               data-field-label="${escapeHtml(fieldLabel)}">
                        <button class="btn-select" 
                                onclick="openUserSelectorForCustomMulti('${fieldId}')" 
                                type="button"
                                title="Выбрать пользователей">
                            👥
                        </button>
                    </div>
                    <input type="hidden" 
                           id="${fieldId}" 
                           value=""
                           data-field-type="multi-user" 
                           data-field-label="${escapeHtml(fieldLabel)}">
                    <div id="${fieldId}_tags" class="task-tags" style="margin-top: 4px;"></div>
                `;
                break;
                
            default:
                inputHtml = `
                    <input type="text" 
                           id="${fieldId}" 
                           class="task-input" 
                           placeholder="${escapeHtml(placeholder)}" 
                           value="${escapeHtml(defaultValue)}"
                           data-field-type="text" 
                           data-field-label="${escapeHtml(fieldLabel)}">
                `;
        }
        
        return `
            <div class="task-field" data-field-key="${field.key || index}">
                <label>
                    ${escapeHtml(fieldLabel)}
                    ${isRequired ? ' <span style="color: #dc3545;">*</span>' : ''}
                </label>
                ${inputHtml}
            </div>
        `;
    }).join('');
}
// Функция для выбора нескольких пользователей (multi-user)
function openUserSelectorForCustomMulti(fieldId) {
    // Получаем текущие выбранные ID
    const hiddenInput = document.getElementById(fieldId);
    const currentIds = hiddenInput.value ? hiddenInput.value.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
    
    openUserSelector({
        mode: 'multiple',
        preselectedIds: currentIds,
        title: 'Выберите пользователей',
        onConfirm: (users, userIds) => {
            // Обновляем скрытое поле
            if (hiddenInput) {
                hiddenInput.value = userIds.join(',');
            }
            
            // Обновляем отображение
            const displayInput = document.getElementById(`${fieldId}_display`);
            if (displayInput) {
                displayInput.value = users.map(u => `${u.surname || ''} ${u.name || ''}`.trim()).join(', ');
            }
            
            // Обновляем теги
            const tagsContainer = document.getElementById(`${fieldId}_tags`);
            if (tagsContainer) {
                if (users.length === 0) {
                    tagsContainer.innerHTML = '';
                    return;
                }
                tagsContainer.innerHTML = users.map(u => `
                    <span class="task-tag">
                        ${escapeHtml(`${u.surname || ''} ${u.name || ''}`.trim())}
                        <button class="tag-remove" onclick="removeCustomUserTag('${fieldId}', ${u.id})">✕</button>
                    </span>
                `).join('');
            }
        }
    });
}

// Удаление тега пользователя
function removeCustomUserTag(fieldId, userId) {
    const hiddenInput = document.getElementById(fieldId);
    if (!hiddenInput) return;
    
    const currentIds = hiddenInput.value ? hiddenInput.value.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
    const newIds = currentIds.filter(id => id !== userId);
    hiddenInput.value = newIds.join(',');
    
    // Обновляем отображение
    const displayInput = document.getElementById(`${fieldId}_display`);
    if (displayInput) {
        // Получаем имена оставшихся пользователей
        const remainingUsers = newIds.map(id => {
            // Ищем пользователя в глобальном списке или возвращаем ID
            const user = window.allUsersList?.find(u => u.id === id);
            return user ? `${user.surname || ''} ${user.name || ''}`.trim() : id;
        });
        displayInput.value = remainingUsers.join(', ');
    }
    
    // Обновляем теги
    const tagsContainer = document.getElementById(`${fieldId}_tags`);
    if (tagsContainer) {
        if (newIds.length === 0) {
            tagsContainer.innerHTML = '';
            return;
        }
        // Перезагружаем данные пользователей
        if (newIds.length > 0) {
            loadUsersByIds(newIds, (usersMap) => {
                const users = newIds.map(id => ({
                    id: id,
                    name: usersMap[id] || id
                }));
                tagsContainer.innerHTML = users.map(u => `
                    <span class="task-tag">
                        ${escapeHtml(String(u.name))}
                        <button class="tag-remove" onclick="removeCustomUserTag('${fieldId}', ${u.id})">✕</button>
                    </span>
                `).join('');
            });
        }
    }
}
// ----- ОТКРЫТИЕ / ЗАКРЫТИЕ РЕДАКТИРОВАНИЯ -----
function openTaskEdit(taskId) {
    document.getElementById('taskEditTitle').value = 'Загрузка...';
    document.getElementById('taskEditTitle').disabled = true;
    openWindow('base-section-task-edit');
    
    fetchTaskForEdit(taskId);
}

function closeTaskEdit() {
    closeWindow('base-section-task-edit');
    openWindow('base-section-dashboard');
}

async function fetchTaskForEdit(taskId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load task');
        
        const data = await response.json();
        const task = data.task;
        
        // Обновляем в локальном массиве
        const index = currentTasks.findIndex(t => t.id === taskId);
        if (index !== -1) currentTasks[index] = task;
        
        renderTaskEdit(task);
        
    } catch (error) {
        console.error('Error loading task:', error);
        const task = currentTasks.find(t => t.id === taskId);
        if (task) {
            renderTaskEdit(task);
        } else {
            showToast('Ошибка загрузки задачи', 'error');
            closeTaskEdit();
        }
    }
}

function renderTaskEdit(task) {
    document.getElementById('taskEditTitle').disabled = false;
    document.getElementById('taskEditId').textContent = task.id;
    document.getElementById('taskEditTitle').value = task.title || '';
    document.getElementById('taskEditDescription').value = task.description || '';
    document.getElementById('taskEditStartDate').value = task.start_date ? task.start_date.slice(0, 10) : '';
    document.getElementById('taskEditDueDate').value = task.due_date ? task.due_date.slice(0, 10) : '';
    document.getElementById('taskEditPriority').value = task.priority || 'medium';
    document.getElementById('taskEditStatus').value = task.status || 'pending';
    
    // Исполнитель
    const assigneeName = task.assignee_surname ? `${task.assignee_surname} ${task.assignee_name || ''}`.trim() : 'Не назначен';
    document.getElementById('taskEditAssignee').value = assigneeName;
    
    // Создатель
    const creatorName = task.creator_surname ? `${task.creator_surname} ${task.creator_name || ''}`.trim() : '—';
    document.getElementById('taskEditCreator').value = creatorName;
    
    // Прогресс
    const progress = task.progress || 0;
    document.getElementById('taskEditProgress').value = progress;
    document.getElementById('taskEditProgressValue').textContent = progress + '%';
    
    // Статус-бейдж
    updateEditStatusBadge(task.status || 'pending');
    
    // Даты
    document.getElementById('taskEditCreatedDate').textContent = task.created_at ? new Date(task.created_at).toLocaleDateString('ru-RU') : '—';
    document.getElementById('taskEditUpdatedDate').textContent = task.updated_at ? new Date(task.updated_at).toLocaleDateString('ru-RU') : '—';
    
    // Обработчики
    document.getElementById('taskEditSaveBtn').onclick = () => saveTaskEdit(task.id);
    document.getElementById('taskEditDeleteBtn').onclick = () => deleteTaskEdit(task.id);
    document.getElementById('taskEditAddCommentBtn').onclick = () => addCommentEdit(task.id);
    
    // Enter в комментарии
    const commentField = document.getElementById('taskEditNewComment');
    commentField.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addCommentEdit(task.id);
        }
    };
    
    // При изменении статуса обновляем бейдж
    document.getElementById('taskEditStatus').onchange = function() {
        updateEditStatusBadge(this.value);
    };
    
    // Загружаем комментарии
    loadCommentsEdit(task.id);
}

function updateEditStatusBadge(status) {
    const badge = document.getElementById('taskEditStatusBadge');
    const map = {
        pending: { label: 'Ожидает', class: 'pending' },
        in_progress: { label: 'В работе', class: 'in_progress' },
        completed: { label: 'Выполнена', class: 'completed' },
        cancelled: { label: 'Отменена', class: 'cancelled' }
    };
    const info = map[status] || map.pending;
    badge.textContent = info.label;
    badge.className = 'task-status-badge ' + info.class;
}

// ----- КОММЕНТАРИИ В РЕДАКТИРОВАНИИ -----
async function loadCommentsEdit(taskId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderCommentsEdit(data.comments || []);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function renderCommentsEdit(comments) {
    const container = document.getElementById('taskEditCommentsList');
    const countEl = document.getElementById('taskEditCommentsCount');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="task-empty">Нет комментариев</div>';
        if (countEl) countEl.textContent = '0';
        return;
    }
    
    if (countEl) countEl.textContent = comments.length;
    
    container.innerHTML = comments.map(c => `
        <div class="task-comment">
            <div class="comment-meta">
                <span class="comment-author">${escapeHtml(c.user_name || 'Пользователь')}</span>
                <span>${c.created_at ? new Date(c.created_at).toLocaleString('ru-RU') : ''}</span>
            </div>
            <div class="comment-text">${escapeHtml(c.content)}</div>
        </div>
    `).join('');
}

async function addCommentEdit(taskId) {
    const content = document.getElementById('taskEditNewComment').value.trim();
    if (!content) {
        showToast('Введите текст комментария', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            document.getElementById('taskEditNewComment').value = '';
            await loadCommentsEdit(taskId);
            showToast('Комментарий добавлен', 'success');
        }
    } catch (error) {
        console.error('Add comment error:', error);
        showToast('Ошибка', 'error');
    }
}

// ----- СОХРАНЕНИЕ И УДАЛЕНИЕ -----
async function saveTaskEdit(taskId) {
    const title = document.getElementById('taskEditTitle').value.trim();
    if (!title) {
        showToast('Введите название задачи', 'error');
        document.getElementById('taskEditTitle').focus();
        return;
    }
    
    const data = {
        title: title,
        description: document.getElementById('taskEditDescription').value,
        startDate: document.getElementById('taskEditStartDate').value || null,
        dueDate: document.getElementById('taskEditDueDate').value || null,
        priority: document.getElementById('taskEditPriority').value,
        status: document.getElementById('taskEditStatus').value,
        progress: parseInt(document.getElementById('taskEditProgress').value) || 0
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Задача сохранена', 'success');
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            // Перезагружаем отображение
            fetchTaskForEdit(taskId);
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Ошибка сохранения', 'error');
    }
}

async function deleteTaskEdit(taskId) {
    if (!confirm('Удалить эту задачу?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('Задача удалена', 'success');
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            closeTaskEdit();
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Ошибка удаления', 'error');
    }
}

// ----- ВЫБОР ПОЛЬЗОВАТЕЛЕЙ ДЛЯ СОЗДАНИЯ -----
// let createTaskData = {
//     assigneeId: null,
//     observerIds: [],
//     templateId: null,
//     templateData: null
// };

function openUserSelectorForCreate(type) {
    const isMultiple = type === 'observers';
    const preselected = isMultiple ? createTaskData.observerIds : (createTaskData.assigneeId ? [createTaskData.assigneeId] : []);
    
    openUserSelector({
        mode: isMultiple ? 'multiple' : 'single',
        preselectedIds: preselected,
        title: isMultiple ? 'Выберите наблюдателей' : 'Выберите исполнителя',
        onConfirm: (users, userIds) => {
            if (isMultiple) {
                createTaskData.observerIds = userIds;
                updateCreateObservers(users);
            } else {
                if (users && users.length > 0) {
                    const user = users[0];
                    createTaskData.assigneeId = user.id;
                    document.getElementById('taskCreateAssigneeDisplay').value = `${user.surname || ''} ${user.name || ''}`.trim();
                    document.getElementById('taskCreateAssigneeId').value = user.id;
                }
            }
        }
    });
}

function updateCreateObservers(users) {
    const display = document.getElementById('taskCreateObserversDisplay');
    const tags = document.getElementById('taskCreateObserversTags');
    const ids = document.getElementById('taskCreateObserversIds');
    
    if (!display || !tags) return;
    
    if (users && users.length > 0) {
        display.value = users.map(u => `${u.surname || ''} ${u.name || ''}`.trim()).join(', ');
        tags.innerHTML = users.map(u => `
            <span class="task-tag">
                ${escapeHtml(`${u.surname || ''} ${u.name || ''}`.trim())}
                <button class="tag-remove" onclick="removeCreateObserver(${u.id})">✕</button>
            </span>
        `).join('');
    } else {
        display.value = '';
        tags.innerHTML = '';
    }
    
    if (ids) ids.value = (users || []).map(u => u.id).join(',');
}

function removeCreateObserver(userId) {
    createTaskData.observerIds = createTaskData.observerIds.filter(id => id !== userId);
    const users = createTaskData.observerIds.map(id => {
        const user = window.allUsersList?.find(u => u.id === id);
        return user || { id, surname: 'Пользователь', name: String(id) };
    });
    updateCreateObservers(users);
}

function openUserSelectorForCustom(fieldId) {
    openUserSelector({
        mode: 'single',
        title: 'Выберите пользователя',
        onConfirm: (users) => {
            if (users && users.length > 0) {
                const user = users[0];
                document.getElementById(`${fieldId}_display`).value = `${user.surname || ''} ${user.name || ''}`.trim();
                document.getElementById(fieldId).value = user.id;
            }
        }
    });
}

// ----- ОТПРАВКА СОЗДАНИЯ -----
async function submitTaskCreate() {
    const title = document.getElementById('taskCreateTitle').value.trim();
    if (!title) {
        showToast('Введите название задачи', 'error');
        document.getElementById('taskCreateTitle').focus();
        return;
    }
    
    if (!document.getElementById('taskCreateDueDate').value) {
        showToast('Укажите срок выполнения', 'error');
        document.getElementById('taskCreateDueDate').focus();
        return;
    }
    
    if (!createTaskData.assigneeId) {
        showToast('Выберите исполнителя', 'error');
        return;
    }
    
    // Собираем кастомные поля с типом
    const customFields = {};
    document.querySelectorAll('#taskCreateCustomFieldsContainer .task-field').forEach(el => {
        const key = el.dataset.fieldKey;
        const input = el.querySelector('input, textarea, select');
        
        if (input) {
            let value = null;
            let type = input.dataset.fieldType || 'text';
            let label = input.dataset.fieldLabel || key;
            
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'hidden') {
                // Для пользователей — берём значение из hidden
                value = input.value || null;
            } else if (input.type === 'number') {
                value = input.value ? parseFloat(input.value) : null;
            } else {
                value = input.value || null;
            }
            
            // Сохраняем структурированные данные
            customFields[key] = {
                type: type,
                value: value,
                label: label
            };
        }
    });
    const data = {
        title: title,
        description: document.getElementById('taskCreateDescription').value || '',
        startDate: document.getElementById('taskCreateStartDate').value || null,
        dueDate: document.getElementById('taskCreateDueDate').value,
        priority: document.getElementById('taskCreatePriority').value,
        assignedTo: parseInt(createTaskData.assigneeId),
        observers: createTaskData.observerIds.map(id => parseInt(id)),
        customFields: customFields,
        templateId: createTaskData.templateId
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast('Задача создана', 'success');
            closeTaskCreate();
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            
            setTimeout(() => {
                if (result.task && confirm('Задача создана. Открыть?')) {
                    openTaskEdit(result.task.id);
                }
            }, 300);
        }
    } catch (error) {
        console.error('Create error:', error);
        showToast('Ошибка создания', 'error');
    }
}

// =====================================================
// КАРТОЧКА ЗАДАЧИ (GOOGLE FORMS СТИЛЬ)
// =====================================================


function openTaskView(taskId) {
    currentViewTaskId = taskId;
    
    // Показываем загрузку
    document.getElementById('taskViewTitle').textContent = '⏳ Загрузка...';
    document.getElementById('taskViewTitleDisplay').textContent = 'Загрузка...';
    
    openWindow('base-section-task-view');
    fetchTaskForView(taskId);
}

function closeTaskView() {
    closeWindow('base-section-task-view');
    // Возвращаемся к дашборду
    openWindow('base-section-dashboard');
}

async function fetchTaskForView(taskId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load task');
        
        const data = await response.json();
        const task = data.task;
        
        // Обновляем в локальном массиве
        const index = currentTasks.findIndex(t => t.id === taskId);
        if (index !== -1) currentTasks[index] = task;
        
        renderTaskView(task);
        
    } catch (error) {
        console.error('Error loading task:', error);
        showToast('Ошибка загрузки задачи', 'error');
        closeTaskView();
    }
}

function renderTaskView(task) {
    window.currentViewTask = task;
    // Заголовок
    document.getElementById('taskViewTitle').textContent = '📋 Задача';
    document.getElementById('taskViewId').textContent = `№${task.id}`;
    document.getElementById('taskViewTitleDisplay').textContent = task.title || 'Без названия';
    
    // Статус и бейдж
    const statusSelect = document.getElementById('taskViewStatus');
    statusSelect.value = task.status || 'pending';
    updateViewStatusBadge(task.status || 'pending');
    
    // Приоритет
    document.getElementById('taskViewPriority').value = task.priority || 'medium';
    
    // Прогресс
    const progress = task.progress || 0;
    document.getElementById('taskViewProgress').value = progress;
    document.getElementById('taskViewProgressValue').textContent = progress + '%';
    
    // Описание
    document.getElementById('taskViewDescription').textContent = task.description || '—';
    
    // Даты
    document.getElementById('taskViewStartDate').textContent = task.start_date ? new Date(task.start_date).toLocaleDateString('ru-RU') : '—';
    document.getElementById('taskViewDueDate').textContent = task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : '—';
    
    // Исполнитель
    const assigneeName = task.assignee_surname ? `${task.assignee_surname} ${task.assignee_name || ''}`.trim() : 'Не назначен';
    document.getElementById('taskViewAssignee').textContent = assigneeName;
    
    // Создатель
    const creatorName = task.creator_surname ? `${task.creator_surname} ${task.creator_name || ''}`.trim() : '—';
    document.getElementById('taskViewCreator').textContent = creatorName;
    
    // Мета
    document.getElementById('taskViewCreatedDate').textContent = task.created_at ? new Date(task.created_at).toLocaleString('ru-RU') : '—';
    document.getElementById('taskViewUpdatedDate').textContent = task.updated_at ? new Date(task.updated_at).toLocaleString('ru-RU') : '—';
    document.getElementById('taskViewTemplate').textContent = task.template_name || '—';
    
    // Кастомные поля из шаблона
    renderViewCustomFields(task);
    
    // Комментарии
    loadViewComments(task.id);
    
    // Обработчики
    document.getElementById('taskViewStatus').onchange = function() {
        updateViewStatusBadge(this.value);
    };
    
    document.getElementById('taskViewSaveBtn').onclick = () => saveTaskView(task.id);
    document.getElementById('taskViewSaveBtn2').onclick = () => saveTaskView(task.id);
    document.getElementById('taskViewDeleteBtn').onclick = () => deleteTaskView(task.id);
    document.getElementById('taskViewAddCommentBtn').onclick = () => addViewComment(task.id);
    document.getElementById('taskViewCloseBtn').onclick = closeTaskView;
    document.getElementById('taskViewCloseBtn2').onclick = closeTaskView;
    
    // Enter в комментарии
    const commentField = document.getElementById('taskViewNewComment');
    commentField.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addViewComment(task.id);
        }
    };
}

function updateViewStatusBadge(status) {
    const badge = document.getElementById('taskViewStatusBadge');
    const map = {
        pending: { label: '⏳ Ожидает', style: 'background: #fef3c7; color: #d97706;' },
        in_progress: { label: '🔄 В работе', style: 'background: #dbeafe; color: #2563eb;' },
        completed: { label: '✅ Выполнена', style: 'background: #d1fae5; color: #059669;' },
        cancelled: { label: '❌ Отменена', style: 'background: #fee2e2; color: #dc2626;' }
    };
    const info = map[status] || map.pending;
    badge.textContent = info.label;
    badge.style.cssText = info.style + ' padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;';
}

function renderViewCustomFields(task) {
    const container = document.getElementById('taskViewCustomFieldsContainer');
    const section = document.getElementById('taskViewCustomFields');
    
    if (!container || !section) return;
    
    const customFields = task.custom_fields || {};
    const keys = Object.keys(customFields);
    
    if (keys.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    // Собираем ID пользователей из кастомных полей
    const userIds = new Set();
    keys.forEach(key => {
        const field = customFields[key];
        
        // Новая структура с типом
        if (field && typeof field === 'object' && field.type) {
            if (field.type === 'user' && field.value && !isNaN(field.value)) {
                userIds.add(parseInt(field.value));
            }
            if (field.type === 'multi-user' && Array.isArray(field.value)) {
                field.value.forEach(id => {
                    if (!isNaN(id)) userIds.add(parseInt(id));
                });
            }
        } else {
            // Старый формат — пробуем определить по ключу
            if (key.includes('согласующ') || key.includes('наблюдател') || key.includes('user')) {
                if (field && !isNaN(field)) {
                    userIds.add(parseInt(field));
                }
            }
        }
    });
    
    console.log('👥 User IDs from custom fields:', Array.from(userIds));
    
    // Если есть пользователи — загружаем их
    if (userIds.size > 0) {
        loadUsersByIds(Array.from(userIds), (usersMap) => {
            console.log('👤 Users map:', usersMap);
            renderCustomFieldsWithUsers(container, customFields, usersMap);
        });
    } else {
        renderCustomFieldsWithUsers(container, customFields, {});
    }
}
async function loadUsersByIds(userIds, callback) {
    if (!userIds || userIds.length === 0) {
        if (callback) callback({});
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            if (callback) callback({});
            return;
        }
        
        const idsParam = userIds.join(',');
        console.log('🔍 Loading users by ids:', idsParam);
        
        // Маршрут в userRoutes.js — /api/users/batch
        const response = await fetch(`/api/task/userscard?ids=${idsParam}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('👥 Users loaded:', data.users);
            const usersMap = {};
            data.users.forEach(u => {
                usersMap[u.id] = `${u.surname || ''} ${u.name || ''}`.trim() || u.username || 'Пользователь';
            });
            if (callback) callback(usersMap);
        } else {
            const error = await response.json();
            console.error('Failed to load users:', response.status, error);
            if (callback) callback({});
        }
    } catch (error) {
        console.error('Error loading users by ids:', error);
        if (callback) callback({});
    }
}
// ----- КОММЕНТАРИИ В КАРТОЧКЕ -----
async function loadViewComments(taskId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderViewComments(data.comments || []);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function renderViewComments(comments) {
    const container = document.getElementById('taskViewCommentsList');
    const countEl = document.getElementById('taskViewCommentsCount');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="task-empty">Нет комментариев</div>';
        if (countEl) countEl.textContent = '0';
        return;
    }
    
    if (countEl) countEl.textContent = comments.length;
    
    container.innerHTML = comments.map(c => `
        <div class="task-comment">
            <div class="comment-meta">
                <span class="comment-author">${escapeHtml(c.user_name || 'Пользователь')}</span>
                <span>${c.created_at ? new Date(c.created_at).toLocaleString('ru-RU') : ''}</span>
            </div>
            <div class="comment-text">${escapeHtml(c.content)}</div>
        </div>
    `).join('');
}

async function addViewComment(taskId) {
    const content = document.getElementById('taskViewNewComment').value.trim();
    if (!content) {
        showToast('Введите текст комментария', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            document.getElementById('taskViewNewComment').value = '';
            await loadViewComments(taskId);
            showToast('Комментарий добавлен', 'success');
        }
    } catch (error) {
        console.error('Add comment error:', error);
        showToast('Ошибка', 'error');
    }
}

// ----- СОХРАНЕНИЕ И УДАЛЕНИЕ -----
async function saveTaskView(taskId) {
    const status = document.getElementById('taskViewStatus').value;
    const priority = document.getElementById('taskViewPriority').value;
    const progress = parseInt(document.getElementById('taskViewProgress').value) || 0;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: status,
                priority: priority,
                progress: progress
            })
        });
        
        if (response.ok) {
            showToast('Изменения сохранены', 'success');
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            // Обновляем карточку
            fetchTaskForView(taskId);
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Ошибка сохранения', 'error');
    }
}

async function deleteTaskView(taskId) {
    if (!confirm('Удалить эту задачу?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('Задача удалена', 'success');
            await loadTasks();
            await loadCalendarEvents();
            loadRecentTasks();
            loadActiveTasks();
            loadArchivedTasks();
            renderDashboardTasks();
            closeTaskView();
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Ошибка удаления', 'error');
    }
}