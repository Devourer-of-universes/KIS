// =====================================================
// СОЗДАНИЕ ДОКУМЕНТА — ЛОГИКА
// Единый сценарий: тип → шаблон → карточка
// =====================================================

// =====================================================
// СОСТОЯНИЕ
// =====================================================

let docCreateState = {
    step: 'types',          // 'types' | 'templates'
    selectedType: null,
    selectedTemplate: null,
    templatesForType: [],
    fieldValues: {},
    attachments: [],
    currentDocumentId: null,
    isEdit: false
};

// =====================================================
// ВХОДНАЯ ТОЧКА
// =====================================================

async function openDocumentCreate() {
    // Сброс состояния
    docCreateState = {
        step: 'types',
        selectedType: null,
        selectedTemplate: null,
        templatesForType: [],
        fieldValues: {},
        attachments: [],
        currentDocumentId: null,
        isEdit: false
    };
    
    openWindow('base-section-doc-new');
    renderDocCreateStep('types');
}

// =====================================================
// РЕНДЕР ШАГОВ (внутри одной секции)
// =====================================================

async function renderDocCreateStep(step, payload = {}) {
    const container = document.getElementById('docCreateContainer');
    if (!container) return;
    
    docCreateState.step = step;
    
    if (step === 'types') {
        container.innerHTML = '<div class="loading-templates">Загрузка типов документов...</div>';
        await renderDocTypesStep(container);
    } else if (step === 'templates') {
        container.innerHTML = '<div class="loading-templates">Загрузка шаблонов...</div>';
        await renderDocTemplatesStep(container, payload.type);
    }
}

// =====================================================
// ШАГ 1 — ТИПЫ ДОКУМЕНТОВ
// =====================================================

async function renderDocTypesStep(container) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/document-types?active_only=true', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки типов');
        
        const data = await response.json();
        const types = data.types || [];
        
        // Формируем HTML
        let html = `
            <div class="section-header">
                <h2>📄 Новый документ — выберите тип</h2>
                <div class="table-controls">
                    <div class="search-box">
                        <input type="text" id="docTypeSearch" placeholder="🔍 Поиск по типам..." class="search-input" oninput="filterDocTypeCards(this.value)">
                    </div>
                    <button class="sec-btn-close" onclick="closeWindow('base-section-doc-new')">
                        <img src="../materials/icons8-закрыть-80.png" alt="Закрыть">
                    </button>
                </div>
            </div>
            
            <div class="type-list" id="docTypesList">
        `;
        
        // Первая карточка — «Простой документ»
        html += `
            <button class="type-list-elem" data-type-id="__simple__" onclick="selectSimpleDocument()">
                <div class="type-icon">📝</div>
                <h4>Простой документ</h4>
                <p class="type-desc">Создать документ без шаблона — только название и описание</p>
                <div class="type-meta">Базовые поля</div>
            </button>
        `;
        
        // Карточки типов
        for (const type of types) {
            const templatesCount = type.templates_count || 0;
            const hasTemplates = templatesCount > 0;
            const icon = type.icon ? `<img src="../materials/document-icons/${type.icon}" alt="" onerror="this.parentElement.innerHTML='📄'">` : '📄';
            
            const metaText = hasTemplates 
                ? `${templatesCount} ${plural(templatesCount, ['шаблон', 'шаблона', 'шаблонов'])}`
                : 'Нет шаблонов';
            
            const disabledAttr = hasTemplates ? '' : 'disabled';
            const disabledClass = hasTemplates ? '' : 'type-list-elem-disabled';
            const onclickAttr = hasTemplates ? `onclick="selectDocumentType(${type.id})"` : '';
            const hintText = hasTemplates ? '' : '<div class="type-hint">Обратитесь к администратору</div>';
            
            html += `
                <button class="type-list-elem ${disabledClass}" 
                        data-type-id="${type.id}" 
                        data-type-name="${escapeHtmlAttr(type.name)}"
                        ${disabledAttr}
                        ${onclickAttr}>
                    <div class="type-icon">${icon}</div>
                    <h4>${escapeHtml(type.name)}</h4>
                    <p class="type-desc">${escapeHtml(type.description || 'Без описания')}</p>
                    <div class="type-meta">${metaText}</div>
                    ${hintText}
                </button>
            `;
        }
        
        html += `</div>`;
        
        // Если типов нет вообще (кроме простого документа)
        if (types.length === 0) {
            html = `
                <div class="section-header">
                    <h2>📄 Новый документ</h2>
                    <button class="sec-btn-close" onclick="closeWindow('base-section-doc-new')">
                        <img src="../materials/icons8-закрыть-80.png" alt="Закрыть">
                    </button>
                </div>
                <div class="type-list">
                    <button class="type-list-elem" onclick="selectSimpleDocument()">
                        <div class="type-icon">📝</div>
                        <h4>Простой документ</h4>
                        <p class="type-desc">Создать документ без шаблона — только название и описание</p>
                        <div class="type-meta">Базовые поля</div>
                    </button>
                </div>
                <div class="empty-templates" style="padding: 20px; text-align: center; color: var(--c_surf_txt);">
                    Других типов документов пока нет. Обратитесь к администратору.
                </div>
            `;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Render doc types step error:', error);
        container.innerHTML = `
            <div class="section-header">
                <h2>📄 Новый документ</h2>
                <button class="sec-btn-close" onclick="closeWindow('base-section-doc-new')">
                    <img src="../materials/icons8-закрыть-80.png" alt="Закрыть">
                </button>
            </div>
            <div style="padding: 40px; text-align: center; color: var(--c_error);">
                ❌ ${escapeHtml(error.message)}
            </div>
        `;
    }
}

// =====================================================
// ШАГ 2 — ШАБЛОНЫ ВЫБРАННОГО ТИПА
// =====================================================

async function renderDocTemplatesStep(container, type) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(
            `/api/document-templates?document_type_id=${type.id}&active_only=true`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!response.ok) throw new Error('Ошибка загрузки шаблонов');
        
        const data = await response.json();
        const templates = data.templates || [];
        
        docCreateState.templatesForType = templates;
        
        let html = `
            <div class="section-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button class="doc-editor-back-btn" onclick="backToDocTypes()" title="Назад к типам">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h2>📋 ${escapeHtml(type.name)} — выберите шаблон</h2>
                </div>
                <div class="table-controls">
                    <div class="search-box">
                        <input type="text" id="docTemplateSearch" placeholder="🔍 Поиск по шаблонам..." class="search-input" oninput="filterDocTemplateCards(this.value)">
                    </div>
                    <button class="sec-btn-close" onclick="closeWindow('base-section-doc-new')">
                        <img src="../materials/icons8-закрыть-80.png" alt="Закрыть">
                    </button>
                </div>
            </div>
            
            <div class="type-list" id="docTemplatesList">
        `;
        
        for (const tmpl of templates) {
            const fieldsCount = tmpl.template_data?.fields?.length || 0;
            const hasDocx = tmpl.template_file_uri ? '📎' : '⚠️';
            
            html += `
                <button class="type-list-elem" 
                        data-template-id="${tmpl.id}"
                        data-template-name="${escapeHtmlAttr(tmpl.name)}"
                        onclick="selectDocumentTemplate(${tmpl.id})">
                    <div class="type-icon">📋</div>
                    <h4>${escapeHtml(tmpl.name)}</h4>
                    <p class="type-desc">${escapeHtml(tmpl.description || 'Без описания')}</p>
                    <div class="type-meta">${hasDocx} ${fieldsCount} ${plural(fieldsCount, ['поле', 'поля', 'полей'])}</div>
                </button>
            `;
        }
        
        html += `</div>`;
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Render doc templates step error:', error);
        container.innerHTML = `
            <div class="section-header">
                <button class="doc-editor-back-btn" onclick="backToDocTypes()">← Назад</button>
                <h2>Ошибка</h2>
            </div>
            <div style="padding: 40px; text-align: center; color: var(--c_error);">
                ❌ ${escapeHtml(error.message)}
            </div>
        `;
    }
}

// =====================================================
// ДЕЙСТВИЯ ПОЛЬЗОВАТЕЛЯ
// =====================================================

// Простой документ — сразу карточка без шаблона
function selectSimpleDocument() {
    docCreateState.selectedType = null;
    docCreateState.selectedTemplate = null;
    docCreateState.fieldValues = {};
    openDocumentCardSimple();
}

// Выбор типа документа
// Вспомогательная: грузит полный объект шаблона (с template_data) по ID
async function fetchFullTemplate(templateId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/document-templates/${templateId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Шаблон не найден');
    const data = await response.json();
    if (!data.template) throw new Error('Шаблон не найден');
    return data.template;
}

// Выбор типа документа
async function selectDocumentType(typeId) {
    try {
        const token = localStorage.getItem('token');
        const typeRes = await fetch(`/api/document-types/${typeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!typeRes.ok) throw new Error('Тип не найден');
        const typeData = await typeRes.json();
        const type = typeData.type;
        
        docCreateState.selectedType = type;
        
        // Загружаем список шаблонов этого типа
        const tmplRes = await fetch(
            `/api/document-templates?document_type_id=${typeId}&active_only=true`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!tmplRes.ok) throw new Error('Ошибка загрузки шаблонов');
        const tmplData = await tmplRes.json();
        const templates = tmplData.templates || [];
        
        docCreateState.templatesForType = templates;
        
        // Один шаблон — грузим его полный объект и сразу открываем карточку
        if (templates.length === 1) {
            const fullTemplate = await fetchFullTemplate(templates[0].id);
            openDocumentCardWithTemplate(fullTemplate, type);
            return;
        }
        
        // Иначе — рендерим шаг выбора шаблона
        renderDocCreateStep('templates', { type });
        
    } catch (error) {
        console.error('Select document type error:', error);
        showToast(error.message, 'error');
    }
}

// Выбор шаблона
async function selectDocumentTemplate(templateId) {
    try {
        const fullTemplate = await fetchFullTemplate(templateId);
        openDocumentCardWithTemplate(fullTemplate, docCreateState.selectedType);
    } catch (error) {
        console.error('Select document template error:', error);
        showToast(error.message, 'error');
    }
}

// Назад к типам
function backToDocTypes() {
    docCreateState.selectedType = null;
    docCreateState.selectedTemplate = null;
    docCreateState.templatesForType = [];
    renderDocCreateStep('types');
}

// =====================================================
// ФИЛЬТРЫ ПОИСКА (на фронте)
// =====================================================

function filterDocTypeCards(searchText) {
    const text = (searchText || '').toLowerCase();
    document.querySelectorAll('#docTypesList .type-list-elem').forEach(card => {
        const name = card.querySelector('h4')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.type-desc')?.textContent.toLowerCase() || '';
        card.style.display = (name.includes(text) || desc.includes(text)) ? '' : 'none';
    });
}

function filterDocTemplateCards(searchText) {
    const text = (searchText || '').toLowerCase();
    document.querySelectorAll('#docTemplatesList .type-list-elem').forEach(card => {
        const name = card.querySelector('h4')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.type-desc')?.textContent.toLowerCase() || '';
        card.style.display = (name.includes(text) || desc.includes(text)) ? '' : 'none';
    });
}

// =====================================================
// КАРТОЧКА ДОКУМЕНТА
// =====================================================

function openDocumentCardSimple() {
    // Простой документ — только название и описание
    document.getElementById('docEditorTitle').textContent = '📄 Новый документ';
    document.getElementById('docEditorTypeName').textContent = 'Простой документ';
    document.getElementById('docEditorTemplateName').textContent = 'Без шаблона';
    
    const badge = document.getElementById('docEditorStatusBadge');
    badge.textContent = '📝 Черновик';
    badge.className = 'doc-editor-status-badge draft';
    
    docCreateState.fieldValues = {};
    
    // Рендерим форму с базовыми полями
    renderSimpleDocumentForm();
    refreshDocumentPreview();
    
    openWindow('base-section-document-card');
}

function openDocumentCardWithTemplate(template, type) {
    docCreateState.selectedType = type;
    docCreateState.selectedTemplate = template;
    docCreateState.fieldValues = {};
    
    document.getElementById('docEditorTitle').textContent = '📄 Новый документ';
    document.getElementById('docEditorTypeName').textContent = type?.name || '—';
    document.getElementById('docEditorTemplateName').textContent = template?.name || 'Без шаблона';
    
    const badge = document.getElementById('docEditorStatusBadge');
    badge.textContent = '📝 Черновик';
    badge.className = 'doc-editor-status-badge draft';
    
    // Инициализируем значения полей дефолтными
    if (template?.template_data?.fields) {
        template.template_data.fields.forEach(field => {
            docCreateState.fieldValues[field.key] = field.defaultValue || '';
        });
    }
    
    renderDocumentForm();
    refreshDocumentPreview();
    
    openWindow('base-section-document-card');
}

// =====================================================
// ФОРМА ДОКУМЕНТА
// =====================================================

function renderSimpleDocumentForm() {
    const container = document.getElementById('docFormFields');
    if (!container) return;
    
    container.innerHTML = `
        <div class="doc-form-field">
            <label>Название документа <span class="required-star">*</span></label>
            <input type="text" data-field-key="title" placeholder="Введите название" 
                   oninput="onDocFieldChange('title', this.value)">
        </div>
        <div class="doc-form-field">
            <label>Описание</label>
            <textarea data-field-key="description" rows="4" placeholder="Введите описание" 
                      oninput="onDocFieldChange('description', this.value)"></textarea>
        </div>
    `;
}

function renderDocumentForm() {
    const container = document.getElementById('docFormFields');
    if (!container) return;
    
    const template = docCreateState.selectedTemplate;
    if (!template || !template.template_data?.fields || template.template_data.fields.length === 0) {
        renderSimpleDocumentForm();
        return;
    }
    
    container.innerHTML = template.template_data.fields.map(field => {
        const value = docCreateState.fieldValues[field.key] || '';
        const required = field.required ? '<span class="required-star">*</span>' : '';
        
        let inputHtml = '';
        switch (field.type) {
            case 'text':
                inputHtml = `<input type="text" 
                                    data-field-key="${escapeHtmlAttr(field.key)}" 
                                    placeholder="${escapeHtmlAttr(field.placeholder || '')}" 
                                    value="${escapeHtmlAttr(value)}"
                                    oninput="onDocFieldChange('${escapeHtmlAttr(field.key)}', this.value)">`;
                break;
            case 'textarea':
                inputHtml = `<textarea data-field-key="${escapeHtmlAttr(field.key)}" 
                                       rows="4"
                                       placeholder="${escapeHtmlAttr(field.placeholder || '')}"
                                       oninput="onDocFieldChange('${escapeHtmlAttr(field.key)}', this.value)">${escapeHtml(value)}</textarea>`;
                break;
            case 'number':
                inputHtml = `<input type="number" 
                                    data-field-key="${escapeHtmlAttr(field.key)}" 
                                    placeholder="${escapeHtmlAttr(field.placeholder || '')}" 
                                    value="${escapeHtmlAttr(value)}"
                                    oninput="onDocFieldChange('${escapeHtmlAttr(field.key)}', this.value)">`;
                break;
            case 'date':
                inputHtml = `<input type="date" 
                                    data-field-key="${escapeHtmlAttr(field.key)}" 
                                    value="${escapeHtmlAttr(value)}"
                                    onchange="onDocFieldChange('${escapeHtmlAttr(field.key)}', this.value)">`;
                break;
            case 'select':
                inputHtml = `<select data-field-key="${escapeHtmlAttr(field.key)}" 
                                    onchange="onDocFieldChange('${escapeHtmlAttr(field.key)}', this.value)">
                    <option value="">${escapeHtmlAttr(field.placeholder || '— Выберите —')}</option>
                    ${(field.options || []).map(opt => 
                        `<option value="${escapeHtmlAttr(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`
                    ).join('')}
                </select>`;
                break;
            case 'checkbox':
                inputHtml = `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input type="checkbox" 
                           data-field-key="${escapeHtmlAttr(field.key)}" 
                           ${value === true || value === 'true' ? 'checked' : ''}
                           onchange="onDocFieldChange('${escapeHtmlAttr(field.key)}', this.checked)">
                    <span>${escapeHtml(field.placeholder || 'Да')}</span>
                </label>`;
                break;
            case 'user':
                inputHtml = `<div class="doc-form-user-picker">
                    <button type="button" class="doc-form-user-display" 
                            onclick="openUserSelectorForDocField('${escapeHtmlAttr(field.key)}')">
                        ${value ? escapeHtml(value.full_name || value) : '👤 Выбрать пользователя'}
                    </button>
                </div>`;
                break;
            case 'counterparty':
                inputHtml = `<div class="doc-form-user-picker">
                    <button type="button" class="doc-form-user-display" 
                            onclick="openCounterpartySelectorForDocField('${escapeHtmlAttr(field.key)}')">
                        ${value ? escapeHtml(value.name || value) : '🏢 Выбрать контрагента'}
                    </button>
                </div>`;
                break;
            default:
                inputHtml = `<input type="text" 
                                    data-field-key="${escapeHtmlAttr(field.key)}" 
                                    value="${escapeHtmlAttr(value)}"
                                    oninput="onDocFieldChange('${escapeHtmlAttr(field.key)}', this.value)">`;
        }
        
        return `
            <div class="doc-form-field">
                <label>${escapeHtml(field.label)}${required}</label>
                ${inputHtml}
            </div>
        `;
    }).join('');
}

function onDocFieldChange(key, value) {
    docCreateState.fieldValues[key] = value;
    debouncedRefreshPreview();
}

// debounce для превью
let _previewTimeout = null;
function debouncedRefreshPreview() {
    clearTimeout(_previewTimeout);
    _previewTimeout = setTimeout(() => {
        refreshDocumentPreview();
    }, 600);
}

// =====================================================
// LIVE-PREVIEW
// =====================================================

async function refreshDocumentPreview() {
    const container = document.getElementById('docPreviewContent');
    if (!container) return;
    
    const template = docCreateState.selectedTemplate;
    if (!template || !template.template_file_uri) {
        container.innerHTML = `
            <div class="doc-preview-empty">
                <div class="doc-preview-empty-icon">📄</div>
                <div class="doc-preview-empty-text">Предпросмотр недоступен</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '<div class="doc-preview-loading">⏳ Обновление...</div>';
    
    try {
        const token = localStorage.getItem('token');
        
        // Собираем значения полей в простой формат (без объектов)
        const fieldValues = {};
        Object.keys(docCreateState.fieldValues).forEach(key => {
            const val = docCreateState.fieldValues[key];
            if (val && typeof val === 'object' && val.id) {
                fieldValues[key] = val.id;
            } else {
                fieldValues[key] = val;
            }
        });
        
        const response = await fetch(`/api/document-templates/${template.id}/preview-with-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ field_values: fieldValues })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка превью');
        }
        
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
            // Оборачиваем HTML в A4-страницу
            container.innerHTML = `<div class="docx-page">${rawHtml}</div>`;
        }
        
    } catch (error) {
        console.error('Preview error:', error);
        container.innerHTML = `
            <div class="doc-preview-empty">
                <div class="doc-preview-empty-icon">⚠️</div>
                <div class="doc-preview-empty-text">Не удалось создать превью</div>
            </div>
        `;
    }
}

// =====================================================
// СОХРАНЕНИЕ
// =====================================================

async function saveDocumentDraft() {
    return await saveDocumentWithStatus('draft');
}

async function saveDocument() {
    const currentStatus = docCreateState.currentStatus || 'draft';
    return await saveDocumentWithStatus(currentStatus);
}

async function saveDocumentWithStatus(status) {
    // Определяем название
    let title = docCreateState.fieldValues.title;
    
    if (!title) {
        // Для шаблонов без поля "title" — генерируем из типа и даты
        const typeName = docCreateState.selectedType?.name || 'Документ';
        const date = new Date().toLocaleDateString('ru-RU');
        title = `${typeName} от ${date}`;
    }
    
    // Собираем значения полей
    const fieldValues = { ...docCreateState.fieldValues };
    Object.keys(fieldValues).forEach(key => {
        const val = fieldValues[key];
        if (val && typeof val === 'object' && val.id) {
            fieldValues[key] = val.id;
        }
    });
    
    const payload = {
        title: title,
        document_type_id: docCreateState.selectedType?.id || null,
        template_id: docCreateState.selectedTemplate?.id || null,
        field_values: fieldValues,
        status: status
    };
    
    try {
        const token = localStorage.getItem('token');
        let response;
        
        if (docCreateState.currentDocumentId) {
            response = await fetch(`/api/documents/${docCreateState.currentDocumentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch('/api/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка сохранения');
        }
        
        const result = await response.json();
        docCreateState.currentDocumentId = result.document?.id;
        
        showToast('Документ сохранён', 'success');
        
        // Возвращаемся в реестр "Недавние"
        closeDocumentEditor();
        
    } catch (error) {
        console.error('Save document error:', error);
        showToast(error.message, 'error');
    }
}

function closeDocumentEditor() {
    openWindow('base-section-doc-last');
    if (typeof loadDocuments === 'function') {
        loadDocuments('recent');
    }
}

// =====================================================
// ВСПОМОГАТЕЛЬНОЕ
// =====================================================

// Простая плюрализация
function plural(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
}

// Экранирование для HTML-текста
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Экранирование для атрибутов (HTML + кавычки)
function escapeHtmlAttr(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// =====================================================
// ЭКСПОРТ
// =====================================================

window.openDocumentCreate = openDocumentCreate;
window.renderDocCreateStep = renderDocCreateStep;
window.selectSimpleDocument = selectSimpleDocument;
window.selectDocumentType = selectDocumentType;
window.selectDocumentTemplate = selectDocumentTemplate;
window.backToDocTypes = backToDocTypes;
window.filterDocTypeCards = filterDocTypeCards;
window.filterDocTemplateCards = filterDocTemplateCards;
window.onDocFieldChange = onDocFieldChange;
window.refreshDocumentPreview = refreshDocumentPreview;
window.saveDocumentDraft = saveDocumentDraft;
window.saveDocument = saveDocument;
window.closeDocumentEditor = closeDocumentEditor;

// Заглушки для селекторов — оставляем как было, только переименовываем
window.openUserSelectorForDocField = function(fieldKey) {
    if (typeof openUserSelector !== 'function') {
        showToast('Селектор пользователей недоступен', 'error');
        return;
    }
    
    // Достаём текущее значение
    const currentValue = docCreateState.fieldValues[fieldKey];
    const preselectedIds = [];
    if (currentValue && typeof currentValue === 'object' && currentValue.id) {
        preselectedIds.push(currentValue.id);
    } else if (typeof currentValue === 'number') {
        preselectedIds.push(currentValue);
    }
    
    openUserSelector({
        mode: 'single',
        title: 'Выберите пользователя',
        preselectedIds: preselectedIds,
        onConfirm: (users) => {
            if (users && users.length > 0) {
                const user = users[0];
                docCreateState.fieldValues[fieldKey] = {
                    id: user.id,
                    full_name: `${user.surname || ''} ${user.name || ''}`.trim()
                };
                renderDocumentForm();
                refreshDocumentPreview();
            }
        }
    });
};
// =====================================================
// СЕЛЕКТОР КОНТРАГЕНТА
// =====================================================

window.openCounterpartySelectorForDocField = async function(fieldKey) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/counterparties?active_only=true&limit=200', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки контрагентов');
        
        const data = await response.json();
        const counterparties = data.counterparties || [];
        
        // Открываем модалку
        openCounterpartyPickerModal(counterparties, fieldKey);
        
    } catch (error) {
        console.error('Open counterparty selector error:', error);
        showToast(error.message, 'error');
    }
};

function openCounterpartyPickerModal(counterparties, fieldKey) {
    // Удаляем существующую модалку, если есть
    const existing = document.getElementById('counterpartyPickerModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'counterpartyPickerModal';
    modal.className = 'admin-modal active';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 80vh;">
            <div class="modal-header">
                <h2>🏢 Выбор контрагента</h2>
                <button class="modal-close" onclick="closeCounterpartyPickerModal()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <div class="search-box" style="margin-bottom: 16px;">
                    <input type="text" id="cpPickerSearch" class="form-input" 
                           placeholder="🔍 Поиск по названию или ИНН..." 
                           oninput="filterCounterpartyPicker(this.value)">
                </div>
                <div id="cpPickerList" style="max-height: 400px; overflow-y: auto;">
                    ${counterparties.length === 0 ? 
                        '<div style="text-align: center; padding: 40px; color: var(--c_surf_txt);">Нет контрагентов</div>' :
                        counterparties.map(cp => `
                            <div class="cp-picker-item" 
                                 data-cp-id="${cp.id}"
                                 data-cp-name="${escapeHtmlAttr(cp.name)}"
                                 data-cp-search="${escapeHtmlAttr((cp.name + ' ' + (cp.inn || '')).toLowerCase())}"
                                 onclick="selectCounterpartyForDocField('${escapeHtmlAttr(fieldKey)}', ${cp.id}, '${escapeHtmlAttr(cp.name)}')"
                                 style="padding: 12px 16px; border-bottom: 1px solid var(--c_surf_txt); cursor: pointer; transition: background 0.2s;">
                                <div style="font-weight: 600;">${escapeHtml(cp.name)}</div>
                                ${cp.inn ? `<div style="font-size: 12px; color: var(--c_surf_txt); margin-top: 2px;">ИНН: ${escapeHtml(cp.inn)}</div>` : ''}
                                ${cp.contact_person ? `<div style="font-size: 12px; color: var(--c_surf_txt);">Контакт: ${escapeHtml(cp.contact_person)}</div>` : ''}
                            </div>
                        `).join('')
                    }
                </div>
            </div>
            <div class="modal-footer">
                <button class="buttonbase" onclick="closeCounterpartyPickerModal()">Отмена</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeCounterpartyPickerModal() {
    const modal = document.getElementById('counterpartyPickerModal');
    if (modal) modal.remove();
}

function filterCounterpartyPicker(searchText) {
    const text = (searchText || '').toLowerCase();
    document.querySelectorAll('#cpPickerList .cp-picker-item').forEach(item => {
        const search = item.dataset.cpSearch || '';
        item.style.display = search.includes(text) ? '' : 'none';
    });
}

function selectCounterpartyForDocField(fieldKey, cpId, cpName) {
    docCreateState.fieldValues[fieldKey] = {
        id: cpId,
        name: cpName
    };
    renderDocumentForm();
    refreshDocumentPreview();
    closeCounterpartyPickerModal();
}

window.openCounterpartyPickerModal = openCounterpartyPickerModal;
window.closeCounterpartyPickerModal = closeCounterpartyPickerModal;
window.filterCounterpartyPicker = filterCounterpartyPicker;
window.selectCounterpartyForDocField = selectCounterpartyForDocField;