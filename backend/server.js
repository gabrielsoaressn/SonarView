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
    'new_bugs', 'new_vulnerabilities', 'new_code_smells'
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
      measures[measure.metric] = measure.value;
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
  
  const ratingOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
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