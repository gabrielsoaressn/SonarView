import { Controller, Get, Post, Query } from '@nestjs/common';
import { DataStoreService } from '../services/datastore.service';
import { SchedulerService } from '../services/scheduler.service';

@Controller('api/metrics')
export class MetricsController {
  constructor(
    private readonly dataStoreService: DataStoreService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @Get('latest')
  async getLatestMetrics() {
    const metrics = await this.dataStoreService.getLatestMetrics();
    
    if (!metrics) {
      return {
        error: 'No metrics data available',
        message: 'Please wait for the first data collection cycle to complete'
      };
    }

    return metrics;
  }

  @Get('history')
  async getMetricsHistory(@Query('hours') hours?: string) {
    const hoursNumber = hours ? parseInt(hours, 10) : 24;
    return await this.dataStoreService.getMetricsHistory(hoursNumber);
  }

  @Get('all')
  async getAllMetrics() {
    return await this.dataStoreService.getAllMetrics();
  }

  @Get('stats')
  async getMetricsStats() {
    return await this.dataStoreService.getMetricsStats();
  }

  @Post('collect')
  async triggerCollection() {
    await this.schedulerService.forceCollection();
    return { message: 'Metrics collection triggered successfully' };
  }

  @Get('quality-gate')
  async getQualityGate() {
    const metrics = await this.dataStoreService.getLatestMetrics();
    
    if (!metrics) {
      return { error: 'No metrics data available' };
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

    return qualityGate;
  }

  @Get('health')
  getHealth() {
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'Aurora View API'
    };
  }
}