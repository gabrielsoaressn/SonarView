const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5000', 'http://0.0.0.0:5000'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
app.use(express.json());

// Configuração do SonarCloud
const SONARCLOUD_TOKEN = process.env.SONARCLOUD_TOKEN || '1d031b3852fefb184a4a79dc6de9c8b96df5b818';
const PROJECT_KEY = process.env.PROJECT_KEY || 'gabrielsoaressn_clone-fklearn';
const BASE_URL = 'https://sonarcloud.io/api';

// Diretório de dados
const DATA_DIR = path.join(__dirname, 'data');
const METRICS_FILE = path.join(DATA_DIR, 'metrics.json');

// Garantir que o diretório de dados existe
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Serviço SonarCloud
class SonarCloudService {
  constructor() {
    this.axiosConfig = {
      headers: {
        'Authorization': `Bearer ${SONARCLOUD_TOKEN}`
      }
    };
  }

  async getProjectMeasures() {
    try {
      const metrics = [
        'bugs', 'reliability_rating', 'reliability_remediation_effort',
        'vulnerabilities', 'security_rating', 'security_remediation_effort',
        'code_smells', 'sqale_index', 'sqale_debt_ratio', 'sqale_rating',
        'ncloc', 'coverage', 'duplicated_lines_density', 'complexity',
        'new_bugs', 'new_vulnerabilities', 'new_code_smells',
        'new_coverage', 'new_duplicated_lines_density'
      ].join(',');

      const response = await axios.get(
        `${BASE_URL}/measures/component`,
        {
          ...this.axiosConfig,
          params: {
            component: PROJECT_KEY,
            metricKeys: metrics
          }
        }
      );

      return this.transformMeasures(response.data);
    } catch (error) {
      console.error('Erro ao buscar métricas do SonarCloud:', error.message);
      throw new Error(`Erro da API SonarCloud: ${error.response?.data?.message || error.message}`);
    }
  }

  transformMeasures(data) {
    const measures = {};
    
    if (data.component && data.component.measures) {
      data.component.measures.forEach(measure => {
        measures[measure.metric] = {
          value: measure.value,
          bestValue: measure.bestValue || false,
          period: measure.period
        };
      });
    }

    const timestamp = new Date().toISOString();
    
    return {
      timestamp,
      projectKey: PROJECT_KEY,
      reliability: {
        bugs: parseInt(measures.bugs?.value || '0'),
        rating: measures.reliability_rating?.value || 'A',
        remediationEffort: parseInt(measures.reliability_remediation_effort?.value || '0')
      },
      security: {
        vulnerabilities: parseInt(measures.vulnerabilities?.value || '0'),
        rating: measures.security_rating?.value || 'A',
        remediationEffort: parseInt(measures.security_remediation_effort?.value || '0')
      },
      maintainability: {
        codeSmells: parseInt(measures.code_smells?.value || '0'),
        technicalDebt: parseInt(measures.sqale_index?.value || '0'),
        debtRatio: parseFloat(measures.sqale_debt_ratio?.value || '0'),
        rating: measures.sqale_rating?.value || 'A'
      },
      coverage: {
        overall: parseFloat(measures.coverage?.value || '0'),
        new: parseFloat(measures.new_coverage?.value || '0')
      },
      duplication: {
        density: parseFloat(measures.duplicated_lines_density?.value || '0'),
        newDensity: parseFloat(measures.new_duplicated_lines_density?.value || '0')
      },
      size: {
        linesOfCode: parseInt(measures.ncloc?.value || '0'),
        complexity: parseInt(measures.complexity?.value || '0')
      },
      newCode: {
        bugs: parseInt(measures.new_bugs?.value || '0'),
        vulnerabilities: parseInt(measures.new_vulnerabilities?.value || '0'),
        codeSmells: parseInt(measures.new_code_smells?.value || '0')
      },
      overallRating: this.calculateOverallRating(measures),
      technicalDebtMinutes: parseInt(measures.sqale_index?.value || '0')
    };
  }

  calculateOverallRating(measures) {
    const ratings = [
      measures.reliability_rating?.value,
      measures.security_rating?.value, 
      measures.sqale_rating?.value
    ].filter(Boolean);

    if (ratings.length === 0) return 'A';
    
    const ratingOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
    const worstRating = ratings.reduce((worst, current) => {
      return ratingOrder[current] > ratingOrder[worst] ? current : worst;
    });

    return worstRating;
  }
}

// Serviço de Armazenamento
class DataStoreService {
  async saveMetrics(metrics) {
    try {
      let existingData = [];
      
      try {
        const data = await fs.readFile(METRICS_FILE, 'utf8');
        existingData = JSON.parse(data);
      } catch {
        // Arquivo não existe ainda, começar com array vazio
      }

      existingData.push(metrics);

      // Manter apenas as últimas 1000 entradas
      if (existingData.length > 1000) {
        existingData = existingData.slice(-1000);
      }

      await fs.writeFile(METRICS_FILE, JSON.stringify(existingData, null, 2));
    } catch (error) {
      console.error('Erro ao salvar métricas:', error);
      throw error;
    }
  }

  async getLatestMetrics() {
    try {
      const data = await fs.readFile(METRICS_FILE, 'utf8');
      const metrics = JSON.parse(data);
      return metrics.length > 0 ? metrics[metrics.length - 1] : null;
    } catch (error) {
      console.error('Erro ao ler últimas métricas:', error);
      return null;
    }
  }

  async getMetricsHistory(hours = 24) {
    try {
      const data = await fs.readFile(METRICS_FILE, 'utf8');
      const metrics = JSON.parse(data);
      
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      return metrics.filter(metric => new Date(metric.timestamp) > cutoffTime);
    } catch (error) {
      console.error('Erro ao ler histórico de métricas:', error);
      return [];
    }
  }

  async getAllMetrics() {
    try {
      const data = await fs.readFile(METRICS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler todas as métricas:', error);
      return [];
    }
  }
}

// Instâncias dos serviços
const sonarCloudService = new SonarCloudService();
const dataStoreService = new DataStoreService();

// Variável para controlar execução
let isCollectingMetrics = false;

// Função para coletar métricas
async function collectMetrics() {
  if (isCollectingMetrics) {
    console.log('Coleta de métricas já em andamento, pulando...');
    return;
  }

  isCollectingMetrics = true;
  
  try {
    console.log('Coletando métricas do SonarCloud...');
    const metrics = await sonarCloudService.getProjectMeasures();
    await dataStoreService.saveMetrics(metrics);
    console.log(`Métricas coletadas com sucesso em ${metrics.timestamp}`);
  } catch (error) {
    console.error('Falha ao coletar métricas:', error.message);
  } finally {
    isCollectingMetrics = false;
  }
}

// Rotas da API
app.get('/api/metrics/latest', async (req, res) => {
  try {
    const metrics = await dataStoreService.getLatestMetrics();
    
    if (!metrics) {
      return res.status(404).json({ 
        error: 'Nenhum dado de métricas disponível',
        message: 'Aguarde o primeiro ciclo de coleta de dados ser concluído'
      });
    }

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar últimas métricas', details: error.message });
  }
});

app.get('/api/metrics/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const metrics = await dataStoreService.getMetricsHistory(hours);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar histórico de métricas', details: error.message });
  }
});

app.get('/api/metrics/all', async (req, res) => {
  try {
    const metrics = await dataStoreService.getAllMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar todas as métricas', details: error.message });
  }
});

app.post('/api/metrics/collect', async (req, res) => {
  try {
    await collectMetrics();
    res.json({ message: 'Coleta de métricas acionada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao acionar coleta de métricas', details: error.message });
  }
});

app.get('/api/quality-gate', async (req, res) => {
  try {
    const metrics = await dataStoreService.getLatestMetrics();
    
    if (!metrics) {
      return res.status(404).json({ error: 'Nenhum dado de métricas disponível' });
    }

    const qualityGate = {
      overallStatus: metrics.overallRating,
      gates: {
        reliability: {
          status: metrics.reliability.rating,
          bugs: metrics.reliability.bugs,
          passed: metrics.reliability.rating <= 'B'
        },
        security: {
          status: metrics.security.rating,
          vulnerabilities: metrics.security.vulnerabilities,
          passed: metrics.security.rating <= 'B'
        },
        maintainability: {
          status: metrics.maintainability.rating,
          codeSmells: metrics.maintainability.codeSmells,
          debtRatio: metrics.maintainability.debtRatio,
          passed: metrics.maintainability.rating <= 'B' && metrics.maintainability.debtRatio < 10
        }
      },
      timestamp: metrics.timestamp
    };

    res.json(qualityGate);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar status do quality gate', details: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Aurora View API'
  });
});

// Inicialização
async function bootstrap() {
  await ensureDataDir();
  
  // Executar coleta imediatamente na inicialização
  collectMetrics();
  
  // Agendar coleta a cada 10 minutos
  cron.schedule('*/10 * * * *', collectMetrics);
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurora View Backend executando na porta ${PORT}`);
    console.log('Coleta de métricas do SonarCloud iniciada - executa a cada 10 minutos');
  });
}

bootstrap();