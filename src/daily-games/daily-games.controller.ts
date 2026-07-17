import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { DailyGamesService } from './daily-games.service';
import type { AuthenticatedRequest } from '../types';
import { CreateDailyGameDto, MakeDailyMoveDto } from './dto/daily-games.dto';

@Controller('api/games/daily')
export class DailyGamesController {
  constructor(private readonly dailyGamesService: DailyGamesService) {}

  @Post()
  async createGame(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateDailyGameDto,
  ) {
    // Fallback logic in case req.user is undefined by better-auth
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.dailyGamesService.createDailyGame(
      userId,
      body.opponentId,
      body.daysPerMove,
    );
  }

  @Get('my-games')
  async getMyGames(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.dailyGamesService.getMyDailyGames(userId);
  }

  @Get(':id')
  async getGame(@Param('id') gameId: string) {
    return this.dailyGamesService.getGameById(gameId);
  }

  @Post(':id/move')
  async makeMove(
    @Req() req: AuthenticatedRequest,
    @Param('id') gameId: string,
    @Body() body: MakeDailyMoveDto,
  ) {
    const userId = req.user?.id || body.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.dailyGamesService.makeMove(userId, gameId, body.from, body.to);
  }
}

