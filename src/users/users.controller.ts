import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@AllowAnonymous()
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    if (!query || query.length < 2) return [];
    
    return this.prisma.user.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 10,
      select: {
        id: true,
        name: true,
        rating: true,
        image: true,
      }
    });
  }

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

  @Get('leaderboard/global')
  async getGlobalLeaderboard() {
    const topBullet = await this.prisma.user.findMany({ orderBy: { ratingBullet: 'desc' }, take: 50, select: { id: true, name: true, image: true, country: true, ratingBullet: true }});
    const topBlitz = await this.prisma.user.findMany({ orderBy: { ratingBlitz: 'desc' }, take: 50, select: { id: true, name: true, image: true, country: true, ratingBlitz: true }});
    const topRapid = await this.prisma.user.findMany({ orderBy: { ratingRapid: 'desc' }, take: 50, select: { id: true, name: true, image: true, country: true, ratingRapid: true }});

    return { bullet: topBullet, blitz: topBlitz, rapid: topRapid };
  }

  @Get(':id/rating-history')
  async getRatingHistory(@Param('id') id: string, @Query('timeframe') timeframe: string) {
    let dateFilter = new Date(0); // All time
    if (timeframe === '7d') dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    else if (timeframe === '30d') dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    else if (timeframe === '1y') dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const history = await this.prisma.ratingHistory.findMany({
      where: {
        userId: id,
        createdAt: { gte: dateFilter },
      },
      orderBy: { createdAt: 'asc' },
    });

    return history;
  }

  @Get(':id/advanced-insights')
  async getAdvancedInsights(@Param('id') id: string) {
    const allGames = await this.prisma.game.findMany({
      where: {
        OR: [
          { whitePlayerId: id },
          { blackPlayerId: id },
        ],
        status: { in: ['COMPLETED', 'DRAW'] },
      },
      select: {
        winner: true,
        status: true,
        whitePlayerId: true,
        blackPlayerId: true,
        opening: true,
        createdAt: true,
      }
    });

    const insights = {
      white: { wins: 0, losses: 0, draws: 0 },
      black: { wins: 0, losses: 0, draws: 0 },
      openings: {} as Record<string, { wins: 0, losses: 0, draws: 0 }>,
      timeOfDay: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    };

    for (const g of allGames) {
      const isWhite = g.whitePlayerId === id;
      const didWin = (isWhite && g.winner === 'WHITE') || (!isWhite && g.winner === 'BLACK');
      const isDraw = g.winner === 'DRAW' || g.status === 'DRAW';
      const didLose = !didWin && !isDraw;

      if (isWhite) {
        if (didWin) insights.white.wins++;
        else if (isDraw) insights.white.draws++;
        else insights.white.losses++;
      } else {
        if (didWin) insights.black.wins++;
        else if (isDraw) insights.black.draws++;
        else insights.black.losses++;
      }

      const opening = g.opening || 'Unknown';
      if (!insights.openings[opening]) insights.openings[opening] = { wins: 0, losses: 0, draws: 0 };
      if (didWin) insights.openings[opening].wins++;
      else if (isDraw) insights.openings[opening].draws++;
      else insights.openings[opening].losses++;

      const hour = g.createdAt.getHours();
      if (hour >= 5 && hour < 12) insights.timeOfDay.morning++;
      else if (hour >= 12 && hour < 17) insights.timeOfDay.afternoon++;
      else if (hour >= 17 && hour < 21) insights.timeOfDay.evening++;
      else insights.timeOfDay.night++;
    }

    return insights;
  }

  @Get(':id/achievements')
  async getAchievements(@Param('id') id: string) {
    const achievements = await this.prisma.userAchievement.findMany({
      where: { userId: id },
      orderBy: { unlockedAt: 'desc' },
    });
    return achievements;
  }
}
