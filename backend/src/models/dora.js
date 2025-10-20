// models/dora.js
const { queryWithRetry } = require('../config/database');

/**
 * Salva um novo deployment
 */
const saveDeployment = async (deploymentData) => {
  // Calcular lead time se não foi fornecido
  let leadTimeMinutes = deploymentData.leadTimeMinutes;
  
  if (!leadTimeMinutes && deploymentData.commitTimestamp && deploymentData.deploymentTimestamp) {
    const commitTime = new Date(deploymentData.commitTimestamp);
    const deployTime = new Date(deploymentData.deploymentTimestamp);
    leadTimeMinutes = Math.round((deployTime - commitTime) / 1000 / 60);
  }

  const query = `
    INSERT INTO dora_deployments (
      project_key, commit_sha, commit_timestamp, deployment_timestamp,
      environment, status, branch, lead_time_minutes, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) RETURNING *
  `;

  const values = [
    deploymentData.projectKey,
    deploymentData.commitSha,
    deploymentData.commitTimestamp,
    deploymentData.deploymentTimestamp || new Date().toISOString(),
    deploymentData.environment || 'production',
    deploymentData.status || 'success',
    deploymentData.branch || 'main',
    leadTimeMinutes,
    deploymentData.metadata ? JSON.stringify(deploymentData.metadata) : null
  ];

  try {
    const result = await queryWithRetry(query, values);
    
    // Limpar deployments antigos (manter apenas últimos 500)
    await cleanupOldDeployments(deploymentData.projectKey, 500);
    
    return formatDeploymentResponse(result.rows[0]);
  } catch (err) {
    console.error('❌ Erro ao salvar deployment:', err);
    throw err;
  }
};

/**
 * Busca deployments de um período
 */
const getDeployments = async (projectKey, days = 30) => {
  const query = `
    SELECT * FROM dora_deployments
    WHERE project_key = $1
      AND deployment_timestamp >= NOW() - INTERVAL '1 day' * $2
    ORDER BY deployment_timestamp DESC
  `;

  try {
    const result = await queryWithRetry(query, [projectKey, days]);
    return result.rows.map(formatDeploymentResponse);
  } catch (err) {
    console.error('❌ Erro ao buscar deployments:', err);
    throw err;
  }
};

/**
 * Calcula métricas DORA agregadas
 */
const calculateDoraMetrics = async (projectKey, days = 30) => {
  const query = `
    SELECT 
      COUNT(*) as total_deployments,
      COUNT(*) FILTER (WHERE status = 'success') as successful_deployments,
      COUNT(*) FILTER (WHERE status = 'failure') as failed_deployments,
      ROUND(
        COALESCE(
          (COUNT(*) FILTER (WHERE status = 'failure')::DECIMAL / NULLIF(COUNT(*), 0) * 100),
          0
        ),
        2
      ) as change_failure_rate,
      ROUND(
        AVG(lead_time_minutes) FILTER (WHERE status = 'success'),
        2
      ) as avg_lead_time_minutes,
      ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_minutes) FILTER (WHERE status = 'success'),
        2
      ) as median_lead_time_minutes,
      MIN(deployment_timestamp) as first_deployment,
      MAX(deployment_timestamp) as last_deployment,
      
      -- Deployment Frequency (deployments por dia)
      ROUND(
        COUNT(*)::DECIMAL / NULLIF($2, 0),
        2
      ) as deployment_frequency_per_day,
      
      -- MTTR (Mean Time to Restore) - tempo médio entre falha e próximo sucesso
      (
        SELECT ROUND(AVG(time_to_restore), 2)
        FROM (
          SELECT 
            EXTRACT(EPOCH FROM (
              LEAD(deployment_timestamp) OVER (ORDER BY deployment_timestamp) - deployment_timestamp
            )) / 60 as time_to_restore
          FROM dora_deployments
          WHERE project_key = $1
            AND deployment_timestamp >= NOW() - INTERVAL '1 day' * $2
            AND status = 'failure'
        ) failures
        WHERE time_to_restore IS NOT NULL
      ) as mean_time_to_restore_minutes
      
    FROM dora_deployments
    WHERE project_key = $1
      AND deployment_timestamp >= NOW() - INTERVAL '1 day' * $2
  `;

  try {
    const result = await queryWithRetry(query, [projectKey, days]);
    const metrics = result.rows[0];

    return {
      projectKey,
      period: {
        days,
        firstDeployment: metrics.first_deployment,
        lastDeployment: metrics.last_deployment
      },
      deploymentFrequency: {
        total: parseInt(metrics.total_deployments),
        perDay: parseFloat(metrics.deployment_frequency_per_day),
        description: getFrequencyDescription(parseFloat(metrics.deployment_frequency_per_day))
      },
      leadTime: {
        average: parseFloat(metrics.avg_lead_time_minutes) || 0,
        median: parseFloat(metrics.median_lead_time_minutes) || 0,
        unit: 'minutes',
        description: getLeadTimeDescription(parseFloat(metrics.avg_lead_time_minutes))
      },
      changeFailureRate: {
        rate: parseFloat(metrics.change_failure_rate),
        failures: parseInt(metrics.failed_deployments),
        total: parseInt(metrics.total_deployments),
        description: getChangeFailureDescription(parseFloat(metrics.change_failure_rate))
      },
      meanTimeToRestore: {
        average: parseFloat(metrics.mean_time_to_restore_minutes) || 0,
        unit: 'minutes',
        description: getMTTRDescription(parseFloat(metrics.mean_time_to_restore_minutes))
      }
    };
  } catch (err) {
    console.error('❌ Erro ao calcular métricas DORA:', err);
    throw err;
  }
};

/**
 * Limpa deployments antigos
 */
const cleanupOldDeployments = async (projectKey, keepCount = 500) => {
  const query = `SELECT cleanup_old_deployments($1, $2)`;
  
  try {
    const result = await queryWithRetry(query, [projectKey, keepCount]);
    const deletedCount = result.rows[0].cleanup_old_deployments;
    
    if (deletedCount > 0) {
      console.log(`🧹 Limpeza: ${deletedCount} deployments antigos removidos`);
    }
    
    return deletedCount;
  } catch (err) {
    console.error('❌ Erro ao limpar deployments antigos:', err);
    return 0;
  }
};

/**
 * Formata o resultado do banco para o formato da API
 */
const formatDeploymentResponse = (row) => {
  return {
    id: row.id,
    projectKey: row.project_key,
    commitSha: row.commit_sha,
    commitTimestamp: row.commit_timestamp,
    deploymentTimestamp: row.deployment_timestamp,
    environment: row.environment,
    status: row.status,
    branch: row.branch,
    leadTimeMinutes: row.lead_time_minutes,
    metadata: row.metadata,
    createdAt: row.created_at
  };
};

// Funções auxiliares para descrições das métricas

const getFrequencyDescription = (perDay) => {
  if (perDay >= 1) return 'Elite';
  if (perDay >= 0.14) return 'High'; // ~1 por semana
  if (perDay >= 0.03) return 'Medium'; // ~1 por mês
  return 'Low';
};

const getLeadTimeDescription = (minutes) => {
  if (minutes <= 60) return 'Elite'; // < 1 hora
  if (minutes <= 1440) return 'High'; // < 1 dia
  if (minutes <= 10080) return 'Medium'; // < 1 semana
  return 'Low';
};

const getChangeFailureDescription = (rate) => {
  if (rate <= 15) return 'Elite';
  if (rate <= 30) return 'High';
  if (rate <= 45) return 'Medium';
  return 'Low';
};

const getMTTRDescription = (minutes) => {
  if (minutes <= 60) return 'Elite'; // < 1 hora
  if (minutes <= 1440) return 'High'; // < 1 dia
  if (minutes <= 10080) return 'Medium'; // < 1 semana
  return 'Low';
};

module.exports = {
  saveDeployment,
  getDeployments,
  calculateDoraMetrics,
  cleanupOldDeployments}