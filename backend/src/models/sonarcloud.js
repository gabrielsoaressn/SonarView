// models/sonarcloud.js
const { queryWithRetry } = require('../config/database');

/**
 * Salva uma nova métrica do SonarCloud
 */
const saveMetrics = async (metricsData) => {
  const query = `
    INSERT INTO sonarcloud_metrics (
      project_key, timestamp,
      bugs, reliability_rating, reliability_remediation_effort,
      vulnerabilities, security_rating, security_remediation_effort,
      code_smells, technical_debt, debt_ratio, maintainability_rating,
      coverage_overall, coverage_new,
      duplication_density,
      lines_of_code, complexity,
      new_bugs, new_vulnerabilities, new_code_smells,
      overall_rating, technical_debt_minutes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    ) RETURNING *
  `;

  // Helper para converter valores
  const toNumber = (val) => {
    if (val === '*' || val === null || val === undefined) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const toRating = (val) => {
    if (!val || val === '*') return 'A';
    // Se for número (1.0, 2.0, etc), converter para letra
    if (typeof val === 'number' || !isNaN(parseFloat(val))) {
      const ratingMap = { 1: 'A', 1.0: 'A', 2: 'B', 2.0: 'B', 3: 'C', 3.0: 'C', 4: 'D', 4.0: 'D', 5: 'E', 5.0: 'E' };
      return ratingMap[parseFloat(val)] || 'A';
    }
    return val.toString();
  };

  const values = [
    metricsData.projectKey,
    metricsData.timestamp || new Date().toISOString(),
    toNumber(metricsData.reliability?.bugs),
    toRating(metricsData.reliability?.rating),
    toNumber(metricsData.reliability?.remediationEffort),
    toNumber(metricsData.security?.vulnerabilities),
    toRating(metricsData.security?.rating),
    toNumber(metricsData.security?.remediationEffort),
    toNumber(metricsData.maintainability?.codeSmells),
    toNumber(metricsData.maintainability?.technicalDebt),
    toNumber(metricsData.maintainability?.debtRatio),
    toRating(metricsData.maintainability?.rating),
    toNumber(metricsData.coverage?.overall),
    toNumber(metricsData.coverage?.new),
    toNumber(metricsData.duplication?.density),
    toNumber(metricsData.size?.linesOfCode),
    toNumber(metricsData.size?.complexity),
    toNumber(metricsData.newCode?.bugs),
    toNumber(metricsData.newCode?.vulnerabilities),
    toNumber(metricsData.newCode?.codeSmells),
    toRating(metricsData.overallRating),
    toNumber(metricsData.technicalDebtMinutes)
  ];

  try {
    const result = await queryWithRetry(query, values);
    
    // Limpar dados antigos (manter apenas últimos 1000)
    await cleanupOldMetrics(metricsData.projectKey, 1000);
    
    return result.rows[0];
  } catch (err) {
    console.error('❌ Erro ao salvar métricas SonarCloud:', err);
    throw err;
  }
};

/**
 * Busca a última métrica de um projeto
 */
const getLatestMetrics = async (projectKey) => {
  const query = `
    SELECT * FROM sonarcloud_metrics
    WHERE project_key = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `;

  try {
    const result = await queryWithRetry(query, [projectKey]);
    
    if (result.rows.length === 0) {
      return null;
    }

    // Formatar para o formato original da API
    return formatMetricsResponse(result.rows[0]);
  } catch (err) {
    console.error('❌ Erro ao buscar última métrica:', err);
    throw err;
  }
};

/**
 * Busca histórico de métricas
 */
const getMetricsHistory = async (projectKey, hours = 168) => {
  const query = `
    SELECT * FROM sonarcloud_metrics
    WHERE project_key = $1
      AND timestamp >= NOW() - INTERVAL '1 hour' * $2
    ORDER BY timestamp DESC
  `;

  try {
    const result = await queryWithRetry(query, [projectKey, hours]);
    return result.rows.map(formatMetricsResponse);
  } catch (err) {
    console.error('❌ Erro ao buscar histórico de métricas:', err);
    throw err;
  }
};

/**
 * Limpa métricas antigas, mantendo apenas as N mais recentes
 */
const cleanupOldMetrics = async (projectKey, keepCount = 1000) => {
  const query = `SELECT cleanup_old_sonarcloud_metrics($1, $2)`;
  
  try {
    const result = await queryWithRetry(query, [projectKey, keepCount]);
    const deletedCount = result.rows[0].cleanup_old_sonarcloud_metrics;
    
    if (deletedCount > 0) {
      console.log(`🧹 Limpeza: ${deletedCount} métricas antigas removidas`);
    }
    
    return deletedCount;
  } catch (err) {
    console.error('❌ Erro ao limpar métricas antigas:', err);
    // Não lançar erro - limpeza é secundária
    return 0;
  }
};

/**
 * Formata o resultado do banco para o formato da API original
 */
const formatMetricsResponse = (row) => {
  return {
    timestamp: row.timestamp,
    projectKey: row.project_key,
    reliability: {
      bugs: row.bugs,
      rating: row.reliability_rating,
      remediationEffort: row.reliability_remediation_effort
    },
    security: {
      vulnerabilities: row.vulnerabilities,
      rating: row.security_rating,
      remediationEffort: row.security_remediation_effort
    },
    maintainability: {
      codeSmells: row.code_smells,
      technicalDebt: row.technical_debt,
      debtRatio: parseFloat(row.debt_ratio),
      rating: row.maintainability_rating
    },
    coverage: {
      overall: parseFloat(row.coverage_overall),
      new: parseFloat(row.coverage_new)
    },
    duplication: {
      density: parseFloat(row.duplication_density)
    },
    size: {
      linesOfCode: row.lines_of_code,
      complexity: row.complexity
    },
    newCode: {
      bugs: row.new_bugs,
      vulnerabilities: row.new_vulnerabilities,
      codeSmells: row.new_code_smells
    },
    overallRating: row.overall_rating,
    technicalDebtMinutes: row.technical_debt_minutes
  };
};

module.exports = {
  saveMetrics,
  getLatestMetrics,
  getMetricsHistory,
  cleanupOldMetrics
};