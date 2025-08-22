import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SonarCloudMetrics } from './sonarcloud.service';

@Injectable()
export class DataStoreService {
  private readonly dataDir = join(__dirname, '../../data');
  private readonly metricsFile = join(this.dataDir, 'metrics.json');

  constructor() {
    this.ensureDataDir();
  }

  private async ensureDataDir() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  async saveMetrics(metrics: SonarCloudMetrics): Promise<void> {
    try {
      let existingData = [];
      
      try {
        const data = await fs.readFile(this.metricsFile, 'utf8');
        existingData = JSON.parse(data);
      } catch {
        // File doesn't exist yet, start with empty array
      }

      existingData.push(metrics);

      // Keep only last 1000 entries to prevent file from growing too large
      if (existingData.length > 1000) {
        existingData = existingData.slice(-1000);
      }

      await fs.writeFile(this.metricsFile, JSON.stringify(existingData, null, 2));
    } catch (error) {
      console.error('Error saving metrics:', error);
      throw error;
    }
  }

  async getLatestMetrics(): Promise<SonarCloudMetrics | null> {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      const metrics = JSON.parse(data);
      return metrics.length > 0 ? metrics[metrics.length - 1] : null;
    } catch (error) {
      console.error('Error reading latest metrics:', error);
      return null;
    }
  }

  async getMetricsHistory(hours = 24): Promise<SonarCloudMetrics[]> {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      const metrics = JSON.parse(data);
      
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      return metrics.filter(metric => new Date(metric.timestamp) > cutoffTime);
    } catch (error) {
      console.error('Error reading metrics history:', error);
      return [];
    }
  }

  async getAllMetrics(): Promise<SonarCloudMetrics[]> {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading all metrics:', error);
      return [];
    }
  }

  async getMetricsStats() {
    try {
      const metrics = await this.getAllMetrics();
      
      if (metrics.length === 0) {
        return {
          totalDataPoints: 0,
          oldestRecord: null,
          newestRecord: null,
          averageInterval: null
        };
      }

      const timestamps = metrics.map(m => new Date(m.timestamp));
      timestamps.sort((a, b) => a.getTime() - b.getTime());

      let totalInterval = 0;
      for (let i = 1; i < timestamps.length; i++) {
        totalInterval += timestamps[i].getTime() - timestamps[i-1].getTime();
      }

      return {
        totalDataPoints: metrics.length,
        oldestRecord: timestamps[0].toISOString(),
        newestRecord: timestamps[timestamps.length - 1].toISOString(),
        averageInterval: timestamps.length > 1 ? Math.round(totalInterval / (timestamps.length - 1) / 1000 / 60) : null // minutes
      };
    } catch (error) {
      console.error('Error calculating metrics stats:', error);
      return null;
    }
  }
}