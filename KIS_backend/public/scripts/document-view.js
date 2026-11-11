// =====================================================
// ПРОСМОТР ДОКУМЕНТА
// =====================================================

let docViewState = {
    documentId: null,
    document: null,
    attachments: []
};

// =====================================================
// ВХОДНАЯ ТОЧКА
// =====================================================

async function openDocumentView(docId) {
    docViewState.documentId = docId;
    docViewState.document = null;
    docViewState.attachments = [];
    
    // Показываем загрузку
    document.getElementById('docViewTitle').textContent = 'Загрузка...';
    document.getElementById('docViewTypeName').textContent = '—';
    document.getElementById('docViewTemplateName').textContent = '—';
    
    openWindow('base-section-document-view');
    await loadDocumentForView(docId);
}

function closeDocumentView() {
    openWindow('base-section-doc-last');
    if (typeof loadDocuments === 'function') {
        loadDocuments('recent');
    }
    // Обновляем блок внимания
    if (typeof loadAttentionDocuments === 'function') {
        loadAttentionDocuments();
    }
}

// =====================================================
// ЗАГРУЗКА
// =====================================================

async function loadDocumentForView(docId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${docId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка загрузки документа');
        }
        
        const data = await response.json();
        docViewState.document = data.document;
        
        renderDocumentView(data.document);
        
    } catch (error) {
        console.error('Load document view error:', error);
        document.getElementById('docViewTitle').textContent = 'Ошибка';
        showToast(error.message, 'error');
    }
}

// =====================================================
// ОТРИСОВКА
// =====================================================

function renderDocumentView(doc) {
    console.log('📄 renderDocumentView START');
    
    // Шапка
    try {
        document.getElementById('docViewTitle').textContent = doc.title || 'Без названия';
        document.getElementById('docViewTypeName').textContent = doc.document_type_name || '—';
        document.getElementById('docViewTemplateName').textContent = doc.template_name || 'Без шаблона';
    } catch (e) { console.error('❌ Шапка:', e); }
    
    // Рег. номер
    try {
        const regSpan = document.getElementById('docViewRegNumber');
        if (doc.reg_number) {
            regSpan.textContent = '№' + doc.reg_number;
            regSpan.style.display = 'inline';
        } else {
            regSpan.style.display = 'none';
        }
    } catch (e) { console.error('❌ Рег. номер:', e); }
    
    // Статус-бейдж
    try { renderDocViewStatus(doc.status); } 
    catch (e) { console.error('❌ Статус:', e); }
    
    // Поля документа
    try { renderDocViewFields(doc); } 
    catch (e) { console.error('❌ Поля:', e); }
    
    // Описание
    try {
        if (doc.field_values?.description) {
            document.getElementById('docViewDescSection').style.display = 'block';
            document.getElementById('docViewDescription').textContent = doc.field_values.description;
        } else {
            document.getElementById('docViewDescSection').style.display = 'none';
        }
    } catch (e) { console.error('❌ Описание:', e); }
    
    // Вложения
    try {
        docViewState.attachments = doc.attachments || [];
        renderDocViewAttachments(docViewState.attachments);
    } catch (e) { console.error('❌ Вложения:', e); }
    
    // Маршрут
    try {
        if (doc.route && doc.route.route_data?.steps?.length > 0) {
            document.getElementById('docViewRouteSection').style.display = 'block';
            renderDocViewRoute(doc.route);
        } else {
            document.getElementById('docViewRouteSection').style.display = 'none';
        }
    } catch (e) { console.error('❌ Маршрут:', e); }
    
    // Подписи
    try {
        if (doc.signatures && doc.signatures.length > 0) {
            document.getElementById('docViewSignaturesSection').style.display = 'block';
            renderDocViewSignatures(doc.signatures);
        } else {
            document.getElementById('docViewSignaturesSection').style.display = 'none';
        }
    } catch (e) { console.error('❌ Подписи:', e); }
    // История
    try {
        // История (из версий)
        if (doc.versions && doc.versions.length > 0) {
            document.getElementById('docViewHistorySection').style.display = 'block';
            renderDocViewHistory(doc.versions);
        } else {
            document.getElementById('docViewHistorySection').style.display = 'none';
        }
    } catch (e) { console.error('❌ История:', e); }
    // Кнопки действий — ВСЕГДА В КОНЦЕ
    try { 
        console.log('🎨 Перед renderDocViewActions');
        renderDocViewActions(doc); 
        console.log('✅ renderDocViewActions OK');
    } catch (e) { 
        console.error('❌ Кнопки:', e); 
    }
    
    // Preview
    try { loadDocViewPreview(doc); } 
    catch (e) { console.error('❌ Preview:', e); }
    
    console.log('📄 renderDocumentView END');
}
function renderDocViewHistory(versions) {
    const container = document.getElementById('docViewHistory');
    if (!container) return;
    
    container.innerHTML = versions.map(v => {
        const userName = v.surname 
            ? `${v.surname} ${v.name || ''}`.trim() 
            : 'Система';
        
        const date = v.created_at 
            ? new Date(v.created_at).toLocaleString('ru-RU', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            }) 
            : '';
        
        const comment = v.comment || 'Изменение документа';
        const versionLabel = `Версия ${v.version_number}`;
        
        return `
            <div class="history-timeline-item">
                <div class="history-timeline-dot"></div>
                <div class="history-timeline-content">
                    <div class="history-timeline-header">
                        <span class="history-timeline-author">${escapeHtml(userName)}</span>
                        <span class="history-timeline-version">${versionLabel}</span>
                    </div>
                    <div class="history-timeline-comment">${escapeHtml(comment)}</div>
                    <div class="history-timeline-date">${date}</div>
                </div>
            </div>
        `;
    }).join('');
}
// =====================================================
// СТАТУС
// =====================================================

function renderDocViewStatus(status) {
    const badge = document.getElementById('docViewStatusBadge');
    
    const statusMap = {
        'draft':       { label: '📝 Черновик',            cls: 'draft' },
        'on_approval': { label: '⏳ На согласовании',     cls: 'on_approval' },
        'revision':    { label: '🔁 На доработке',        cls: 'revision' },
        'approved':    { label: '✅ Согласован',          cls: 'approved' },
        'signed':      { label: '✍️ Подписан',            cls: 'signed' },
        'registered':  { label: '🔢 Зарегистрирован',     cls: 'registered' },
        'archived':    { label: '📦 В архиве',            cls: 'archived' },
        'cancelled':   { label: '❌ Отменён',              cls: 'cancelled' }
    };
    
    const info = statusMap[status] || { label: status, cls: 'draft' };
    badge.textContent = info.label;
    badge.className = 'doc-view-status-badge ' + info.cls;
}

// =====================================================
// ПОЛЯ
// =====================================================

function renderDocViewFields(doc) {
    const container = document.getElementById('docViewFields');
    const fieldValues = doc.field_values || {};
    
    // Поля из шаблона
    const templateFields = doc.template_data?.fields || [];
    
    if (templateFields.length === 0 && !fieldValues.title && !fieldValues.description) {
        container.innerHTML = '<div class="doc-view-empty">Нет полей</div>';
        return;
    }
    
    let html = '';
    
    // Стандартные поля (если есть)
    if (fieldValues.title) {
        html += renderDocViewField('Название', fieldValues.title);
    }
    
    // Поля из шаблона
    for (const field of templateFields) {
        const value = fieldValues[field.key];
        const displayValue = formatDocViewFieldValue(field, value);
        html += renderDocViewField(field.label, displayValue);
    }
    
    // Если есть поля без описания в шаблоне (на всякий случай)
    const templateKeys = new Set(templateFields.map(f => f.key));
    for (const [key, value] of Object.entries(fieldValues)) {
        if (key === 'title' || key === 'description') continue;
        if (templateKeys.has(key)) continue;
        
        html += renderDocViewField(key, String(value));
    }
    
    container.innerHTML = html || '<div class="doc-view-empty">Нет полей</div>';
}

function renderDocViewField(label, value) {
    return `
        <div class="doc-view-field">
            <div class="doc-view-field-label">${escapeHtml(label)}</div>
            <div class="doc-view-field-value">${value || '<span class="doc-view-field-empty">—</span>'}</div>
        </div>
    `;
}

// Форматирование значения поля в зависимости от типа
function formatDocViewFieldValue(field, value) {
    if (value === undefined || value === null || value === '') {
        return '<span class="doc-view-field-empty">—</span>';
    }
    
    // Для дат
    if (field.type === 'date') {
        try {
            const d = new Date(value);
            return d.toLocaleDateString('ru-RU');
        } catch (e) {
            return escapeHtml(String(value));
        }
    }
    
    // Для пользователей — ID (позже можно разворачивать в ФИО)
    if (field.type === 'user') {
        return `👤 ID: ${escapeHtml(String(value))}`;
    }
    
    // Для контрагента — ID (позже можно разворачивать в название)
    if (field.type === 'counterparty') {
        return `🏢 ID: ${escapeHtml(String(value))}`;
    }
    
    // Для чисел
    if (field.type === 'number') {
        return escapeHtml(String(value));
    }
    
    return escapeHtml(String(value));
}

// =====================================================
// ВЛОЖЕНИЯ
// =====================================================

function renderDocViewAttachments(attachments) {
    const container = document.getElementById('docViewAttachments');
    const countEl = document.getElementById('docViewAttachmentsCount');
    
    countEl.textContent = attachments.length;
    
    if (attachments.length === 0) {
        container.innerHTML = '<div class="doc-view-empty">Нет вложений</div>';
        return;
    }
    
    container.innerHTML = attachments.map(att => `
        <div class="doc-view-attachment">
            <span class="doc-view-attachment-icon">📎</span>
            <a href="${escapeHtml(att.file_uri)}" target="_blank" class="doc-view-attachment-name">
                ${escapeHtml(att.file_name)}
            </a>
            <span class="doc-view-attachment-size">${formatFileSize(att.file_size)}</span>
            <button class="doc-view-attachment-remove" 
                    onclick="deleteDocViewAttachment(${att.id})" 
                    title="Удалить">🗑️</button>
        </div>
    `).join('');
}

async function deleteDocViewAttachment(attachmentId) {
    if (!confirm('Удалить этот файл?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(
            `/api/documents/${docViewState.documentId}/attachments/${attachmentId}`,
            {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        
        if (!response.ok) throw new Error('Ошибка удаления');
        
        showToast('Файл удалён', 'success');
        
        // Перезагружаем документ
        await loadDocumentForView(docViewState.documentId);
        
    } catch (error) {
        console.error('Delete attachment error:', error);
        showToast(error.message, 'error');
    }
}

// Загрузка вложений
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('docViewFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleDocViewFileUpload);
    }
});

async function handleDocViewFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const token = localStorage.getItem('token');
    
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(
                `/api/documents/${docViewState.documentId}/attachments`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                }
            );
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Ошибка загрузки');
            }
        } catch (error) {
            console.error('Upload attachment error:', error);
            showToast(`Не удалось загрузить "${file.name}"`, 'error');
        }
    }
    
    e.target.value = '';
    await loadDocumentForView(docViewState.documentId);
    showToast('Файлы загружены', 'success');
}

// =====================================================
// МАРШРУТ
// =====================================================

function renderDocViewRoute(route) {
    const container = document.getElementById('docViewRoute');
    const steps = route.route_data?.steps || [];
    
    if (steps.length === 0) {
        container.innerHTML = '<div class="doc-view-empty">Маршрут пуст</div>';
        return;
    }
    
    const currentUserId = window.currentUser?.id;
    const currentPendingIdx = steps.findIndex(s => s.status === 'pending');
    
    container.innerHTML = steps.map((step, idx) => {
        const statusIcon = {
            'pending':   '⏳',
            'approved':  '✅',
            'rejected':  '❌',
            'cancelled': '⚪'
        }[step.status] || '⏳';
        
        const isCurrent = idx === currentPendingIdx;
        const isMyCurrent = isCurrent && step.user_id === currentUserId;
        
        let statusCls = 'doc-view-route-step-' + (step.status || 'pending');
        if (isCurrent) statusCls += ' doc-view-route-step-current';
        if (isMyCurrent) statusCls += ' doc-view-route-step-my';
        
        const typeLabel = {
            'approval':  'Согласование',
            'signature': 'Подписание',
            'review':    'Ознакомление'
        }[step.type] || 'Этап';
        
        return `
            <div class="doc-view-route-step ${statusCls}">
                <div class="doc-view-route-step-num">${idx + 1}</div>
                <div class="doc-view-route-step-info">
                    <div class="doc-view-route-step-role">
                        ${statusIcon} ${escapeHtml(step.role || typeLabel)}
                        ${isMyCurrent ? '<span class="doc-view-route-my-badge">Ваш шаг</span>' : ''}
                    </div>
                    <div class="doc-view-route-step-user">
                        ${escapeHtml(step.user?.full_name || step.user_name || 'Не назначен')}
                    </div>
                    ${step.comment ? `<div class="doc-view-route-step-comment">💬 ${escapeHtml(step.comment)}</div>` : ''}
                </div>
                <div class="doc-view-route-step-date">
                    ${step.completed_at ? new Date(step.completed_at).toLocaleString('ru-RU') : ''}
                </div>
            </div>
        `;
    }).join('');
}
// =====================================================
// ПОДПИСИ
// =====================================================

function renderDocViewSignatures(signatures) {
    const container = document.getElementById('docViewSignatures');
    
    container.innerHTML = signatures.map(sig => `
        <div class="doc-view-signature">
            <div class="doc-view-signature-icon">✍️</div>
            <div class="doc-view-signature-info">
                <div class="doc-view-signature-author">
                    ${escapeHtml(sig.surname || '')} ${escapeHtml(sig.name || '')}
                </div>
                <div class="doc-view-signature-date">
                    ${new Date(sig.signed_at).toLocaleString('ru-RU')}
                </div>
            </div>
        </div>
    `).join('');
}

// =====================================================
// КНОПКИ ДЕЙСТВИЙ (зависит от статуса)
// =====================================================

function renderDocViewActions(doc) {
    const headerRight = document.querySelector('.doc-view-header-right');
    if (!headerRight) return;
    
    const downloadBtn = document.getElementById('docViewDownloadBtn');
    const editBtn = document.getElementById('docViewEditBtn');
    const registerBtn = document.getElementById('docViewRegisterBtn');
    const submitBtn = document.getElementById('docViewSubmitBtn');
    const deleteBtn = document.getElementById('docViewDeleteBtn');
    
    // Удаляем старые кнопки approve/reject, если есть
    document.getElementById('docViewApproveBtn')?.remove();
    document.getElementById('docViewRejectBtn')?.remove();
    
    // --- Скачать ---
    if (downloadBtn) {
        if (doc.generated_file_uri) {
            downloadBtn.style.display = '';
            downloadBtn.onclick = () => downloadDocViewFile();
        } else {
            downloadBtn.style.display = 'none';
        }
    }
    
    // --- Редактировать ---
    if (editBtn) {
        if (['draft', 'revision'].includes(doc.status)) {
            editBtn.style.display = '';
            editBtn.onclick = () => openDocumentEdit(doc.id);
        } else {
            editBtn.style.display = 'none';
        }
    }
    
    // --- Отправить ---
    if (submitBtn) {
        if (['draft', 'revision'].includes(doc.status)) {
            submitBtn.style.display = '';
            submitBtn.onclick = () => submitDocumentForApproval(doc.id);
        } else {
            submitBtn.style.display = 'none';
        }
    }
    
    // --- Зарегистрировать ---
    if (registerBtn) {
        if (['signed', 'approved'].includes(doc.status) && !doc.reg_number) {
            registerBtn.style.display = '';
            registerBtn.onclick = () => registerDocument(doc.id);
        } else {
            registerBtn.style.display = 'none';
        }
    }
        // --- В архив (для registered / signed) ---
    const archiveBtn = document.getElementById('docViewArchiveBtn');
    if (!archiveBtn) {
        // создаём один раз
        const newArchiveBtn = document.createElement('button');
        newArchiveBtn.id = 'docViewArchiveBtn';
        newArchiveBtn.className = 'buttonbase btn-outline';
        newArchiveBtn.textContent = '📦 В архив';
        newArchiveBtn.onclick = () => archiveDocument(doc.id);
        
        if (deleteBtn) {
            headerRight.insertBefore(newArchiveBtn, deleteBtn);
        } else {
            headerRight.appendChild(newArchiveBtn);
        }
    }
    
    const archiveBtnRef = document.getElementById('docViewArchiveBtn');
    if (archiveBtnRef) {
        if (['registered', 'signed', 'approved'].includes(doc.status)) {
            archiveBtnRef.style.display = '';
        } else {
            archiveBtnRef.style.display = 'none';
        }
    }
    // --- Удалить ---
    if (deleteBtn) {
        deleteBtn.style.display = '';
        deleteBtn.onclick = () => deleteDocView();
    }
    
    // --- Одобрить / Отклонить (только если текущий шаг — мой) ---
    if (doc.status === 'on_approval' && isCurrentStepMine(doc)) {
        // Кнопка "Одобрить"
        const approveBtn = document.createElement('button');
        approveBtn.id = 'docViewApproveBtn';
        approveBtn.className = 'buttonbase';
        approveBtn.style.background = '#10b981';
        approveBtn.textContent = '✅ Одобрить';
        approveBtn.onclick = () => openApproveModal(doc.id);
        
        // Кнопка "Отклонить"
        const rejectBtn = document.createElement('button');
        rejectBtn.id = 'docViewRejectBtn';
        rejectBtn.className = 'buttonbase';
        rejectBtn.style.background = '#dc3545';
        rejectBtn.textContent = '❌ Отклонить';
        rejectBtn.onclick = () => openRejectModal(doc.id);
        
        // Вставляем ПЕРЕД кнопкой удаления
        if (deleteBtn) {
            headerRight.insertBefore(approveBtn, deleteBtn);
            headerRight.insertBefore(rejectBtn, deleteBtn);
        } else {
            headerRight.appendChild(approveBtn);
            headerRight.appendChild(rejectBtn);
        }
    }
}
async function archiveDocument(docId) {
    if (!confirm('Переместить документ в архив? После этого он станет неактивным.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${docId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'archived' })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Ошибка архивации');
        }
        
        showToast('Документ перемещён в архив', 'success');
        await loadDocumentForView(docId);
        
    } catch (error) {
        console.error('Archive error:', error);
        showToast(error.message, 'error');
    }
}
// =====================================================
// ДЕЙСТВИЯ (заглушки, будут доделаны позже)
// =====================================================

function downloadDocViewFile() {
    const docId = docViewState.documentId;
    const token = localStorage.getItem('token');
    window.open(`/api/documents/${docId}/download?token=${token}`, '_blank');
}

function openDocumentEdit(docId) {
    showToast('Редактирование в разработке', 'info');
    // TODO: открыть base-section-document-card с заполненными полями
}

async function submitDocumentForApproval(docId) {
    const doc = docViewState.document;
    if (!doc) return;
    
    if (!doc.route || !doc.route.route_data?.steps?.length) {
        showToast('У документа нет маршрута согласования. Обратитесь к администратору.', 'error');
        return;
    }
    
    const steps = doc.route.route_data.steps;
    openSubmitApprovalModal(doc, steps);
}

async function registerDocument(docId) {
    // 1. Получаем превью номера
    try {
        const token = localStorage.getItem('token');
        const previewRes = await fetch(`/api/documents/${docId}/preview-reg-number`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let nextNumber = '...';
        if (previewRes.ok) {
            const data = await previewRes.json();
            nextNumber = data.next_reg_number || '...';
        }
        
        // 2. Показываем модалку
        const existing = document.getElementById('registerDocModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'registerDocModal';
        modal.className = 'admin-modal active';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9);">
                    <h2>🔢 Регистрация документа</h2>
                    <button class="modal-close" onclick="closeRegisterDocModal()">&times;</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <p style="margin: 0 0 16px 0; color: var(--c_bg_txt);">
                        Документу будет присвоен регистрационный номер и текущая дата.
                    </p>
                    
                    <div class="sa-field">
                        <label class="sa-label">Следующий номер</label>
                        <div style="padding: 12px 16px; background: var(--c_acchalf); color: var(--c_acc); border-radius: 8px; font-size: 20px; font-weight: 700; font-family: monospace; text-align: center;">
                            ${escapeHtml(nextNumber)}
                        </div>
                    </div>
                    
                    <p style="margin: 16px 0 0 0; font-size: 12px; color: var(--c_surf_txt);">
                        ℹ️ Номер присваивается автоматически на основе настроек типа документа.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="buttonbase" onclick="closeRegisterDocModal()">Отмена</button>
                    <button class="buttonbase" id="confirmRegisterDocBtn" style="background: #8b5cf6;">🔢 Зарегистрировать</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('confirmRegisterDocBtn').onclick = async () => {
            const btn = document.getElementById('confirmRegisterDocBtn');
            btn.disabled = true;
            btn.textContent = '⏳...';
            
            try {
                const resp = await fetch(`/api/documents/${docId}/register`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || 'Ошибка регистрации');
                }
                
                const result = await resp.json();
                showToast(`Документ зарегистрирован. Номер: ${result.reg_number}`, 'success');
                
                closeRegisterDocModal();
                await loadDocumentForView(docId);
                
            } catch (error) {
                console.error('Register error:', error);
                showToast(error.message, 'error');
                btn.disabled = false;
                btn.textContent = '🔢 Зарегистрировать';
            }
        };
        
    } catch (error) {
        console.error('Register preview error:', error);
        showToast(error.message, 'error');
    }
}

function closeRegisterDocModal() {
    document.getElementById('registerDocModal')?.remove();
}

async function deleteDocView() {
    if (!confirm('Удалить документ? Это действие нельзя отменить.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${docViewState.documentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Ошибка удаления');
        
        showToast('Документ удалён', 'success');
        closeDocumentView();
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast(error.message, 'error');
    }
}

// =====================================================
// PREVIEW
// =====================================================

async function loadDocViewPreview(doc) {
    const container = document.getElementById('docViewPreviewContent');
    
    // Если есть сгенерированный файл — генерим preview из него
    // Иначе — из шаблона с текущими field_values
    
    if (!doc.template_file_uri && !doc.generated_file_uri) {
        container.innerHTML = `
            <div class="doc-preview-empty">
                <div class="doc-preview-empty-icon">📄</div>
                <div class="doc-preview-empty-text">Предпросмотр недоступен</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '<div class="doc-preview-loading">⏳ Обновление...</div>';
    
    // Пока используем preview-with-data на уровне документа (уже есть)
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${doc.id}/preview-with-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ field_values: doc.field_values || {} })
        });
        
        if (!response.ok) throw new Error('Ошибка preview');
        
        const data = await response.json();
        const rawHtml = data.html || '';
        
        if (!rawHtml || rawHtml.trim() === '') {
            container.innerHTML = `
                <div class="doc-preview-empty">
                    <div class="doc-preview-empty-icon">📄</div>
                    <div class="doc-preview-empty-text">Пустой документ</div>
                </div>
            `;
        } else {
            container.innerHTML = `<div class="docx-page">${rawHtml}</div>`;
        }
        
    } catch (error) {
        console.error('Doc view preview error:', error);
        container.innerHTML = `
            <div class="doc-preview-empty">
                <div class="doc-preview-empty-icon">⚠️</div>
                <div class="doc-preview-empty-text">Не удалось создать превью</div>
            </div>
        `;
    }
}

async function refreshDocViewPreview() {
    if (docViewState.document) {
        await loadDocViewPreview(docViewState.document);
    }
}

// =====================================================
// УТИЛИТЫ
// =====================================================

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
async function submitDocumentForApproval(docId) {
    const doc = docViewState.document;
    if (!doc) return;
    
    // Если маршрут уже есть — открываем модалку сразу с ним
    if (doc.route && doc.route.route_data?.steps?.length > 0) {
        openSubmitApprovalModal(doc, doc.route.route_data.steps, null);
        return;
    }
    
    // Если маршрута нет — грузим шаблоны процессов
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/workflow-templates?active_only=true&limit=200', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить шаблоны процессов');
        
        const data = await response.json();
        const templates = data.templates || [];
        
        if (templates.length === 0) {
            showToast('В системе нет активных шаблонов процессов', 'error');
            return;
        }
        
        // Открываем модалку с селектом шаблона
        openSubmitApprovalModal(doc, [], templates);
        
    } catch (error) {
        console.error('Load workflow templates error:', error);
        showToast(error.message, 'error');
    }
}

async function openSubmitApprovalModal(doc, steps, templates) {
    // templates === null → у документа уже есть маршрут, шаги известны
    // templates !== null → маршрута нет, надо выбрать шаблон процесса
    
    const existing = document.getElementById('submitApprovalModal');
    if (existing) existing.remove();
    
    // Инициализируем состояние редактируемого маршрута
    window.__modalRouteState = {
        steps: steps ? JSON.parse(JSON.stringify(steps)) : [],
        allowParallel: false,
        editingStepIndex: null,
        availableTemplates: templates || [],
        selectedTemplateId: null,
        selectedTemplateName: null
    };
    
    const modal = document.createElement('div');
    modal.id = 'submitApprovalModal';
    modal.className = 'admin-modal active';
    modal.style.display = 'flex';
    
    const needsTemplate = !steps || steps.length === 0;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 760px; max-height: 90vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h2>🚀 Отправить на согласование</h2>
                <button class="modal-close" onclick="closeSubmitApprovalModal()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 20px; overflow-y: auto; flex: 1; min-height: 0;">
                
                <!-- Карточка документа -->
                <div class="sa-doc-card">
                    <div class="sa-doc-title">${escapeHtml(doc.title)}</div>
                    <div class="sa-doc-meta">
                        ${escapeHtml(doc.document_type_name || '—')} · ${escapeHtml(doc.template_name || 'Без шаблона')}
                    </div>
                </div>
                
                <!-- Выбор шаблона процесса (если нужен) -->
                ${needsTemplate ? `
                    <div class="sa-field">
                        <label class="sa-label">Шаблон процесса *</label>
                        <select id="submitApprovalTemplateSelect" class="sa-select">
                            <option value="">— Выберите шаблон —</option>
                            ${templates.map(t => `
                                <option value="${t.id}">${escapeHtml(t.name)} (${t.steps_count || 0} этапов)</option>
                            `).join('')}
                        </select>
                    </div>
                ` : `
                    <div class="sa-field">
                        <label class="sa-label">Шаблон процесса</label>
                        <div class="sa-template-name" id="submitApprovalTemplateName">
                            ${doc.route?.workflow_template_id ? 'Загружается...' : '— Кастомный маршрут —'}
                        </div>
                    </div>
                `}
                
                <!-- Редактор этапов -->
                <div class="sa-steps-section">
                    <div class="sa-steps-header">
                        <span class="sa-label">Этапы маршрута</span>
                        <span class="sa-steps-hint">Перетаскивайте этапы для смены порядка</span>
                    </div>
                    
                    <div id="submitApprovalStepsList" class="sa-steps-list">
                        <!-- Рендерится через renderEditableSteps() -->
                    </div>
                    
                    <button type="button" class="sa-add-step-btn" onclick="addModalStep()">
                        <span>＋</span> Добавить этап
                    </button>
                </div>
                
                <!-- Сохранить как новый шаблон -->
                <div class="sa-save-template">
                    <label class="sa-checkbox">
                        <input type="checkbox" id="saveAsTemplateCheckbox" 
                               onchange="toggleSaveAsTemplateField(this.checked)">
                        <span>Сохранить как новый шаблон процесса</span>
                    </label>
                    <div id="saveAsTemplateField" style="display: none; margin-top: 10px;">
                        <input type="text" id="newTemplateName" class="sa-input" 
                               placeholder="Название нового шаблона"
                               value="${escapeHtml(doc.title)} — маршрут">
                    </div>
                </div>
                
                <!-- Комментарий -->
                <div class="sa-field">
                    <label class="sa-label">Комментарий (необязательно)</label>
                    <textarea id="submitApprovalComment" class="sa-textarea" rows="3" 
                              placeholder="Например: Прошу согласовать в приоритетном порядке"></textarea>
                </div>
                
            </div>
            <div class="modal-footer">
                <button class="buttonbase" onclick="closeSubmitApprovalModal()">Отмена</button>
                <button class="buttonbase" id="confirmSubmitApprovalBtn">🚀 Отправить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчик селекта шаблона
    if (needsTemplate) {
        const select = document.getElementById('submitApprovalTemplateSelect');
        
        const loadTemplateSteps = async (templateId) => {
            window.__modalRouteState.selectedTemplateId = templateId ? parseInt(templateId) : null;
            
            if (!templateId) {
                window.__modalRouteState.steps = [];
                renderEditableSteps();
                return;
            }
            
            const listContainer = document.getElementById('submitApprovalStepsList');
            listContainer.innerHTML = '<div class="sa-steps-loading">Загрузка этапов...</div>';
            
            try {
                const token = localStorage.getItem('token');
                const resp = await fetch(`/api/workflow-templates/${templateId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!resp.ok) throw new Error('Ошибка загрузки');
                
                const data = await resp.json();
                const tmpl = data.template;
                
                window.__modalRouteState.selectedTemplateName = tmpl.name;
                window.__modalRouteState.steps = (tmpl.steps || []).map(s => ({
                    id: s.id || ('step_' + Math.random().toString(36).substr(2, 9)),
                    type: s.type || 'approval',
                    role_label: s.role_label || s.role || '',
                    assignee_type: s.assignee_type || 'user',
                    assignee_user_id: s.assignee_user_id || null,
                    assignee_post_id: s.assignee_post_id || null,
                    assignee_department_id: s.assignee_department_id || null,
                    assignee_role_id: s.assignee_role_id || null,
                    user: s.user || null,
                    post: s.post || null,
                    role: s.role || null,
                    department: s.department || null
                }));
                
                renderEditableSteps();
                
            } catch (error) {
                console.error('Load template steps error:', error);
                listContainer.innerHTML = '<div class="sa-steps-error">Ошибка загрузки этапов</div>';
            }
        };
        
        select.addEventListener('change', () => loadTemplateSteps(select.value));
        
        if (select.value) {
            loadTemplateSteps(select.value);
        }
    } else {
        // Маршрут уже есть — рендерим сразу
        renderEditableSteps();
    }
    
    // Кнопка "Отправить"
    document.getElementById('confirmSubmitApprovalBtn').onclick = async () => {
        const comment = document.getElementById('submitApprovalComment').value.trim();
        
        const select = document.getElementById('submitApprovalTemplateSelect');
        const workflowTemplateId = window.__modalRouteState.selectedTemplateId 
            || (select?.value ? parseInt(select.value) : null);
        
        // Проверяем, что маршрут не пуст
        if (window.__modalRouteState.steps.length === 0) {
            showToast('Добавьте хотя бы один этап в маршрут', 'error');
            return;
        }
        
        // Проверяем, что все этапы имеют исполнителя
        for (let i = 0; i < window.__modalRouteState.steps.length; i++) {
            const step = window.__modalRouteState.steps[i];
            if (!isStepAssigneeValid(step)) {
                showToast(`Этап ${i + 1}: не указан исполнитель`, 'error');
                window.__modalRouteState.editingStepIndex = i;
                renderEditableSteps();
                return;
            }
        }
        
        if (needsTemplate && !workflowTemplateId) {
            showToast('Выберите шаблон процесса', 'error');
            return;
        }
        
        // Опционально: сохранить как шаблон
        const saveAsTemplate = document.getElementById('saveAsTemplateCheckbox')?.checked;
        const newTemplateName = document.getElementById('newTemplateName')?.value.trim();
        
        if (saveAsTemplate && !newTemplateName) {
            showToast('Введите название нового шаблона', 'error');
            return;
        }
        
        await doSubmitApproval(
            doc.id, 
            comment, 
            workflowTemplateId,
            window.__modalRouteState.steps,
            saveAsTemplate ? newTemplateName : null
        );
    };
}
// =====================================================
// РЕНДЕР РЕДАКТИРУЕМОГО СПИСКА ЭТАПОВ
// =====================================================

function renderEditableSteps() {
    const container = document.getElementById('submitApprovalStepsList');
    if (!container) return;
    
    const state = window.__modalRouteState;
    if (!state) return;
    
    if (state.steps.length === 0) {
        container.innerHTML = `
            <div class="sa-steps-loading">
                Нет этапов. Нажмите "＋ Добавить этап".
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.steps.map((step, idx) => {
        const isEditing = state.editingStepIndex === idx;
        const typeLabel = {
            'approval': 'Согласование',
            'signature': 'Подписание',
            'review': 'Ознакомление'
        }[step.type] || 'Этап';
        
        const assigneeLabel = getStepAssigneeLabelFromState(step, state);
        const isMissing = !isStepAssigneeValid(step);
        
        return `
            <div class="sa-step ${isEditing ? 'editing' : ''}" 
                 data-step-index="${idx}"
                 draggable="true"
                 ondragstart="handleModalStepDragStart(event, ${idx})"
                 ondragend="handleModalStepDragEnd(event)"
                 ondragover="handleModalStepDragOver(event, ${idx})"
                 ondragleave="handleModalStepDragLeave(event)"
                 ondrop="handleModalStepDrop(event, ${idx})">
                
                <div class="sa-step-drag" title="Перетащите для смены порядка">⋮⋮</div>
                <div class="sa-step-number">${idx + 1}</div>
                <div class="sa-step-body">
                    <div class="sa-step-info">
                        <span class="sa-step-type-badge ${step.type}">${typeLabel}</span>
                        <span class="sa-step-title">${escapeHtml(step.role_label || typeLabel)}</span>
                        <span class="sa-step-assignee ${isMissing ? 'missing' : ''}">
                            ${isMissing ? '⚠️ ' : '👤 '}${escapeHtml(assigneeLabel)}
                        </span>
                    </div>
                    ${isEditing ? renderInlineStepEditor(step, idx) : ''}
                </div>
                <div class="sa-step-actions">
                    <button type="button" class="sa-step-btn" 
                            onclick="toggleModalStepEdit(${idx})" 
                            title="${isEditing ? 'Свернуть' : 'Редактировать'}">
                        ${isEditing ? '✓' : '✏️'}
                    </button>
                    <button type="button" class="sa-step-btn delete" 
                            onclick="removeModalStep(${idx})" 
                            title="Удалить">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderInlineStepEditor(step, idx) {
    const assigneeType = step.assignee_type || 'user';
    
    return `
        <div class="sa-step-editor">
            <div class="sa-field">
                <label class="sa-label">Тип этапа</label>
                <select class="sa-select" onchange="updateModalStepProperty(${idx}, 'type', this.value)">
                    <option value="approval" ${step.type === 'approval' ? 'selected' : ''}>✅ Согласование</option>
                    <option value="signature" ${step.type === 'signature' ? 'selected' : ''}>✍️ Подписание</option>
                    <option value="review" ${step.type === 'review' ? 'selected' : ''}>👀 Ознакомление</option>
                </select>
            </div>
            
            <div class="sa-field">
                <label class="sa-label">Название этапа</label>
                <input type="text" class="sa-input" 
                       value="${escapeHtml(step.role_label || '')}" 
                       placeholder="Например: Согласование руководителем"
                       oninput="updateModalStepProperty(${idx}, 'role_label', this.value)">
            </div>
            
            <div class="sa-field">
                <label class="sa-label">Кто выполняет</label>
                <select class="sa-select" onchange="updateModalStepAssigneeType(${idx}, this.value)">
                    <option value="user" ${assigneeType === 'user' ? 'selected' : ''}>👤 Конкретный пользователь</option>
                    <option value="author" ${assigneeType === 'author' ? 'selected' : ''}>✍️ Автор документа</option>
                    <option value="department_manager" ${assigneeType === 'department_manager' ? 'selected' : ''}>👔 Руководитель отдела автора</option>
                    <option value="post" ${assigneeType === 'post' ? 'selected' : ''}>🏷️ Должность</option>
                    <option value="role" ${assigneeType === 'role' ? 'selected' : ''}>👑 Роль</option>
                </select>
            </div>
            
            ${renderModalStepAssigneeFields(idx, step)}
        </div>
    `;
}

function renderModalStepAssigneeFields(idx, step) {
    const assigneeType = step.assignee_type || 'user';
    
    if (assigneeType === 'user') {
        const label = step.user?.full_name || (step.assignee_user_id ? `ID: ${step.assignee_user_id}` : 'Не выбран');
        return `
            <div class="sa-field">
                <label class="sa-label">Пользователь</label>
                <button type="button" class="sa-input" 
                        style="cursor: pointer; text-align: left;"
                        onclick="openUserPickerForModalStep(${idx})">
                    ${escapeHtml(label)} 👤
                </button>
            </div>
        `;
    }
    
    if (assigneeType === 'author' || assigneeType === 'department_manager') {
        return `
            <div class="sa-field">
                <div style="padding: 10px; background: var(--c_acchalf); border-radius: 6px; font-size: 12px;">
                    ${assigneeType === 'author' 
                        ? 'ℹ️ Выполнит автор документа (определится при запуске)' 
                        : 'ℹ️ Выполнит руководитель отдела автора (определится при запуске)'}
                </div>
            </div>
        `;
    }
    
    if (assigneeType === 'post') {
        // Селект должностей — заглушка пока с input
        return `
            <div class="sa-field">
                <label class="sa-label">Должность (ID)</label>
                <input type="number" class="sa-input" 
                       value="${step.assignee_post_id || ''}"
                       placeholder="ID должности"
                       oninput="updateModalStepProperty(${idx}, 'assignee_post_id', this.value ? parseInt(this.value) : null)">
            </div>
        `;
    }
    
    if (assigneeType === 'role') {
        return `
            <div class="sa-field">
                <label class="sa-label">Роль (ID)</label>
                <input type="number" class="sa-input" 
                       value="${step.assignee_role_id || ''}"
                       placeholder="ID роли"
                       oninput="updateModalStepProperty(${idx}, 'assignee_role_id', this.value ? parseInt(this.value) : null)">
            </div>
        `;
    }
    
    return '';
}

// Получить читаемое имя исполнителя из состояния модалки
function getStepAssigneeLabelFromState(step, state) {
    const type = step.assignee_type || 'user';
    
    switch (type) {
        case 'user':
            if (step.user?.full_name) return step.user.full_name;
            if (step.assignee_user_id) return `ID: ${step.assignee_user_id}`;
            return 'Не выбран';
        case 'author':
            return 'Автор документа';
        case 'department_manager':
            return 'Руководитель отдела автора';
        case 'post':
            return step.assignee_post_id ? `ID должности: ${step.assignee_post_id}` : 'Должность не выбрана';
        case 'role':
            return step.assignee_role_id ? `ID роли: ${step.assignee_role_id}` : 'Роль не выбрана';
        default:
            return '—';
    }
}

// Проверка, валиден ли шаг
function isStepAssigneeValid(step) {
    const type = step.assignee_type || 'user';
    if (type === 'user') return !!step.assignee_user_id;
    if (type === 'author') return true;
    if (type === 'department_manager') return true;
    if (type === 'post') return !!step.assignee_post_id;
    if (type === 'role') return !!step.assignee_role_id;
    return false;
}
// Рендер превью этапов (общий для обоих режимов)
function renderStepsPreview(steps) {
    if (!steps || steps.length === 0) {
        return '<div style="padding: 20px; text-align: center; color: var(--c_surf_txt); font-size: 13px; font-style: italic;">Этапов нет</div>';
    }
    
    return steps.map((step, idx) => {
        const typeLabel = {
            'approval': 'Согласование',
            'signature': 'Подписание',
            'review': 'Ознакомление'
        }[step.type] || 'Этап';
        
        // Определяем, как показать исполнителя
        let userName = 'Не назначен';
        
        if (step.user && step.user.full_name) {
            userName = step.user.full_name;
        } else if (step.user_name) {
            userName = step.user_name;
        } else if (step.assignee_type === 'author') {
            userName = 'Автор документа (при запуске)';
        } else if (step.assignee_type === 'department_manager') {
            userName = 'Руководитель отдела автора (при запуске)';
        } else if (step.assignee_post_id && step.post) {
            userName = `Должность: ${step.post.name}`;
        } else if (step.assignee_role_id && step.role) {
            userName = `Роль: ${step.role.name}`;
        } else if (step.assignee_user_id) {
            userName = `ID: ${step.assignee_user_id}`;
        }
        
        return `
            <div style="display: flex; align-items: flex-start; gap: 10px; padding: 10px; background: var(--c_bg); border-radius: 8px; border-left: 3px solid var(--c_acc);">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--c_acchalf); color: var(--c_acc); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px; flex-shrink: 0;">${idx + 1}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--c_bg_txt);">${escapeHtml(step.role_label || step.role || typeLabel)}</div>
                    <div style="font-size: 12px; color: var(--c_surf_txt); margin-top: 2px;">👤 ${escapeHtml(userName)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Закрытие модалки
function closeSubmitApprovalModal() {
    const modal = document.getElementById('submitApprovalModal');
    if (modal) modal.remove();
}

// Отправка
async function doSubmitApproval(docId, comment, workflowTemplateId, routeSteps, saveAsTemplateName) {
    const btn = document.getElementById('confirmSubmitApprovalBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Отправка...';
    }
    
    try {
        const token = localStorage.getItem('token');
        
        // 1. Если надо — сначала сохраняем новый шаблон процесса
        if (saveAsTemplateName && routeSteps && routeSteps.length > 0) {
            try {
                const templatePayload = {
                    name: saveAsTemplateName,
                    description: `Создан из документа при отправке на согласование`,
                    steps: routeSteps.map(s => ({
                        id: s.id,
                        type: s.type || 'approval',
                        role_label: s.role_label || '',
                        assignee_type: s.assignee_type || 'user',
                        assignee_user_id: s.assignee_user_id || null,
                        assignee_post_id: s.assignee_post_id || null,
                        assignee_department_id: s.assignee_department_id || null,
                        assignee_role_id: s.assignee_role_id || null
                    }))
                };
                
                const tmplResponse = await fetch('/api/workflow-templates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(templatePayload)
                });
                
                if (!tmplResponse.ok) {
                    const err = await tmplResponse.json().catch(() => ({}));
                    throw new Error('Ошибка сохранения шаблона: ' + (err.error || 'неизвестно'));
                }
                
                showToast(`Шаблон "${saveAsTemplateName}" сохранён`, 'success');
            } catch (e) {
                console.warn('Save as template error:', e);
                showToast('Шаблон не сохранён, но продолжаем отправку', 'warning');
            }
        }
        
        // 2. Отправляем документ на согласование
        const payload = { 
            comment: comment || null
        };
        
        if (workflowTemplateId) {
            payload.workflow_template_id = workflowTemplateId;
        }
        
        if (routeSteps && routeSteps.length > 0) {
            payload.route_data = {
                steps: routeSteps,
                allow_parallel: false
            };
        }
        
        const response = await fetch(`/api/documents/${docId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка отправки');
        }
        
        showToast('Документ отправлен на согласование', 'success');
        closeSubmitApprovalModal();
        
        await loadDocumentForView(docId);
        
    } catch (error) {
        console.error('Submit approval error:', error);
        showToast(error.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🚀 Отправить';
        }
    }
}
// =====================================================
// ДЕЙСТВИЯ НАД ЭТАПАМИ
// =====================================================

// Раскрыть/свернуть inline-редактор этапа
function toggleModalStepEdit(idx) {
    const state = window.__modalRouteState;
    if (!state) return;
    
    state.editingStepIndex = state.editingStepIndex === idx ? null : idx;
    renderEditableSteps();
}

// Обновить свойство этапа
function updateModalStepProperty(idx, prop, value) {
    const state = window.__modalRouteState;
    if (!state || !state.steps[idx]) return;
    
    state.steps[idx][prop] = value;
    
    // Перерисовываем, но чтобы не терять фокус в input — только если не editing
    // (или если это не текстовый input в редакторе)
    if (prop === 'role_label') {
        // Не перерисовываем полностью — только обновляем заголовок
        const card = document.querySelector(`.sa-step[data-step-index="${idx}"] .sa-step-title`);
        if (card) card.textContent = value || 'Этап';
    } else {
        renderEditableSteps();
    }
}

// Смена типа исполнителя
function updateModalStepAssigneeType(idx, newType) {
    const state = window.__modalRouteState;
    if (!state || !state.steps[idx]) return;
    
    const step = state.steps[idx];
    step.assignee_type = newType;
    
    // Сбрасываем старое
    step.assignee_user_id = null;
    step.user = null;
    step.assignee_post_id = null;
    step.assignee_department_id = null;
    step.assignee_role_id = null;
    step.post = null;
    step.role = null;
    
    renderEditableSteps();
}

// Удалить этап
function removeModalStep(idx) {
    const state = window.__modalRouteState;
    if (!state) return;
    
    const step = state.steps[idx];
    const stepName = step.role_label || 'этап';
    
    if (!confirm(`Удалить этап "${stepName}"?`)) return;
    
    state.steps.splice(idx, 1);
    
    // Корректируем редактируемый индекс
    if (state.editingStepIndex === idx) {
        state.editingStepIndex = null;
    } else if (state.editingStepIndex > idx) {
        state.editingStepIndex--;
    }
    
    renderEditableSteps();
}

// Добавить этап
function addModalStep() {
    const state = window.__modalRouteState;
    if (!state) return;
    
    const newStep = {
        id: 'step_' + Math.random().toString(36).substr(2, 9),
        type: 'approval',
        role_label: 'Новый этап',
        assignee_type: 'user',
        assignee_user_id: null,
        assignee_post_id: null,
        assignee_department_id: null,
        assignee_role_id: null,
        user: null,
        post: null,
        role: null,
        department: null
    };
    
    state.steps.push(newStep);
    state.editingStepIndex = state.steps.length - 1;
    renderEditableSteps();
}

// Выбор пользователя для этапа
function openUserPickerForModalStep(idx) {
    if (typeof openUserSelector !== 'function') {
        showToast('Селектор пользователей недоступен', 'error');
        return;
    }
    
    const state = window.__modalRouteState;
    if (!state || !state.steps[idx]) return;
    
    const step = state.steps[idx];
    const preselectedIds = step.assignee_user_id ? [step.assignee_user_id] : [];
    
    openUserSelector({
        mode: 'single',
        title: 'Выберите исполнителя этапа',
        preselectedIds: preselectedIds,
        onConfirm: (users) => {
            if (users && users.length > 0) {
                const user = users[0];
                step.assignee_user_id = user.id;
                step.user = {
                    id: user.id,
                    full_name: `${user.surname || ''} ${user.name || ''}`.trim(),
                    ...user
                };
                renderEditableSteps();
            }
        }
    });
}

// =====================================================
// DRAG & DROP ЭТАПОВ
// =====================================================

let __modalDraggedStepIndex = null;

function handleModalStepDragStart(event, idx) {
    __modalDraggedStepIndex = idx;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(idx));
}

function handleModalStepDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.sa-step').forEach(el => el.classList.remove('drag-over'));
    __modalDraggedStepIndex = null;
}

function handleModalStepDragOver(event, idx) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    if (__modalDraggedStepIndex === null || __modalDraggedStepIndex === idx) return;
    
    event.currentTarget.classList.add('drag-over');
}

function handleModalStepDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function handleModalStepDrop(event, targetIdx) {
    event.preventDefault();
    
    if (__modalDraggedStepIndex === null || __modalDraggedStepIndex === targetIdx) {
        return;
    }
    
    const state = window.__modalRouteState;
    if (!state) return;
    
    // Перемещаем
    const [moved] = state.steps.splice(__modalDraggedStepIndex, 1);
    state.steps.splice(targetIdx, 0, moved);
    
    // Корректируем editing index
    if (state.editingStepIndex === __modalDraggedStepIndex) {
        state.editingStepIndex = targetIdx;
    } else if (state.editingStepIndex !== null) {
        if (__modalDraggedStepIndex < state.editingStepIndex && targetIdx >= state.editingStepIndex) {
            state.editingStepIndex--;
        } else if (__modalDraggedStepIndex > state.editingStepIndex && targetIdx <= state.editingStepIndex) {
            state.editingStepIndex++;
        }
    }
    
    __modalDraggedStepIndex = null;
    renderEditableSteps();
}

// Сохранить как шаблон — показать поле
function toggleSaveAsTemplateField(checked) {
    const field = document.getElementById('saveAsTemplateField');
    if (field) field.style.display = checked ? 'block' : 'none';
}


function closeSubmitApprovalModal() {
    const modal = document.getElementById('submitApprovalModal');
    if (modal) modal.remove();
}
// =====================================================
// СОГЛАСОВАНИЕ: ОПРЕДЕЛЕНИЕ ТЕКУЩЕГО ШАГА
// =====================================================

function getCurrentPendingStep(doc) {
    if (!doc || !doc.route || !doc.route.route_data?.steps) return null;
    return doc.route.route_data.steps.find(s => s.status === 'pending') || null;
}

function isCurrentStepMine(doc) {
    const step = getCurrentPendingStep(doc);
    if (!step) return false;
    
    const currentUserId = window.currentUser?.id;
    if (!currentUserId) return false;
    
    return step.user_id === currentUserId;
}
// =====================================================
// МОДАЛКИ ОДОБРЕНИЯ / ОТКЛОНЕНИЯ
// =====================================================

function openApproveModal(docId) {
    const existing = document.getElementById('approveDocModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'approveDocModal';
    modal.className = 'admin-modal active';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #10b981, #059669);">
                <h2>✅ Одобрить документ</h2>
                <button class="modal-close" onclick="closeApproveModal()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <p style="margin: 0 0 12px 0; color: var(--c_bg_txt);">
                    Вы собираетесь одобрить документ на текущем этапе.
                </p>
                <div class="sa-field">
                    <label class="sa-label">Комментарий (необязательно)</label>
                    <textarea id="approveComment" class="sa-textarea" rows="3" 
                              placeholder="Например: Согласовано, замечаний нет"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="buttonbase" onclick="closeApproveModal()">Отмена</button>
                <button class="buttonbase" id="confirmApproveBtn" style="background: #10b981;">✅ Одобрить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('confirmApproveBtn').onclick = async () => {
        const comment = document.getElementById('approveComment').value.trim();
        await doApprove(docId, comment);
    };
}

function closeApproveModal() {
    document.getElementById('approveDocModal')?.remove();
}

async function doApprove(docId, comment) {
    const btn = document.getElementById('confirmApproveBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳...'; }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${docId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ comment: comment || null })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Ошибка одобрения');
        }
        
        const data = await response.json();
        
        if (data.is_finished) {
            showToast('Документ согласован полностью!', 'success');
        } else {
            showToast('Шаг одобрен, документ передан дальше', 'success');
        }
        
        closeApproveModal();
        await loadDocumentForView(docId);
        // Обновляем дашборд (если мы на странице base.html)
        if (typeof loadAttentionDocuments === 'function') {
            loadAttentionDocuments();
        }
    } catch (error) {
        console.error('Approve error:', error);
        showToast(error.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '✅ Одобрить'; }
    }
}

// ----- ОТКЛОНЕНИЕ -----

function openRejectModal(docId) {
    const existing = document.getElementById('rejectDocModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'rejectDocModal';
    modal.className = 'admin-modal active';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                <h2>❌ Отклонить документ</h2>
                <button class="modal-close" onclick="closeRejectModal()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <p style="margin: 0 0 12px 0; color: var(--c_bg_txt);">
                    Документ вернётся автору на доработку.
                </p>
                <div class="sa-field">
                    <label class="sa-label">Причина отклонения <span style="color: var(--c_error);">*</span></label>
                    <textarea id="rejectComment" class="sa-textarea" rows="4" 
                              placeholder="Обязательно укажите, что нужно исправить..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="buttonbase" onclick="closeRejectModal()">Отмена</button>
                <button class="buttonbase" id="confirmRejectBtn" style="background: #dc3545;">❌ Отклонить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('confirmRejectBtn').onclick = async () => {
        const comment = document.getElementById('rejectComment').value.trim();
        if (!comment) {
            showToast('Укажите причину отклонения', 'error');
            return;
        }
        await doReject(docId, comment);
    };
}

function closeRejectModal() {
    document.getElementById('rejectDocModal')?.remove();
}

async function doReject(docId, comment) {
    const btn = document.getElementById('confirmRejectBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳...'; }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${docId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ comment })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Ошибка отклонения');
        }
        
        showToast('Документ возвращён на доработку', 'success');
        closeRejectModal();
        await loadDocumentForView(docId);
        // Обновляем дашборд (если мы на странице base.html)
        if (typeof loadAttentionDocuments === 'function') {
            loadAttentionDocuments();
        }
    } catch (error) {
        console.error('Reject error:', error);
        showToast(error.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '❌ Отклонить'; }
    }
}
window.openSubmitApprovalModal = openSubmitApprovalModal;
window.closeSubmitApprovalModal = closeSubmitApprovalModal;

// =====================================================
// ЭКСПОРТ
// =====================================================

window.openDocumentView = openDocumentView;
window.closeDocumentView = closeDocumentView;
window.refreshDocViewPreview = refreshDocViewPreview;
window.deleteDocViewAttachment = deleteDocViewAttachment;
window.downloadDocViewFile = downloadDocViewFile;
window.openDocumentEdit = openDocumentEdit;
window.submitDocumentForApproval = submitDocumentForApproval;
window.registerDocument = registerDocument;
window.deleteDocView = deleteDocView;
window.openSubmitApprovalModal = openSubmitApprovalModal;
window.closeSubmitApprovalModal = closeSubmitApprovalModal;
window.renderStepsPreview = renderStepsPreview;
window.renderEditableSteps = renderEditableSteps;
window.toggleModalStepEdit = toggleModalStepEdit;
window.updateModalStepProperty = updateModalStepProperty;
window.updateModalStepAssigneeType = updateModalStepAssigneeType;
window.removeModalStep = removeModalStep;
window.addModalStep = addModalStep;
window.openUserPickerForModalStep = openUserPickerForModalStep;
window.handleModalStepDragStart = handleModalStepDragStart;
window.handleModalStepDragEnd = handleModalStepDragEnd;
window.handleModalStepDragOver = handleModalStepDragOver;
window.handleModalStepDragLeave = handleModalStepDragLeave;
window.handleModalStepDrop = handleModalStepDrop;
window.toggleSaveAsTemplateField = toggleSaveAsTemplateField;
window.doSubmitApproval = doSubmitApproval;
window.openApproveModal = openApproveModal;
window.closeApproveModal = closeApproveModal;
window.openRejectModal = openRejectModal;
window.closeRejectModal = closeRejectModal;
window.getCurrentPendingStep = getCurrentPendingStep;
window.isCurrentStepMine = isCurrentStepMine;