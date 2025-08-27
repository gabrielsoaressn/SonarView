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

// Servir arquivos estáticos
app.use(express.static('public'));

// Configuração SonarCloud
const SONARCLOUD_CONFIG = {
  baseUrl: 'https://sonarcloud.io/api',
  token: process.env.SONARCLOUD_TOKEN || '1d031b3852fefb184a4a79dc6de9c8b96df5b818',
  projectKey: process.env.PROJECT_KEY || 'gabrielsoaressn_clone-fklearn'
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
async function fetchSonarCloudMetrics() {
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
          component: SONARCLOUD_CONFIG.projectKey,
          metricKeys: metrics
        }
      }
    );

    return transformMeasures(response.data);
  } catch (error) {
    console.error('Erro ao buscar métricas do SonarCloud:', error.message);
    throw error;
  }
}

// Transformar dados do SonarCloud
function transformMeasures(data) {
  const measures = {};
  
  if (data.component && data.component.measures) {
    data.component.measures.forEach(measure => {
      measures[measure.metric] = measure.value;
    });
  }

  return {
    timestamp: new Date().toISOString(),
    projectKey: SONARCLOUD_CONFIG.projectKey,
    reliability: {
      bugs: parseInt(measures.bugs || 0),
      rating: measures.reliability_rating || 'A',
      remediationEffort: parseInt(measures.reliability_remediation_effort || 0)
    },
    security: {
      vulnerabilities: parseInt(measures.vulnerabilities || 0),
      rating: measures.security_rating || 'A',
      remediationEffort: parseInt(measures.security_remediation_effort || 0)
    },
    maintainability: {
      codeSmells: parseInt(measures.code_smells || 0),
      technicalDebt: parseInt(measures.sqale_index || 0),
      debtRatio: parseFloat(measures.sqale_debt_ratio || 0),
      rating: measures.sqale_rating || 'A'
    },
    coverage: {
      overall: parseFloat(measures.coverage || 0),
      new: parseFloat(measures.new_coverage || 0)
    },
    duplication: {
      density: parseFloat(measures.duplicated_lines_density || 0),
      newDensity: parseFloat(measures.new_duplicated_lines_density || 0)
    },
    size: {
      linesOfCode: parseInt(measures.ncloc || 0),
      complexity: parseInt(measures.complexity || 0)
    },
    newCode: {
      bugs: parseInt(measures.new_bugs || 0),
      vulnerabilities: parseInt(measures.new_vulnerabilities || 0),
      codeSmells: parseInt(measures.new_code_smells || 0)
    },
    overallRating: calculateOverallRating(measures),
    technicalDebtMinutes: parseInt(measures.sqale_index || 0)
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
      console.log('Nenhum arquivo de métricas encontrado, retornando array vazio');
      return [];
    } else {
      throw error;
    }
  }
}

// Coletar métricas
async function collectMetrics() {
  try {
    console.log('Coletando métricas do SonarCloud...');
    const metrics = await fetchSonarCloudMetrics();
    await saveMetrics(metrics);
    console.log(`Métricas coletadas em ${metrics.timestamp}`);
  } catch (error) {
    console.error('Erro ao coletar métricas:', error.message);
  }
}

// ROTAS DA API

// Métricas mais recentes
app.get('/api/metrics/latest', async (req, res) => {
  try {
    const metrics = await readMetrics();
    const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
    
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
    const metrics = await readMetrics();
    
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    const filteredMetrics = metrics.filter(metric => 
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

// Todas as métricas
app.get('/api/metrics/all', async (req, res) => {
  try {
    const metrics = await readMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch all metrics', 
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

// Quality Gate
app.get('/api/metrics/quality-gate', async (req, res) => {
  try {
    const metrics = await readMetrics();
    const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
    
    if (!latest) {
      return res.status(404).json({ error: 'No metrics data available' });
    }

    const qualityGate = {
      overallStatus: latest.overallRating,
      gates: {
        reliability: {
          status: latest.reliability.rating,
          bugs: latest.reliability.bugs,
          passed: latest.reliability.rating <= 'B'
        },
        security: {
          status: latest.security.rating,
          vulnerabilities: latest.security.vulnerabilities,
          passed: latest.security.rating <= 'B'
        },
        maintainability: {
          status: latest.maintainability.rating,
          codeSmells: latest.maintainability.codeSmells,
          debtRatio: latest.maintainability.debtRatio,
          passed: latest.maintainability.rating <= 'B' && latest.maintainability.debtRatio < 10
        }
      },
      timestamp: latest.timestamp
    };

    res.json(qualityGate);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch quality gate status', 
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Aurora View API'
  });
});

// Servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar servidor
async function startServer() {
  await ensureDataDir();
  
  // Coletar métricas na inicialização
  await collectMetrics();
  
  // Coletar métricas a cada 10 minutos
  setInterval(collectMetrics, 10 * 60 * 1000);
  
  app.listen(PORT, () => {
    console.log(`🚀 Aurora View rodando em http://localhost:${PORT}`);
    console.log('📊 Coleta de métricas automática ativada (a cada 10 minutos)');
  });
}

startServer().catch(console.error);