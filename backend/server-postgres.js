require('dotenv').config();
// backend/server-postgres.js - Versão com PostgreSQL
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Importar configuração do banco e models
const { testConnection } = require('./src/config/database');
const sonarcloudModel = require('./src/models/sonarcloud');
const doraModel = require('./src/models/dora');
const sonarcloudDetails = require('./src/services/sonarcloud-details');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração SonarCloud
const SONARCLOUD_CONFIG = {
  baseUrl: 'https://sonarcloud.io/api',
  token: process.env.SONARCLOUD_TOKEN || '1d031b3852fefb184a4a79dc6de9c8b96df5b818',
  projects: {
    'fklearn': 'gabrielsoaressn_fklearn',
    'commons-lang': 'gabrielsoaressn_commons-lang'
  },
  defaultProject: 'fklearn'
};

// ==========================================
// FUNÇÕES DE COLETA DO SONARCLOUD
// ==========================================

async function fetchSonarCloudMetrics(projectKey = null) {
  const selectedProject = projectKey || SONARCLOUD_CONFIG.defaultProject;
  const sonarProjectKey = SONARCLOUD_CONFIG.projects[selectedProject];
  const metrics = [
    'bugs', 'reliability_rating', 'reliability_remediation_effort',
    'vulnerabilities', 'security_rating', 'security_remediation_effort',
    'code_smells', 'sqale_index', 'sqale_debt_ratio', 'sqale_rating',
    'ncloc', 'coverage', 'duplicated_lines_density', 'complexity',
    'new_bugs', 'new_vulnerabilities', 'new_code_smells', 'new_coverage'
  ].join(',');

  try {
    const response = await axios.get(
      `${SONARCLOUD_CONFIG.baseUrl}/measures/component`,
      {
        headers: {
          'Authorization': `Bearer ${SONARCLOUD_CONFIG.token}`
        },
        params: {
          component: sonarProjectKey,
          metricKeys: metrics
        }
      }
    );

    return transformMeasures(response.data, sonarProjectKey);
  } catch (error) {
    console.error('Erro ao buscar métricas do SonarCloud:', error.message);
    throw error;
  }
}

function transformMeasures(data, projectKey) {
  const measures = {};

  if (data.component && data.component.measures) {
    data.component.measures.forEach(measure => {
      if (measure.periods && measure.periods.length > 0) {
        measures[measure.metric] = measure.periods[0].value;
      } else {
        measures[measure.metric] = measure.value;
      }
    });
  }

  const parseNumeric = (value, isFloat = false, defaultValue = '*') => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return defaultValue;
    }
    const parsed = isFloat ? parseFloat(value) : parseInt(value, 10);
    return isFloat ? Math.round(parsed * 100) / 100 : parsed;
  };

  return {
    timestamp: new Date().toISOString(),
    projectKey: projectKey,
    reliability: {
      bugs: parseNumeric(measures.bugs),
      rating: measures.reliability_rating || '*',
      remediationEffort: parseNumeric(measures.reliability_remediation_effort)
    },
    security: {
      vulnerabilities: parseNumeric(measures.vulnerabilities),
      rating: measures.security_rating || '*',
      remediationEffort: parseNumeric(measures.security_remediation_effort)
    },
    maintainability: {
      codeSmells: parseNumeric(measures.code_smells),
      technicalDebt: parseNumeric(measures.sqale_index),
      debtRatio: parseNumeric(measures.sqale_debt_ratio, true),
      rating: measures.sqale_rating || '*'
    },
    coverage: {
      overall: parseNumeric(measures.coverage, true),
      new: parseNumeric(measures.new_coverage, true)
    },
    duplication: {
      density: parseNumeric(measures.duplicated_lines_density, true),
      newDensity: parseNumeric(measures.new_duplicated_lines_density, true)
    },
    size: {
      linesOfCode: parseNumeric(measures.ncloc),
      complexity: parseNumeric(measures.complexity)
    },
    newCode: {
      bugs: parseNumeric(measures.new_bugs),
      vulnerabilities: parseNumeric(measures.new_vulnerabilities),
      codeSmells: parseNumeric(measures.new_code_smells)
    },
    overallRating: calculateOverallRating(measures),
    technicalDebtMinutes: parseNumeric(measures.sqale_index)
  };
}

function calculateOverallRating(measures) {
  const ratings = [
    measures.reliability_rating,
    measures.security_rating,
    measures.sqale_rating
  ].filter(Boolean);

  if (ratings.length === 0) return 'A';

  const ratingOrder = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 };
  return ratings.reduce((worst, current) => {
    return ratingOrder[current] > ratingOrder[worst] ? current : worst;
  });
}

async function collectMetrics() {
  try {
    console.log('📊 Coletando métricas do SonarCloud...');

    for (const projectKey of Object.keys(SONARCLOUD_CONFIG.projects)) {
      try {
        console.log(`  → Coletando: ${projectKey}`);
        const metrics = await fetchSonarCloudMetrics(projectKey);
        await sonarcloudModel.saveMetrics(metrics);
        console.log(`  ✓ ${projectKey} salvo em ${metrics.timestamp}`);
      } catch (projectError) {
        console.error(`  ✗ Erro em ${projectKey}:`, projectError.message);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao coletar métricas:', error.message);
  }
}

// ==========================================
// ROTAS DA API
// ==========================================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Quality Lens API',
      database: dbConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Listar projetos disponíveis
app.get('/api/projects', (req, res) => {
  const projects = Object.keys(SONARCLOUD_CONFIG.projects).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1).replace('-', ' '),
    sonarKey: SONARCLOUD_CONFIG.projects[key]
  }));

  res.json({
    projects,
    default: SONARCLOUD_CONFIG.defaultProject
  });
});

// ==========================================
// ROTAS - MÉTRICAS SONARCLOUD
// ==========================================

// Métricas mais recentes
app.get('/api/metrics/latest', async (req, res) => {
  try {
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    const latest = await sonarcloudModel.getLatestMetrics(sonarProjectKey);

    if (!latest) {
      return res.status(404).json({
        error: 'No metrics data available',
        message: 'Please wait for the first data collection cycle to complete'
      });
    }

    res.json(latest);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch latest metrics',
      details: error.message
    });
  }
});

// Histórico de métricas
app.get('/api/metrics/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 168; // 7 dias por padrão
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    const history = await sonarcloudModel.getMetricsHistory(sonarProjectKey, hours);
    res.json(history);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch metrics history',
      details: error.message
    });
  }
});

// Forçar coleta
app.post('/api/metrics/collect', async (req, res) => {
  try {
    await collectMetrics();
    res.json({ message: 'Metrics collection triggered successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to trigger metrics collection',
      details: error.message
    });
  }
});

// ==========================================
// ROTAS - MÉTRICAS DORA
// ==========================================

// Registrar deploy (chamado pelo GitHub Actions)
app.post('/api/dora/deployment', async (req, res) => {
  try {
    const {
      projectKey,
      commitSha,
      commitTimestamp,
      deploymentTimestamp,
      environment,
      status,
      branch,
      metadata
    } = req.body;

    // Validação
    if (!projectKey || !commitSha || !commitTimestamp || !deploymentTimestamp) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['projectKey', 'commitSha', 'commitTimestamp', 'deploymentTimestamp']
      });
    }

    const deployment = await doraModel.saveDeployment({
      projectKey,
      commitSha,
      commitTimestamp,
      deploymentTimestamp,
      environment,
      status,
      branch,
      metadata
    });

    res.json({
      message: 'Deployment registered successfully',
      deployment
    });
  } catch (error) {
    console.error('❌ Erro ao registrar deployment:', error);
    res.status(500).json({
      error: 'Failed to register deployment',
      details: error.message
    });
  }
});

// Obter métricas DORA calculadas
app.get('/api/dora/metrics', async (req, res) => {
  try {
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const days = parseInt(req.query.days) || 30;
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    const metrics = await doraModel.calculateDoraMetrics(sonarProjectKey, days);
    res.json(metrics);
  } catch (error) {
    console.error('❌ Erro ao calcular métricas DORA:', error);
    res.status(500).json({
      error: 'Failed to fetch DORA metrics',
      details: error.message
    });
  }
});

// Obter lista de deployments
app.get('/api/dora/deployments', async (req, res) => {
  try {
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const days = parseInt(req.query.days) || 30;
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    const deployments = await doraModel.getDeployments(sonarProjectKey, days);
    res.json({
      projectKey: sonarProjectKey,
      period: `${days} days`,
      count: deployments.length,
      deployments
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch deployments',
      details: error.message
    });
  }
});

// ==========================================
// ROTAS - DETALHES DO SONARCLOUD
// ==========================================

// Buscar issues em código novo (para tabela de problemas)
app.get('/api/sonarcloud/new-code-issues', async (req, res) => {
  try {
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    const issues = await sonarcloudDetails.getNewCodeIssues(
      sonarProjectKey,
      SONARCLOUD_CONFIG.token
    );

    res.json(issues);
  } catch (error) {
    console.error('❌ Erro ao buscar issues:', error);
    res.status(500).json({
      error: 'Failed to fetch new code issues',
      details: error.message
    });
  }
});

// Buscar complexidade por componente (para gráfico sunburst)
app.get('/api/sonarcloud/complexity', async (req, res) => {
  try {
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    const complexity = await sonarcloudDetails.getComplexityByComponent(
      sonarProjectKey,
      SONARCLOUD_CONFIG.token
    );

    res.json(complexity);
  } catch (error) {
    console.error('❌ Erro ao buscar complexidade:', error);
    res.status(500).json({
      error: 'Failed to fetch complexity data',
      details: error.message
    });
  }
});

// Buscar cobertura por componente
app.get('/api/sonarcloud/coverage-by-file', async (req, res) => {
  try {
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    const coverage = await sonarcloudDetails.getCoverageByComponent(
      sonarProjectKey,
      SONARCLOUD_CONFIG.token
    );

    res.json(coverage);
  } catch (error) {
    console.error('❌ Erro ao buscar cobertura:', error);
    res.status(500).json({
      error: 'Failed to fetch coverage data',
      details: error.message
    });
  }
});

// Buscar security hotspots
app.get('/api/sonarcloud/security-hotspots', async (req, res) => {
  try {
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    const hotspots = await sonarcloudDetails.getSecurityHotspots(
      sonarProjectKey,
      SONARCLOUD_CONFIG.token
    );

    res.json(hotspots);
  } catch (error) {
    console.error('❌ Erro ao buscar security hotspots:', error);
    res.status(500).json({
      error: 'Failed to fetch security hotspots',
      details: error.message
    });
  }
});

// ==========================================
// INICIALIZAR SERVIDOR
// ==========================================

async function startServer() {
  console.log('🚀 Iniciando Quality Lens Backend...\n');

  // Testar conexão com o banco
  console.log('📡 Testando conexão com PostgreSQL...');
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ ERRO: Não foi possível conectar ao PostgreSQL');
    console.error('Verifique se DATABASE_URL está configurada corretamente');
    process.exit(1);
  }

  // Coletar métricas iniciais
  console.log('\n📊 Coletando métricas iniciais...');
  await collectMetrics();

  // Configurar coleta automática a cada 10 minutos
  setInterval(collectMetrics, 10 * 60 * 1000);
  console.log('⏰ Coleta automática ativada (a cada 10 minutos)\n');

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log(`✨ Quality Lens Backend rodando em http://localhost:${PORT}`);
    console.log(`🗄️  Usando PostgreSQL para persistência`);
    console.log(`📊 API pronta para receber requisições\n`);
  });
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Encerrando servidor...');
  const { closePool } = require('./src/config/database');
  await closePool();
  process.exit(0);
});

// Iniciar
startServer().catch(err => {
  console.error('❌ Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
