import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LogCleanupService } from './log-cleanup/log-cleanup.service';
import { LoggerMiddleware } from './logger/logger.middleware';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrismaModule, 
    ScheduleModule.forRoot(),
    PrometheusModule.register({
      path: '/metrics', // expose metrics
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [LogCleanupService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
