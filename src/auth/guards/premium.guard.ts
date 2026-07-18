import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../../types';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });

    if (!user || !user.isPremium) {
      throw new ForbiddenException('This feature requires a Premium subscription');
    }

    return true;
  }
}
