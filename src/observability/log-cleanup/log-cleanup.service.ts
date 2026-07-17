import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LogCleanupService {
  private readonly logger = new Logger(LogCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Starting daily log cleanup...');
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const result = await this.prisma.systemLog.deleteMany({
        where: {
          level: 'info', // Keep warnings and errors
          createdAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old info logs.`);
    } catch (error) {
      this.logger.error('Failed to clean up logs', error);
    }
  }
}
