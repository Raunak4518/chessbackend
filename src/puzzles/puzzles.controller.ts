import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { PuzzlesService } from './puzzles.service';
import type { AuthenticatedRequest } from '../types';
import { AddPuzzleCommentDto } from './dto/puzzles.dto';

@Controller('api/puzzles')
export class PuzzlesController {
  constructor(private readonly puzzlesService: PuzzlesService) {}

  @Get('rated')
  async getRatedPuzzle(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id || (req.query?.userId as string);
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.getRatedPuzzle(userId);
  }

  @Get('custom')
  async getCustomPuzzles(
    @Query('theme') theme: string,
    @Query('limit') limit: string,
  ) {
    return this.puzzlesService.getCustomPuzzles(
      theme || 'endgame',
      Number(limit) || 10,
    );
  }

  @Get('daily')
  async getDailyPuzzle() {
    return this.puzzlesService.getDailyPuzzle();
  }

  @Get('rush')
  async getRushBatch(@Query('limit') limit: string) {
    return this.puzzlesService.getBatchForRush(Number(limit) || 20);
  }

  @Post('rated/:id/result')
  async submitPuzzleResult(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { success: boolean; timeTaken: number; userId?: string },
  ) {
    const userId = req.user?.id || body.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.submitAttempt(
      userId,
      id,
      body.success,
      body.timeTaken || 0,
    );
  }

  @Get('daily/:id/comments')
  async getDailyPuzzleComments(@Param('id') id: string) {
    return this.puzzlesService.getDailyPuzzleComments(id);
  }

  @Post('daily/:id/comments')
  async addDailyPuzzleComment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AddPuzzleCommentDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.addDailyPuzzleComment(userId, id, body.content);
  }
}
