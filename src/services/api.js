window.API = {
  baseURL: '/api',

  async getLatestMetrics() {
    return await axios.get(`${this.baseURL}/metrics/latest`);
  },

  async getMetricsHistory(hours = 24) {
    return await axios.get(`${this.baseURL}/metrics/history?hours=${hours}`);
  },

  async getAllMetrics() {
    return await axios.get(`${this.baseURL}/metrics/all`);
  },

  async getMetricsStats() {
    return await axios.get(`${this.baseURL}/metrics/stats`);
  },

  async triggerCollection() {
    return await axios.post(`${this.baseURL}/metrics/collect`);
  },

  async getQualityGate() {
    return await axios.get(`${this.baseURL}/quality-gate`);
  },

  async getHealthStatus() {
    return await axios.get(`${this.baseURL}/health`);
  }
};
