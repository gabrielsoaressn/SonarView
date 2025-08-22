const axios = require('axios');

class SonarCloudService {
  constructor() {
    this.baseUrl = 'https://sonarcloud.io/api';
    this.token = process.env.SONARCLOUD_TOKEN || '1d031b3852fefb184a4a79dc6de9c8b96df5b818';
    this.projectKey = process.env.PROJECT_KEY || 'gabrielsoaressn_clone-fklearn';
    this.axiosConfig = {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    };
  }

  async getProjectMeasures() {
    try {
      const metrics = [
        // Reliability metrics
        'bugs', 'reliability_rating', 'reliability_remediation_effort',
        // Security metrics  
        'vulnerabilities', 'security_rating', 'security_remediation_effort',
        // Maintainability metrics
        'code_smells', 'sqale_index', 'sqale_debt_ratio', 'sqale_rating',
        // General metrics
        'ncloc', 'coverage', 'duplicated_lines_density', 'complexity',
        // New code metrics
        'new_bugs', 'new_vulnerabilities', 'new_code_smells',
        'new_coverage', 'new_duplicated_lines_density'
      ].join(',');

      const response = await axios.get(
        `${this.baseUrl}/measures/component`,
        {
          ...this.axiosConfig,
          params: {
            component: this.projectKey,
            metricKeys: metrics
          }
        }
      );

      return this.transformMeasures(response.data);
    } catch (error) {
      console.error('Error fetching SonarCloud measures:', error.message);
      throw new Error(`SonarCloud API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async getProjectHistory(metrics, from = null) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/measures/search_history`,
        {
          ...this.axiosConfig,
          params: {
            component: this.projectKey,
            metrics: metrics.join(','),
            from: from || this.getDateDaysAgo(30)
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching SonarCloud history:', error.message);
      throw error;
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

    // Calculate derived metrics
    const timestamp = new Date().toISOString();
    
    return {
      timestamp,
      projectKey: this.projectKey,
      reliability: {
        bugs: parseInt(measures.bugs?.value || 0),
        rating: measures.reliability_rating?.value || 'A',
        remediationEffort: parseInt(measures.reliability_remediation_effort?.value || 0)
      },
      security: {
        vulnerabilities: parseInt(measures.vulnerabilities?.value || 0),
        rating: measures.security_rating?.value || 'A',
        remediationEffort: parseInt(measures.security_remediation_effort?.value || 0)
      },
      maintainability: {
        codeSmells: parseInt(measures.code_smells?.value || 0),
        technicalDebt: parseInt(measures.sqale_index?.value || 0),
        debtRatio: parseFloat(measures.sqale_debt_ratio?.value || 0),
        rating: measures.sqale_rating?.value || 'A'
      },
      coverage: {
        overall: parseFloat(measures.coverage?.value || 0),
        new: parseFloat(measures.new_coverage?.value || 0)
      },
      duplication: {
        density: parseFloat(measures.duplicated_lines_density?.value || 0),
        newDensity: parseFloat(measures.new_duplicated_lines_density?.value || 0)
      },
      size: {
        linesOfCode: parseInt(measures.ncloc?.value || 0),
        complexity: parseInt(measures.complexity?.value || 0)
      },
      newCode: {
        bugs: parseInt(measures.new_bugs?.value || 0),
        vulnerabilities: parseInt(measures.new_vulnerabilities?.value || 0),
        codeSmells: parseInt(measures.new_code_smells?.value || 0)
      },
      // Quality gates
      overallRating: this.calculateOverallRating(measures),
      technicalDebtMinutes: parseInt(measures.sqale_index?.value || 0)
    };
  }

  calculateOverallRating(measures) {
    const ratings = [
      measures.reliability_rating?.value,
      measures.security_rating?.value, 
      measures.sqale_rating?.value
    ].filter(Boolean);

    if (ratings.length === 0) return 'A';
    
    // Return worst rating (E is worst, A is best)
    const ratingOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
    const worstRating = ratings.reduce((worst, current) => {
      return ratingOrder[current] > ratingOrder[worst] ? current : worst;
    });

    return worstRating;
  }

  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}

module.exports = new SonarCloudService();
