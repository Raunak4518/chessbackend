import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;

      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
      
      this.prisma.systemLog.create({
        data: {
          level,
          message: `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          meta: {
            ip,
            userAgent: headers['user-agent'],
            duration,
          },
        },
      }).catch((e) => console.error('Failed to write to SystemLog', e));
    });

    next();
  }
}
