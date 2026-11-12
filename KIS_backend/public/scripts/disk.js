let currentFolderId = null; // null = корень
let currentPath = []; // [{ id, name }]

document.addEventListener('DOMContentLoaded', () => {
    loadFolder();
    loadStats();

    // Загрузка файлов
    document.getElementById('uploadFileBtn').onclick = () => {
        document.getElementById('fileUploadInput').click();
    };

    

    // Создание папки
    document.getElementById('createFolderBtn').onclick = async () => {
        document.getElementById('newFolderName').value = '';
        document.getElementById('createFolderModal').style.display = 'flex';
        document.getElementById('newFolderName').focus();
    };
});
// =====================================================
// ЗАГРУЗКА ФАЙЛОВ (DRAG & DROP + ПРОГРЕСС)
// =====================================================

const filesContainer = document.getElementById('filesMainContainer') || document.body;

// 1. Обработчики Drag & Drop на всю область страницы
filesContainer.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Показываем оверлей, только если тащим файлы (а не элементы таблицы)
    if (e.dataTransfer.types.includes('Files')) {
        filesContainer.classList.add('drag-active');
    }
});

filesContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy';
    }
});

filesContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Убираем класс, только если ушли за пределы контейнера
    if (e.relatedTarget === null || !filesContainer.contains(e.relatedTarget)) {
        filesContainer.classList.remove('drag-active');
    }
});

filesContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    filesContainer.classList.remove('drag-active');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
});

// 2. Обработчик кнопки "Загрузить файл"
document.getElementById('fileUploadBtn').onclick = () => {
    document.getElementById('fileUploadInput').click();
};

document.getElementById('fileUploadInput').onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
    e.target.value = '';
};

// 3. Сама логика загрузки с прогресс-баром
async function uploadFiles(files) {
    // Создаём контейнер для прогресса, если его нет
    let progressContainer = document.getElementById('uploadProgressContainer');
    if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.id = 'uploadProgressContainer';
        progressContainer.className = 'upload-progress-container';
        progressContainer.innerHTML = `
            <div class="upload-progress-header">
                <span>Загрузка файлов</span>
                <button onclick="this.closest('.upload-progress-container').remove()" style="background:none; border:none; cursor:pointer; font-size:16px;">✕</button>
            </div>
            <div class="upload-progress-list" id="uploadProgressList"></div>
        `;
        document.body.appendChild(progressContainer);
    }

    const list = document.getElementById('uploadProgressList');

    for (const file of files) {
        // Создаём элемент прогресса для файла
        const itemId = 'upload_' + Math.random().toString(36).substr(2, 9);
        const item = document.createElement('div');
        item.className = 'upload-progress-item';
        item.id = itemId;
        item.innerHTML = `
            <div class="upload-file-info">
                <span class="upload-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                <span class="upload-percent" id="${itemId}_percent">0%</span>
            </div>
            <div class="upload-bar-container">
                <div class="upload-bar" id="${itemId}_bar"></div>
            </div>
        `;
        list.appendChild(item);

        // Отправляем через XMLHttpRequest (для получения прогресса)
        await new Promise((resolve) => {
            const formData = new FormData();
            formData.append('file', file);
            if (currentFolderId) formData.append('folderId', currentFolderId);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/files/upload', true);
            xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    document.getElementById(`${itemId}_percent`).textContent = percent + '%';
                    document.getElementById(`${itemId}_bar`).style.width = percent + '%';
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    item.style.opacity = '0.5';
                    document.getElementById(`${itemId}_percent`).textContent = 'Готово';
                    document.getElementById(`${itemId}_bar`).style.background = '#10b981';
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        showToast(err.error || 'Ошибка загрузки', 'error');
                    } catch(e) {
                        showToast('Ошибка загрузки', 'error');
                    }
                    document.getElementById(`${itemId}_percent`).textContent = 'Ошибка';
                    document.getElementById(`${itemId}_bar`).style.background = '#ef4444';
                }
                resolve();
            };

            xhr.onerror = () => {
                showToast('Сетевая ошибка', 'error');
                resolve();
            };

            xhr.send(formData);
        });
    }

    // Обновляем список файлов и статистику
    loadFolder();
    loadStats();

    // Удаляем контейнер прогресса через 3 секунды после завершения
    setTimeout(() => {
        const pc = document.getElementById('uploadProgressContainer');
        if (pc && !pc.querySelector('.upload-bar[style*="width: 0%"]')) {
            pc.remove();
        }
    }, 3000);
}
// Переход в папку
function openFolder(folderId, folderName) {
    if (folderId === 'root') {
        currentFolderId = null;
        currentPath = [];
    } else {
        currentFolderId = folderId;
        // Обновляем путь, если не возвращаемся назад
        if (currentPath.length === 0 || currentPath[currentPath.length - 1].id !== folderId) {
            // Упрощенно: берем имя из клика, в реальности лучше запрашивать
            currentPath.push({ id: folderId, name: folderName });
        }
    }
    loadFolder();
}

function renderBreadcrumbs() {
    const container = document.getElementById('filesBreadcrumbs');
    let html = `<span class="crumb ${currentFolderId === null ? 'active' : ''}" onclick="openFolder('root')">📁 Корень</span>`;
    
    currentPath.forEach((p, idx) => {
        html += ` <span style="color:var(--c_surf_txt)">/</span> `;
        html += `<span class="crumb ${idx === currentPath.length - 1 ? 'active' : ''}" onclick="openFolder(${p.id}, '${escapeHtml(p.name)}')">${escapeHtml(p.name)}</span>`;
    });
    
    container.innerHTML = html;
}

async function loadFolder() {
    renderBreadcrumbs();
    const tbody = document.getElementById('filesTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Загрузка...</td></tr>';
    
    try {
        const url = currentFolderId ? `/api/files/folder/${currentFolderId}` : '/api/files/folder';
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        tbody.innerHTML = '';
        
        // 1. Папки
        if (data.folders) {
            data.folders.forEach(f => {
                const tr = document.createElement('tr');
                tr.className = 'folder-row';
                tr.setAttribute('draggable', 'true');
                tr.setAttribute('data-id', f.id);
                tr.setAttribute('data-type', 'folder');
                tr.innerHTML = `
                    <td><div class="file-icon-wrapper" style="background: rgba(255, 193, 7, 0.15); color: #ffc107;">📁</div></td>
                    <td><strong>${escapeHtml(f.name)}</strong></td>
                    <td>—</td>
                    <td>${new Date(f.created_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                        <button class="btn-icon" onclick="event.stopPropagation(); window.open('${f.file_uri}', '_blank')" title="Скачать" style="color: var(--c_acc);">📥</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteFolder(${f.id})" style="color: #dc3545;">🗑️</button>
                    </td>
                `;
                tr.onclick = () => openFolder(f.id, f.name);
                tr.ondragstart = (e) => handleDragStart(e, f.id, 'folder');
                tr.ondragover = handleDragOver;
                tr.ondragleave = handleDragLeave;
                tr.ondrop = (e) => handleDrop(e, f.id);
                tbody.appendChild(tr);
            });
        }

        // 2. Файлы
        if (data.files) {
            data.files.forEach(f => {
                const typeIcons = { doc: '📝', excel: '📊', ppt: '📽️', pdf: '📕', image: '🖼️', archive: '📦', other: '📄' };
                const typeClasses = { doc: 'bg-doc', excel: 'bg-excel', ppt: 'bg-ppt', pdf: 'bg-pdf', image: 'bg-image', archive: 'bg-archive', other: 'bg-other' };
                
                const tr = document.createElement('tr');
                tr.setAttribute('draggable', 'true');
                tr.setAttribute('data-id', f.id);
                tr.setAttribute('data-type', 'file');
                tr.innerHTML = `
                    <td><div class="file-icon-wrapper ${typeClasses[f.file_type] || 'bg-other'}">${typeIcons[f.file_type] || '📄'}</div></td>
                    <td>${escapeHtml(f.file_name)}</td>
                    <td>${formatSize(f.file_size)}</td>
                    <td>${new Date(f.created_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                        <button class="btn-icon" onclick="event.stopPropagation(); window.open('${f.file_uri}', '_blank')" title="Скачать" style="color: var(--c_acc);">📥</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteFile(${f.id})" style="color: #dc3545;">🗑️</button>
                    </td>
                `;
                tr.ondragstart = (e) => handleDragStart(e, f.id, 'file');
                // Двойной клик — скачать
                tr.ondblclick = () => window.open(f.file_uri, '_blank');
                tbody.appendChild(tr);
            });
        }

        if (tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px;">📭 Папка пуста</td></tr>';
        }
        
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Ошибка загрузки</td></tr>';
    }
}

// =====================================================
// DRAG & DROP
// =====================================================

let draggedItem = null;

function handleDragStart(e, id, type) {
    draggedItem = { id, type };
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
}

function handleDragOver(e) {
    e.preventDefault();
    // Подсвечиваем только папки
    if (e.currentTarget.classList.contains('folder-row')) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e, targetFolderId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedItem) return;
    
    // Если перетаскиваем папку в саму себя
    if (draggedItem.type === 'folder' && draggedItem.id === targetFolderId) {
        draggedItem = null;
        return;
    }

    try {
        await fetch('/api/files/move', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({
                id: draggedItem.id,
                type: draggedItem.type,
                targetFolderId: targetFolderId
            })
        });
        
        draggedItem = null;
        loadFolder(); // Перерисовываем
    } catch (e) {
        showToast('Ошибка перемещения', 'error');
    }
}

// Удаление
async function deleteFile(id) {
    showCustomConfirm(
        '🗑️ Удаление файла',
        'Вы уверены, что хотите удалить этот файл? Это действие нельзя отменить.',
        async () => {
            try {
                await fetch(`/api/files/${id}`, { 
                    method: 'DELETE', 
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
                });
                loadFolder();
                loadStats();
                showToast('Файл удалён', 'success');
            } catch (e) {
                showToast('Ошибка удаления', 'error');
            }
        }
    );
}

async function deleteFolder(id) {
    showCustomConfirm(
        '🗑️ Удаление папки',
        'Удалить папку? Все файлы внутри также будут удалены.',
        async () => {
            try {
                await fetch(`/api/files/folder/${id}`, { 
                    method: 'DELETE', 
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
                });
                loadFolder();
                loadStats();
                showToast('Папка удалена', 'success');
            } catch (e) {
                showToast('Ошибка удаления', 'error');
            }
        }
    );
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function loadStats() {
    // ... (оставляем как было, только не забываем, что /api/files/stats работает)
    try {
        const res = await fetch('/api/files/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const data = await res.json();
        
        const percent = Math.min(100, (data.used / data.limit) * 100);
        document.getElementById('storageBar').style.width = percent + '%';
        document.getElementById('storageUsed').textContent = formatSize(data.used);
        document.getElementById('storageLimit').textContent = formatSize(data.limit);

        const typeList = document.getElementById('fileTypesList');
        const typeNames = { doc: 'Документы', excel: 'Таблицы', ppt: 'Презентации', pdf: 'PDF', image: 'Изображения', archive: 'Архивы', other: 'Другое' };
        const typeIcons = { doc: '📝', excel: '📊', ppt: '📽️', pdf: '📕', image: '🖼️', archive: '📦', other: '📄' };
        const typeClasses = { doc: 'bg-doc', excel: 'bg-excel', ppt: 'bg-ppt', pdf: 'bg-pdf', image: 'bg-image', archive: 'bg-archive', other: 'bg-other' };

        typeList.innerHTML = Object.keys(typeNames).map(type => {
            const stat = data.byType[type] || { count: 0 };
            if (stat.count === 0) return '';
            return `<div class="file-type-item"><div class="file-icon-wrapper ${typeClasses[type]}">${typeIcons[type]}</div><div class="type-info"><span>${typeNames[type]}</span><span class="type-count">${stat.count} шт.</span></div></div>`;
        }).join('') || '<div style="color:#999; font-size:12px;">Нет файлов</div>';
    } catch (e) { console.error(e); }
}
// =====================================================
// МОДАЛКИ
// =====================================================

function closeFolderModal() {
    document.getElementById('createFolderModal').style.display = 'none';
}

// Обработчик кнопки "Создать" в модалке папки
document.getElementById('confirmCreateFolderBtn').onclick = async () => {
    const name = document.getElementById('newFolderName').value.trim();
    if (!name) {
        showToast('Введите название папки', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/files/folder', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ name, parentId: currentFolderId })
        });
        
        if (!res.ok) throw new Error('Ошибка');
        
        closeFolderModal();
        loadFolder();
        showToast('Папка создана', 'success');
    } catch (e) {
        showToast('Ошибка создания папки', 'error');
    }
};

// Универсальное подтверждение
let __confirmCallback = null;

function showCustomConfirm(title, message, onConfirm) {
    document.getElementById('confirmActionTitle').textContent = title;
    document.getElementById('confirmActionMessage').textContent = message;
    document.getElementById('confirmActionModal').style.display = 'flex';
    __confirmCallback = onConfirm;
}

function closeConfirmActionModal() {
    document.getElementById('confirmActionModal').style.display = 'none';
    __confirmCallback = null;
}

document.getElementById('confirmActionBtn').onclick = () => {
    if (__confirmCallback) __confirmCallback();
    closeConfirmActionModal();
};
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
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}