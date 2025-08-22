const cron = require('node-cron');
const sonarCloudService = require('./sonarcloud');
const dataStore = require('./dataStore');

class Scheduler {
  constructor() {
    this.isRunning = false;
  }

  start() {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      await this.collectMetrics();
    });

    // Run immediately on startup
    this.collectMetrics();
    
    console.log('Scheduler started - collecting SonarCloud metrics every 10 minutes');
  }

  async collectMetrics() {
    if (this.isRunning) {
      console.log('Metrics collection already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log('Collecting SonarCloud metrics...');
      const metrics = await sonarCloudService.getProjectMeasures();
      await dataStore.saveMetrics(metrics);
      console.log(`Metrics collected successfully at ${metrics.timestamp}`);
    } catch (error) {
      console.error('Failed to collect metrics:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  async forceCollection() {
    await this.collectMetrics();
  }
}

module.exports = new Scheduler();
