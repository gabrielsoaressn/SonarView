-- ==========================================
-- SCHEMA DO BANCO DE DADOS - Quality Lens
-- ==========================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABELA: sonarcloud_metrics
-- Armazena métricas coletadas do SonarCloud
-- ==========================================
CREATE TABLE IF NOT EXISTS sonarcloud_metrics (
    id SERIAL PRIMARY KEY,
    project_key VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Métricas de Confiabilidade
    bugs INTEGER DEFAULT 0,
    reliability_rating VARCHAR(1) DEFAULT 'A',
    reliability_remediation_effort INTEGER DEFAULT 0,

    -- Métricas de Segurança
    vulnerabilities INTEGER DEFAULT 0,
    security_rating VARCHAR(1) DEFAULT 'A',
    security_remediation_effort INTEGER DEFAULT 0,

    -- Métricas de Manutenibilidade
    code_smells INTEGER DEFAULT 0,
    technical_debt INTEGER DEFAULT 0,
    debt_ratio DECIMAL(5,2) DEFAULT 0,
    maintainability_rating VARCHAR(1) DEFAULT 'A',

    -- Cobertura de Testes
    coverage_overall DECIMAL(5,2) DEFAULT 0,
    coverage_new DECIMAL(5,2) DEFAULT 0,

    -- Duplicação
    duplication_density DECIMAL(5,2) DEFAULT 0,

    -- Tamanho e Complexidade
    lines_of_code INTEGER DEFAULT 0,
    complexity INTEGER DEFAULT 0,

    -- Código Novo
    new_bugs INTEGER DEFAULT 0,
    new_vulnerabilities INTEGER DEFAULT 0,
    new_code_smells INTEGER DEFAULT 0,

    -- Rating Geral
    overall_rating VARCHAR(1) DEFAULT 'A',
    technical_debt_minutes INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_sonarcloud_project_timestamp
    ON sonarcloud_metrics(project_key, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sonarcloud_timestamp
    ON sonarcloud_metrics(timestamp DESC);

-- ==========================================
-- TABELA: dora_deployments
-- Armazena informações de deploys para métricas DORA
-- ==========================================
CREATE TABLE IF NOT EXISTS dora_deployments (
    id SERIAL PRIMARY KEY,
    project_key VARCHAR(255) NOT NULL,
    commit_sha VARCHAR(255) NOT NULL,
    commit_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    deployment_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    environment VARCHAR(50) DEFAULT 'production',
    status VARCHAR(20) DEFAULT 'success', -- success, failure
    branch VARCHAR(255) DEFAULT 'main',
    lead_time_minutes INTEGER,
    metadata JSONB, -- Campos extras flexíveis
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimizar queries DORA
CREATE INDEX IF NOT EXISTS idx_dora_project_deployment
    ON dora_deployments(project_key, deployment_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dora_status
    ON dora_deployments(status, deployment_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dora_commit_sha
    ON dora_deployments(commit_sha);

-- ==========================================
-- FUNÇÃO: Limpeza automática de métricas antigas
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_old_sonarcloud_metrics(
    p_project_key VARCHAR,
    p_keep_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deleta registros antigos, mantendo apenas os N mais recentes
    WITH to_delete AS (
        SELECT id
        FROM sonarcloud_metrics
        WHERE project_key = p_project_key
        ORDER BY timestamp DESC
        OFFSET p_keep_count
    )
    DELETE FROM sonarcloud_metrics
    WHERE id IN (SELECT id FROM to_delete);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNÇÃO: Limpeza automática de deployments antigos
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_old_deployments(
    p_project_key VARCHAR,
    p_keep_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deleta deployments antigos, mantendo apenas os N mais recentes
    WITH to_delete AS (
        SELECT id
        FROM dora_deployments
        WHERE project_key = p_project_key
        ORDER BY deployment_timestamp DESC
        OFFSET p_keep_count
    )
    DELETE FROM dora_deployments
    WHERE id IN (SELECT id FROM to_delete);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- VIEW: Métricas DORA agregadas (útil para análises)
-- ==========================================
CREATE OR REPLACE VIEW dora_metrics_summary AS
SELECT
    project_key,
    DATE_TRUNC('day', deployment_timestamp) as deployment_date,
    COUNT(*) as total_deployments,
    COUNT(*) FILTER (WHERE status = 'success') as successful_deployments,
    COUNT(*) FILTER (WHERE status = 'failure') as failed_deployments,
    AVG(lead_time_minutes) FILTER (WHERE status = 'success') as avg_lead_time_minutes,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_minutes)
        FILTER (WHERE status = 'success') as median_lead_time_minutes
FROM dora_deployments
GROUP BY project_key, DATE_TRUNC('day', deployment_timestamp);

-- ==========================================
-- COMENTÁRIOS NAS TABELAS (Documentação)
-- ==========================================
COMMENT ON TABLE sonarcloud_metrics IS 'Métricas de qualidade de código coletadas do SonarCloud';
COMMENT ON TABLE dora_deployments IS 'Registro de deploys para cálculo de métricas DORA';
COMMENT ON COLUMN dora_deployments.lead_time_minutes IS 'Tempo entre commit e deploy em minutos';
COMMENT ON COLUMN dora_deployments.metadata IS 'Dados extras em formato JSON (ex: autor, tags, etc)';

-- ==========================================
-- DADOS INICIAIS (Opcional)
-- ==========================================
-- Se quiser inserir dados de exemplo, adicione aqui

COMMENT ON SCHEMA public IS 'Schema principal do Quality Lens - Métricas SonarCloud e DORA';
