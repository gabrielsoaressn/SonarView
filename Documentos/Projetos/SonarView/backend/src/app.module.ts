import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SonarCloudService } from './services/sonarcloud.service';
import { MetricsController } from './controllers/metrics.controller';
import { SchedulerService } from './services/scheduler.service';
import { DataStoreService } from './services/datastore.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MetricsController],
  providers: [SonarCloudService, SchedulerService, DataStoreService],
})
export class AppModule {}