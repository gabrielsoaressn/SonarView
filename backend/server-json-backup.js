require('dotenv').config();
// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

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

// Caminho para arquivo de dados
const DATA_FILE = path.join(__dirname, 'data', 'metrics.json');
const DORA_FILE = path.join(__dirname, 'data', 'dora-metrics.json');

// Garantir que a pasta data existe
async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Função para buscar métricas do SonarCloud
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

// Transformar dados do SonarCloud
function transformMeasures(data, projectKey) {
  const measures = {};

  if (data.component && data.component.measures) {
    data.component.measures.forEach(measure => {
      // Métricas de código novo vêm dentro de periods
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

// Salvar métricas
async function saveMetrics(metrics) {
  try {
    let existingData = [];
    
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      existingData = JSON.parse(data);
    } catch {
      // Arquivo não existe ainda
    }

    existingData.push(metrics);

    // Manter apenas os últimos 1000 registros
    if (existingData.length > 1000) {
      existingData = existingData.slice(-1000);
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(existingData, null, 2));
    console.log('Métricas salvas com sucesso');
  } catch (error) {
    console.error('Erro ao salvar métricas:', error);
    throw error;
  }
}

// Ler métricas
async function readMetrics() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Coletar métricas
async function collectMetrics() {
  try {
    console.log('Coletando métricas do SonarCloud...');
    
    // Coletar métricas de todos os projetos configurados
    for (const projectKey of Object.keys(SONARCLOUD_CONFIG.projects)) {
      try {
        console.log(`Coletando métricas do projeto: ${projectKey}`);
        const metrics = await fetchSonarCloudMetrics(projectKey);
        await saveMetrics(metrics);
        console.log(`Métricas coletadas do ${projectKey} em ${metrics.timestamp}`);
      } catch (projectError) {
        console.error(`Erro ao coletar métricas do projeto ${projectKey}:`, projectError.message);
      }
    }
  } catch (error) {
    console.error('Erro ao coletar métricas:', error.message);
  }
}

// ROTAS DA API

// Métricas mais recentes
app.get('/api/metrics/latest', async (req, res) => {
  try {
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const metrics = await readMetrics();
    const projectMetrics = metrics.filter(m => m.projectKey === SONARCLOUD_CONFIG.projects[projectKey]);
    const latest = projectMetrics.length > 0 ? projectMetrics[projectMetrics.length - 1] : null;
    
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
    const hours = parseInt(req.query.hours) || 24;
    const projectKey = req.query.project || SONARCLOUD_CONFIG.defaultProject;
    const metrics = await readMetrics();
    const projectMetrics = metrics.filter(m => m.projectKey === SONARCLOUD_CONFIG.projects[projectKey]);
    
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    const filteredMetrics = projectMetrics.filter(metric => 
      new Date(metric.timestamp) > cutoffTime
    );

    res.json(filteredMetrics);
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Quality Lens API'
  });
});

// ==========================================
// DORA METRICS ENDPOINTS
// ==========================================

// Função para ler métricas DORA
async function readDoraMetrics() {
  try {
    const data = await fs.readFile(DORA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Função para salvar métricas DORA
async function saveDoraMetrics(metrics) {
  try {
    let existingData = await readDoraMetrics();
    existingData.push(metrics);

    // Manter apenas os últimos 500 registros
    if (existingData.length > 500) {
      existingData = existingData.slice(-500);
    }

    await fs.writeFile(DORA_FILE, JSON.stringify(existingData, null, 2));
    console.log('Métricas DORA salvas com sucesso');
  } catch (error) {
    console.error('Erro ao salvar métricas DORA:', error);
    throw error;
  }
}

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
      branch
    } = req.body;

    if (!projectKey || !commitSha || !commitTimestamp || !deploymentTimestamp) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['projectKey', 'commitSha', 'commitTimestamp', 'deploymentTimestamp']
      });
    }

    const deployment = {
      projectKey,
      commitSha,
      commitTimestamp: new Date(commitTimestamp).toISOString(),
      deploymentTimestamp: new Date(deploymentTimestamp).toISOString(),
      environment: environment || 'production',
      status: status || 'success',
      branch: branch || 'main',
      leadTimeMinutes: Math.round((new Date(deploymentTimestamp) - new Date(commitTimestamp)) / 1000 / 60)
    };

    await saveDoraMetrics(deployment);

    res.json({
      message: 'Deployment registered successfully',
      deployment
    });
  } catch (error) {
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

    const allDeployments = await readDoraMetrics();
    const sonarProjectKey = SONARCLOUD_CONFIG.projects[projectKey];

    // Filtrar por projeto e período
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deployments = allDeployments.filter(d =>
      d.projectKey === sonarProjectKey &&
      new Date(d.deploymentTimestamp) > cutoffDate
    );

    if (deployments.length === 0) {
      return res.json({
        projectKey: sonarProjectKey,
        period: `${days} days`,
        leadTimeMinutes: null,
        changeFailureRate: null,
        deploymentFrequency: null,
        totalDeployments: 0
      });
    }

    // Calcular Lead Time (média)
    const leadTimes = deployments.map(d => d.leadTimeMinutes);
    const avgLeadTime = Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length);

    // Calcular Change Failure Rate
    const failedDeployments = deployments.filter(d => d.status === 'failure').length;
    const changeFailureRate = deployments.length > 0
      ? Math.round((failedDeployments / deployments.length) * 100)
      : 0;

    // Calcular Deployment Frequency (deploys por dia)
    const deploymentFrequency = deployments.length / days;

    res.json({
      projectKey: sonarProjectKey,
      period: `${days} days`,
      leadTimeMinutes: avgLeadTime,
      changeFailureRate: changeFailureRate,
      deploymentFrequency: Math.round(deploymentFrequency * 100) / 100,
      totalDeployments: deployments.length,
      successfulDeployments: deployments.length - failedDeployments,
      failedDeployments: failedDeployments
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch DORA metrics',
      details: error.message
    });
  }
});

// Inicializar servidor
async function startServer() {
  await ensureDataDir();
  await collectMetrics();
  
  // Coletar métricas a cada 10 minutos
  setInterval(collectMetrics, 10 * 60 * 1000);
  
  app.listen(PORT, () => {
    console.log(`🚀 Quality Lens Backend rodando em http://localhost:${PORT}`);
    console.log('📊 Coleta de métricas automática ativada (a cada 10 minutos)');
  });
}

startServer().catch(console.error);