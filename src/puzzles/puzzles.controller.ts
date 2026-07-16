import { Controller, Get, Post, Body, Query, Req, UnauthorizedException } from '@nestjs/common';
import { PuzzlesService } from './puzzles.service';

@Controller('api/puzzles')
export class PuzzlesController {
  constructor(private readonly puzzlesService: PuzzlesService) {}

  @Get('rated')
  async getRatedPuzzle(@Req() req) {
    const userId = req.user?.id || req.query?.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.getRatedPuzzle(userId);
  }

  @Get('custom')
  async getCustomPuzzles(@Query('theme') theme: string, @Query('limit') limit: string) {
    return this.puzzlesService.getCustomPuzzles(theme || 'endgame', Number(limit) || 10);
  }

  @Get('daily')
  async getDailyPuzzle() {
    return this.puzzlesService.getDailyPuzzle();
  }

  @Get('rush')
  async getRushBatch(@Query('limit') limit: string) {
    return this.puzzlesService.getBatchForRush(Number(limit) || 20);
  }

  @Post('solve')
  async submitAttempt(
    @Req() req,
    @Body() body: { puzzleId: string; success: boolean; timeSpentMs: number }
  ) {
    const userId = req.user?.id || req.query?.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.submitAttempt(
      userId,
      body.puzzleId,
      body.success,
      body.timeSpentMs || 0
    );
  }

  @Get('daily/:id/comments')
  async getDailyPuzzleComments(@Req() req) {
    return this.puzzlesService.getDailyPuzzleComments(req.params.id);
  }

  @Post('daily/:id/comments')
  async addDailyPuzzleComment(
    @Req() req,
    @Body() body: { content: string }
  ) {
    const userId = req.user?.id || req.query?.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.addDailyPuzzleComment(
      userId,
      req.params.id,
      body.content
    );
  }
}
