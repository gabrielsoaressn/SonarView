// services/sonarcloud-details.js
// Serviços para buscar dados detalhados do SonarCloud

const axios = require('axios');

const SONARCLOUD_BASE_URL = 'https://sonarcloud.io/api';

/**
 * Busca issues (bugs, vulnerabilities, code smells) em código novo
 */
async function getNewCodeIssues(projectKey, token, options = {}) {
  const {
    types = 'BUG,VULNERABILITY,CODE_SMELL',
    severities = 'BLOCKER,CRITICAL,MAJOR,MINOR',
    pageSize = 100
  } = options;

  try {
    const response = await axios.get(`${SONARCLOUD_BASE_URL}/issues/search`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        componentKeys: projectKey,
        resolved: false,
        inNewCodePeriod: true,
        types,
        severities,
        ps: pageSize
      }
    });

    const issues = response.data.issues || [];

    // Agrupar por tipo e severidade
    const grouped = {
      bugs: [],
      vulnerabilities: [],
      codeSmells: [],
      byFile: {}
    };

    issues.forEach(issue => {
      const issueData = {
        key: issue.key,
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
        component: issue.component.split(':').pop(), // Nome do arquivo
        line: issue.line,
        status: issue.status,
        effort: issue.effort || '5min', // Tempo estimado para corrigir
        creationDate: issue.creationDate,
        tags: issue.tags || []
      };

      // Agrupar por tipo
      if (issue.type === 'BUG') {
        grouped.bugs.push(issueData);
      } else if (issue.type === 'VULNERABILITY') {
        grouped.vulnerabilities.push(issueData);
      } else if (issue.type === 'CODE_SMELL') {
        grouped.codeSmells.push(issueData);
      }

      // Agrupar por arquivo
      const fileName = issueData.component;
      if (!grouped.byFile[fileName]) {
        grouped.byFile[fileName] = [];
      }
      grouped.byFile[fileName].push(issueData);
    });

    return {
      total: issues.length,
      totalBugs: grouped.bugs.length,
      totalVulnerabilities: grouped.vulnerabilities.length,
      totalCodeSmells: grouped.codeSmells.length,
      issues: grouped
    };

  } catch (error) {
    console.error('❌ Erro ao buscar issues do SonarCloud:', error.message);
    throw error;
  }
}

/**
 * Busca complexidade por componente (arquivo/classe)
 */
async function getComplexityByComponent(projectKey, token, options = {}) {
  const {
    metrics = 'complexity,cognitive_complexity,ncloc',
    pageSize = 100,
    strategy = 'leaves' // 'leaves' = arquivos, 'children' = diretórios
  } = options;

  try {
    const response = await axios.get(`${SONARCLOUD_BASE_URL}/measures/component_tree`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        component: projectKey,
        metricKeys: metrics,
        strategy,
        ps: pageSize
      }
    });

    const components = response.data.components || [];

    // Processar e ordenar por complexidade
    const complexityData = components.map(component => {
      const measures = {};

      component.measures?.forEach(measure => {
        measures[measure.metric] = parseFloat(measure.value) || 0;
      });

      return {
        name: component.name,
        path: component.path || component.key.split(':').pop(),
        complexity: measures.complexity || 0,
        cognitiveComplexity: measures.cognitive_complexity || 0,
        linesOfCode: measures.ncloc || 0,
        // Complexidade por linha de código (indicador de qualidade)
        complexityDensity: measures.ncloc > 0
          ? Math.round((measures.complexity / measures.ncloc) * 100) / 100
          : 0
      };
    });

    // Ordenar por complexidade (maior primeiro)
    complexityData.sort((a, b) => b.complexity - a.complexity);

    // Estatísticas
    const stats = {
      totalComponents: complexityData.length,
      totalComplexity: complexityData.reduce((sum, c) => sum + c.complexity, 0),
      avgComplexity: complexityData.length > 0
        ? Math.round(complexityData.reduce((sum, c) => sum + c.complexity, 0) / complexityData.length)
        : 0,
      maxComplexity: complexityData.length > 0 ? complexityData[0].complexity : 0,
      // Top 10 mais complexos
      hotspots: complexityData.slice(0, 10)
    };

    return {
      components: complexityData,
      stats
    };

  } catch (error) {
    console.error('❌ Erro ao buscar complexidade do SonarCloud:', error.message);
    throw error;
  }
}

/**
 * Busca hotspots de segurança
 */
async function getSecurityHotspots(projectKey, token, options = {}) {
  const {
    inNewCodePeriod = true,
    pageSize = 100
  } = options;

  try {
    const response = await axios.get(`${SONARCLOUD_BASE_URL}/hotspots/search`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        projectKey,
        inNewCodePeriod,
        ps: pageSize,
        status: 'TO_REVIEW' // Apenas hotspots não revisados
      }
    });

    const hotspots = response.data.hotspots || [];

    return {
      total: hotspots.length,
      hotspots: hotspots.map(h => ({
        key: h.key,
        component: h.component.split(':').pop(),
        securityCategory: h.securityCategory,
        vulnerabilityProbability: h.vulnerabilityProbability,
        message: h.message,
        line: h.line,
        status: h.status,
        creationDate: h.creationDate
      }))
    };

  } catch (error) {
    console.error('❌ Erro ao buscar security hotspots:', error.message);
    // Retornar vazio se não tiver permissão ou endpoint não disponível
    return { total: 0, hotspots: [] };
  }
}

/**
 * Busca cobertura de testes por arquivo
 */
async function getCoverageByComponent(projectKey, token, options = {}) {
  const {
    pageSize = 100
  } = options;

  try {
    const response = await axios.get(`${SONARCLOUD_BASE_URL}/measures/component_tree`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        component: projectKey,
        metricKeys: 'coverage,line_coverage,uncovered_lines,lines_to_cover',
        strategy: 'leaves',
        ps: pageSize
      }
    });

    const components = response.data.components || [];

    const coverageData = components.map(component => {
      const measures = {};

      component.measures?.forEach(measure => {
        measures[measure.metric] = parseFloat(measure.value) || 0;
      });

      return {
        name: component.name,
        path: component.path || component.key.split(':').pop(),
        coverage: Math.round(measures.coverage * 10) / 10,
        lineCoverage: Math.round(measures.line_coverage * 10) / 10,
        uncoveredLines: Math.round(measures.uncovered_lines),
        linesToCover: Math.round(measures.lines_to_cover)
      };
    }).filter(c => c.linesToCover > 0); // Apenas arquivos com código testável

    // Ordenar por menor cobertura (prioridade para melhorar)
    coverageData.sort((a, b) => a.coverage - b.coverage);

    return {
      components: coverageData,
      worstCoverage: coverageData.slice(0, 10) // Top 10 com pior cobertura
    };

  } catch (error) {
    console.error('❌ Erro ao buscar cobertura por componente:', error.message);
    throw error;
  }
}

module.exports = {
  getNewCodeIssues,
  getComplexityByComponent,
  getSecurityHotspots,
  getCoverageByComponent
};
