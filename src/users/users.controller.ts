import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@AllowAnonymous()
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        rating: true,
        ratingBullet: true,
        ratingBlitz: true,
        ratingRapid: true,
        ratingDaily: true,
        lastActiveBullet: true,
        lastActiveBlitz: true,
        lastActiveRapid: true,
        lastActiveDaily: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const games = await this.prisma.game.findMany({
      where: {
        OR: [
          { whitePlayerId: id },
          { blackPlayerId: id },
        ],
        status: { in: ['COMPLETED', 'DRAW'] },
      },
      include: {
        whitePlayer: {
          select: { id: true, name: true, image: true, ratingBullet: true, ratingBlitz: true, ratingRapid: true, ratingDaily: true },
        },
        blackPlayer: {
          select: { id: true, name: true, image: true, ratingBullet: true, ratingBlitz: true, ratingRapid: true, ratingDaily: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const statsTypes = ['BULLET', 'BLITZ', 'RAPID', 'DAILY'];
    const stats: Record<string, { total: number; wins: number; losses: number; draws: number }> = {};

    for (const type of statsTypes) {
      stats[type] = { total: 0, wins: 0, losses: 0, draws: 0 };
    }

    const allGames = await this.prisma.game.findMany({
      where: {
        OR: [
          { whitePlayerId: id },
          { blackPlayerId: id },
        ],
        status: { in: ['COMPLETED', 'DRAW'] },
      },
    });

    for (const g of allGames) {
      const type = g.gameType || 'RAPID';
      if (!stats[type]) {
        stats[type] = { total: 0, wins: 0, losses: 0, draws: 0 };
      }

      stats[type].total++;
      if (g.winner === 'DRAW' || g.status === 'DRAW') {
        stats[type].draws++;
      } else if (g.winner === 'WHITE') {
        if (g.whitePlayerId === id) {
          stats[type].wins++;
        } else {
          stats[type].losses++;
        }
      } else if (g.winner === 'BLACK') {
        if (g.blackPlayerId === id) {
          stats[type].wins++;
        } else {
          stats[type].losses++;
        }
      }
    }

    return {
      user,
      recentGames: games,
      stats,
    };
  }
}
