-- =====================================================
-- МОДУЛЬ ДОКУМЕНТООБОРОТА
-- Версия: 1.0
-- Зависимости: users, departments, roles, workflow_templates
-- =====================================================

-- =====================================================
-- 1. СПРАВОЧНИК КОНТРАГЕНТОВ (глобальный)
-- =====================================================

CREATE TABLE IF NOT EXISTS counterparties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500),
    inn VARCHAR(12),
    kpp VARCHAR(9),
    ogrn VARCHAR(15),
    address TEXT,
    postal_address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    contact_person VARCHAR(200),
    contact_position VARCHAR(150),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE counterparties IS 'Справочник контрагентов (глобальный)';

CREATE INDEX IF NOT EXISTS idx_counterparties_name ON counterparties(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_counterparties_inn ON counterparties(inn) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_counterparties_active ON counterparties(is_active) WHERE deleted_at IS NULL;

-- =====================================================
-- 2. ТИПЫ ДОКУМЕНТОВ
-- =====================================================

CREATE TABLE IF NOT EXISTS document_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    
    -- Настройки нумерации
    numbering_enabled BOOLEAN DEFAULT true,
    numbering_pattern VARCHAR(200) DEFAULT '№{N:4}/{YYYY:4}',
    numbering_reset_period VARCHAR(20) DEFAULT 'year',
    numbering_next INTEGER DEFAULT 1,
    numbering_separator VARCHAR(10) DEFAULT '',
    
    -- Связки
    default_workflow_template_id INTEGER REFERENCES workflow_templates(id) ON DELETE SET NULL,
    default_document_template_id INTEGER,
    
    -- Состояние
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Метаданные
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE document_types IS 'Типы документов (приказ, договор, отчёт и т.д.)';
COMMENT ON COLUMN document_types.numbering_pattern IS 
'Шаблон номера. Переменные: {N:5}, {YYYY:4}, {YY:2}, {MM:2}, {DD:2}, {TYPE}';
COMMENT ON COLUMN document_types.numbering_reset_period IS 
'Сброс счётчика: year, month, never';

CREATE INDEX IF NOT EXISTS idx_document_types_code ON document_types(code);
CREATE INDEX IF NOT EXISTS idx_document_types_active ON document_types(is_active);

-- =====================================================
-- 3. ШАБЛОНЫ ДОКУМЕНТОВ
-- =====================================================

CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type_id INTEGER NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    
    -- Файл .docx шаблона
    template_file_uri VARCHAR(500),
    template_file_name VARCHAR(255),
    template_file_size INTEGER,
    
    -- Описание полей и маппинга плейсхолдеров
    template_data JSONB NOT NULL DEFAULT '{"fields": [], "placeholders": {}, "settings": {}}',
    
    -- Маршрут по умолчанию (если не берётся из типа документа)
    default_workflow_template_id INTEGER REFERENCES workflow_templates(id) ON DELETE SET NULL,
    
    -- Права доступа к шаблону
    access_mode VARCHAR(20) DEFAULT 'all',       -- all, department, roles, specific
    access_user_ids INTEGER[],
    access_department_ids INTEGER[],
    access_role_ids INTEGER[],
    
    -- Метаданные
    usage_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE document_templates IS 'Шаблоны документов с описанием полей и .docx-файлом';
COMMENT ON COLUMN document_templates.template_data IS 
'Структура: { "fields": [...], "placeholders": {...}, "settings": {...} }';

CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(document_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_templates_user ON document_templates(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active) WHERE deleted_at IS NULL;

-- =====================================================
-- 4. ДОКУМЕНТЫ
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    
    -- Основное
    title VARCHAR(255) NOT NULL,
    document_type_id INTEGER NOT NULL REFERENCES document_types(id),
    template_id INTEGER REFERENCES document_templates(id) ON DELETE SET NULL,
    
    -- Регистрационный номер (заполняется при регистрации)
    reg_number VARCHAR(100),
    reg_date DATE,
    registered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Значения полей из шаблона: { "field_key": value, ... }
    field_values JSONB DEFAULT '{}',
    
    -- Сгенерированный файл .docx
    generated_file_uri VARCHAR(500),
    generated_file_name VARCHAR(255),
    generated_at TIMESTAMPTZ,
    
    -- Версионирование
    current_version INTEGER DEFAULT 1,
    
    -- Статусы: draft, on_approval, revision, approved, signed, registered, archived, cancelled
    status VARCHAR(30) DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- Автор
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    
    -- Процесс
    workflow_instance_id INTEGER REFERENCES workflow_instances(id) ON DELETE SET NULL,
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE documents IS 'Документы системы';
COMMENT ON COLUMN documents.status IS 
'draft, on_approval, revision, approved, signed, registered, archived, cancelled';
COMMENT ON COLUMN documents.field_values IS 
'Значения полей документа: { "field_key": value }';

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_reg_number ON documents(reg_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_workflow ON documents(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department_id) WHERE deleted_at IS NULL;

-- Обновляем default_document_template_id в document_types (отложенная ссылка)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_document_types_default_template'
    ) THEN
        ALTER TABLE document_types
        ADD CONSTRAINT fk_document_types_default_template
        FOREIGN KEY (default_document_template_id) 
        REFERENCES document_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 5. ВЕРСИИ ДОКУМЕНТОВ
-- =====================================================

CREATE TABLE IF NOT EXISTS document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Снимок значений полей на момент версии
    field_values JSONB,
    
    -- Сгенерированный файл
    file_uri VARCHAR(500),
    file_name VARCHAR(255),
    
    -- Причина изменения
    comment TEXT,
    
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, version_number)
);

COMMENT ON TABLE document_versions IS 'История версий документа';

CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id, version_number DESC);

-- =====================================================
-- 6. ДОСТУП К ДОКУМЕНТАМ
-- =====================================================

CREATE TABLE IF NOT EXISTS document_access (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Кому доступ: либо пользователь, либо подразделение
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    
    -- Тип доступа: view, edit, full
    access_level VARCHAR(20) DEFAULT 'view',
    
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (
        (user_id IS NOT NULL AND department_id IS NULL) OR
        (user_id IS NULL AND department_id IS NOT NULL)
    )
);

COMMENT ON TABLE document_access IS 'Права доступа к конкретным документам';

CREATE INDEX IF NOT EXISTS idx_document_access_doc ON document_access(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_user ON document_access(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_access_dept ON document_access(department_id) WHERE department_id IS NOT NULL;

-- =====================================================
-- 7. МАРШРУТЫ СОГЛАСОВАНИЯ (для каждого документа)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_routes (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Откуда взяли маршрут
    workflow_template_id INTEGER REFERENCES workflow_templates(id) ON DELETE SET NULL,
    
    -- Слепок маршрута со статусами шагов
    route_data JSONB NOT NULL DEFAULT '{"steps": [], "allow_parallel": false, "auto_start": true}',
    
    -- Флаг, запущен ли процесс (после запуска менять нельзя)
    is_started BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ,
    
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE document_routes IS 'Маршруты согласования конкретных документов';
COMMENT ON COLUMN document_routes.route_data IS 
'Слепок: { "steps": [{ id, order, type, user_id, role, status, comment, completed_at }], ... }';

CREATE INDEX IF NOT EXISTS idx_document_routes_doc ON document_routes(document_id);

-- =====================================================
-- 8. ПОДПИСИ (заглушка ЭЦП)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_signatures (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id INTEGER REFERENCES document_versions(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Тип подписи: simple (заглушка), qualified (будущая ЭЦП)
    signature_type VARCHAR(20) DEFAULT 'simple',
    signed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    
    -- Заглушечные поля для будущей реальной ЭЦП
    certificate_serial VARCHAR(100),
    signature_hash TEXT,
    
    -- Отпечаток версии файла на момент подписи
    file_hash VARCHAR(128)
);

COMMENT ON TABLE document_signatures IS 'Подписи документов (заглушка ЭЦП)';

CREATE INDEX IF NOT EXISTS idx_document_signatures_doc ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_user ON document_signatures(user_id);

-- =====================================================
-- 9. ВЛОЖЕНИЯ ДОКУМЕНТОВ
-- =====================================================

CREATE TABLE IF NOT EXISTS document_attachments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    file_uri VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE document_attachments IS 'Вложения документов (дополнительные файлы)';

CREATE INDEX IF NOT EXISTS idx_document_attachments_doc ON document_attachments(document_id);

-- =====================================================
-- 10. СЧЁТЧИКИ НУМЕРАЦИИ
-- =====================================================

CREATE TABLE IF NOT EXISTS document_numbering_counters (
    id SERIAL PRIMARY KEY,
    document_type_id INTEGER NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    
    -- Ключ периода: '2025', '2025-09', 'all'
    period_key VARCHAR(20) NOT NULL,
    last_number INTEGER DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_type_id, period_key)
);

COMMENT ON TABLE document_numbering_counters IS 'Счётчики нумерации документов по типам и периодам';

CREATE INDEX IF NOT EXISTS idx_numbering_type_period ON document_numbering_counters(document_type_id, period_key);

-- =====================================================
-- КОНЕЦ МОДУЛЯ ДОКУМЕНТООБОРОТА
-- =====================================================