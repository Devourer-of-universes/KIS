-- =====================================================
-- WORKFLOW (ПРОЦЕССЫ)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES workflow_templates(id) ON DELETE SET NULL,
    started_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    current_step_index INTEGER DEFAULT 0,
    data JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_created_by ON workflow_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_instances_template ON workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_started_by ON workflow_instances(started_by);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);