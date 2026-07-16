import { Controller, Post, Get, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { DailyGamesService } from './daily-games.service';

@Controller('api/games/daily')
export class DailyGamesController {
  constructor(private readonly dailyGamesService: DailyGamesService) {}

  @Post()
  async createGame(@Req() req: any, @Body() body: { opponentId: string; daysPerMove: number }) {
    // Fallback logic in case req.user is undefined by better-auth
    const userId = req.user?.id || req.body?.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.dailyGamesService.createDailyGame(userId, body.opponentId, body.daysPerMove);
  }

  @Get('my-games')
  async getMyGames(@Req() req: any) {
    const userId = req.user?.id || req.query?.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.dailyGamesService.getMyDailyGames(userId);
  }

  @Get(':id')
  async getGame(@Param('id') gameId: string) {
    return this.dailyGamesService.getGameById(gameId);
  }

  @Post(':id/move')
  async makeMove(
    @Req() req: any,
    @Param('id') gameId: string,
    @Body() body: { from: string; to: string; userId?: string }
  ) {
    const userId = req.user?.id || body.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.dailyGamesService.makeMove(userId, gameId, body.from, body.to);
  }
}
