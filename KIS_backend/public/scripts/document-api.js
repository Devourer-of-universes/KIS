// =====================================================
// API И ЛОГИКА ДЛЯ РАБОТЫ С ДОКУМЕНТАМИ
// =====================================================

// Состояние
let documentsByMode = {
    'recent': { list: [], original: [], sort: { field: null, direction: null }, search: '' },
    'at-work': { list: [], original: [], sort: { field: null, direction: null }, search: '' },
    'archive': { list: [], original: [], sort: { field: null, direction: null }, search: '' }
};

// =====================================================
// ЗАГРУЗКА ДОКУМЕНТОВ
// =====================================================

/**
 * Загрузка документов для секции
 * @param {string} mode - 'recent' | 'at-work' | 'archive'
 */
async function loadDocuments(mode) {
    const tbodyId = {
        'recent': 'recentDocsBody',
        'at-work': 'atWorkDocsBody',
        'archive': 'archiveDocsBody'
    }[mode];
    
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Загрузка...</td></tr>';
    
    try {
        const token = localStorage.getItem('token');
        let url = '/api/documents?limit=100';
        
        // Фильтры по режиму
        if (mode === 'recent') {
            url += '&sort_by=updated_at&sort_dir=desc';
        } else if (mode === 'at-work') {
            url += '&status=draft,on_approval,revision,approved,signed&sort_by=updated_at&sort_dir=desc';
        } else if (mode === 'archive') {
            url += '&status=registered,archived,cancelled&sort_by=updated_at&sort_dir=desc';
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка загрузки');
        }
        
        const data = await response.json();
        const documents = data.documents || [];
        
        documentsByMode[mode].original = [...documents];
        documentsByMode[mode].list = documents;
        
        renderDocuments(mode);
        
    } catch (error) {
        console.error('Load documents error:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="loading-row" style="color: var(--c_error);">${escapeHtml(error.message)}</td></tr>`;
    }
}

// =====================================================
// ОТРИСОВКА ТАБЛИЦЫ ДОКУМЕНТОВ
// =====================================================

function renderDocuments(mode) {
    const tbodyId = {
        'recent': 'recentDocsBody',
        'at-work': 'atWorkDocsBody',
        'archive': 'archiveDocsBody'
    }[mode];
    
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    const data = documentsByMode[mode];
    let documents = data.list;
    
    // Применяем поиск
    if (data.search) {
        const text = data.search.toLowerCase();
        documents = documents.filter(d => 
            (d.title || '').toLowerCase().includes(text) ||
            (d.reg_number || '').toLowerCase().includes(text) ||
            (d.document_type_name || '').toLowerCase().includes(text)
        );
    }
    
    // Применяем сортировку
    if (data.sort.field && data.sort.direction) {
        documents = [...documents].sort((a, b) => {
            let valA = getDocFieldValue(a, data.sort.field);
            let valB = getDocFieldValue(b, data.sort.field);
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA === valB) return 0;
            return data.sort.direction === 'asc' 
                ? (valA > valB ? 1 : -1)
                : (valA < valB ? 1 : -1);
        });
    }
    
    if (documents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-row">📭 Нет документов</td></tr>`;
        return;
    }
    
    tbody.innerHTML = documents.map(doc => {
        const statusBadge = getDocumentStatusBadge(doc.status);
        const createdDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString('ru-RU') : '—';
        const updatedDate = doc.updated_at ? new Date(doc.updated_at).toLocaleDateString('ru-RU') : '—';
        const docNumber = doc.reg_number || `#${doc.id}`;
        
        return `
            <tr onclick="openDocumentView(${doc.id})">
                <td><code style="font-family: monospace; color: var(--c_acc);">${escapeHtml(docNumber)}</code></td>
                <td><strong>${escapeHtml(doc.title || 'Без названия')}</strong></td>
                <td>${escapeHtml(doc.document_type_name || '—')}</td>
                <td>${statusBadge}</td>
                <td>${createdDate}</td>
                <td>${updatedDate}</td>
            </tr>
        `;
    }).join('');
    
    // Обновляем иконки сортировки
    updateDocumentSortIcons(mode);
}

function getDocFieldValue(doc, field) {
    if (field === 'reg_number') return doc.reg_number || `#${doc.id}`;
    return doc[field] || '';
}

function getDocumentStatusBadge(status) {
    const labels = {
        draft: '📝 Черновик',
        on_approval: '⏳ На согласовании',
        revision: '🔁 На доработке',
        approved: '✅ Согласован',
        signed: '✍️ Подписан',
        registered: '📌 Зарегистрирован',
        archived: '📦 В архиве',
        cancelled: '❌ Отменён'
    };
    
    const label = labels[status] || status;
    return `<span class="doc-status-badge ${status}">${label}</span>`;
}

// =====================================================
// ПОИСК И СОРТИРОВКА
// =====================================================

function filterDocuments(mode) {
    const searchInputId = {
        'recent': 'recentDocsSearch',
        'at-work': 'atWorkDocsSearch',
        'archive': 'archiveDocsSearch'
    }[mode];
    
    const input = document.getElementById(searchInputId);
    documentsByMode[mode].search = input ? input.value : '';
    renderDocuments(mode);
}

function sortDocuments(mode, field) {
    const data = documentsByMode[mode];
    
    if (data.sort.field === field) {
        if (data.sort.direction === 'asc') {
            data.sort.direction = 'desc';
        } else if (data.sort.direction === 'desc') {
            data.sort.field = null;
            data.sort.direction = null;
        }
    } else {
        data.sort.field = field;
        data.sort.direction = 'asc';
    }
    
    renderDocuments(mode);
}

function updateDocumentSortIcons(mode) {
    const tbodyId = {
        'recent': 'recentDocsBody',
        'at-work': 'atWorkDocsBody',
        'archive': 'archiveDocsBody'
    }[mode];
    
    const table = document.getElementById(tbodyId)?.closest('.documents-table');
    if (!table) return;
    
    const data = documentsByMode[mode];
    table.querySelectorAll('th').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (!icon) return;
        
        const field = th.dataset.sort;
        if (field === data.sort.field && data.sort.direction) {
            icon.className = 'sort-icon ' + data.sort.direction;
        } else {
            icon.className = 'sort-icon';
        }
    });
}

// =====================================================
// ОТКРЫТИЕ ДОКУМЕНТА
// =====================================================


// =====================================================
// ЭКСПОРТ
// =====================================================

window.loadDocuments = loadDocuments;
window.renderDocuments = renderDocuments;
window.filterDocuments = filterDocuments;
window.sortDocuments = sortDocuments;
