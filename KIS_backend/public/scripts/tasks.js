// ==========ЗАДАЧИ==========






// =====================================================
// 1. ИНИЦИАЛИЗАЦИЯ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =====================================================
// - DOM элементы (кнопки меню)
const btn_tasks_last = document.querySelector('#top-menu-btn-tasks-last');
const btn_tasks_at_work = document.querySelector('#top-menu-btn-tasks-at-work');
const btn_tasks_new = document.querySelector('#top-menu-btn-tasks-new');
const btn_tasks_archive = document.querySelector('#top-menu-btn-tasks-archive');


// Обработчики кнопок

btn_tasks_last.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-last'); loadRecentTasks();});
btn_tasks_at_work.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-at-work'); loadActiveTasks();});
btn_tasks_new.addEventListener('click', (e) => { e.stopPropagation(); openTaskTypeSelector();});
btn_tasks_archive.addEventListener('click', (e) => { e.stopPropagation(); openWindow('base-section-task-archive'); loadArchivedTasks();});
// - Глобальные переменные (currentCalendarDate, calendarEvents, currentTasks и т.д.)

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
let currentViewTaskId = null; 
let currentViewTask = null; 


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


// =====================================================
// 6. МОДАЛЬНЫЕ ОКНА (ЗАДАЧИ И КАЛЕНДАРЬ)
// =====================================================
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
            }
        });
    });
    
    // Закрытие модальных окон по клику на фон
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('base-sec-dn-modal') || e.target.classList.contains('base-sec-tn-modal')) {
            closeAllWindowsExcept(null);
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
    initTaskEditorHandlers();
    initTemplateBuilderHandlers();
    initUserSelectorHandlers();
    initTemplatesSection();
    initTaskFromTemplateHandlers();
    loadAttentionDocuments();
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