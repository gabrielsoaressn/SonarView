import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SonarCloudService } from './sonarcloud.service';
import { DataStoreService } from './datastore.service';

@Injectable()
export class SchedulerService {
  private isRunning = false;

  constructor(
    private readonly sonarCloudService: SonarCloudService,
    private readonly dataStoreService: DataStoreService,
  ) {
    // Run immediately on startup
    this.collectMetrics();
  }

  @Cron('*/10 * * * *') // Run every 10 minutes
  async collectMetrics() {
    if (this.isRunning) {
      console.log('Metrics collection already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log('Collecting SonarCloud metrics...');
      const metrics = await this.sonarCloudService.getProjectMeasures();
      await this.dataStoreService.saveMetrics(metrics);
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