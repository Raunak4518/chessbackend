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
import { AddPuzzleCommentDto, SubmitPuzzleResultDto, CustomPuzzlesQueryDto, RushBatchQueryDto } from './dto/puzzles.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/puzzles')
export class PuzzlesController {
  constructor(private readonly puzzlesService: PuzzlesService) {}

  @Get('rated')
  async getRatedPuzzle(@CurrentUser() userId: string) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.getRatedPuzzle(userId);
  }

  @Get('custom')
  async getCustomPuzzles(@Query() query: CustomPuzzlesQueryDto) {
    return this.puzzlesService.getCustomPuzzles(
      query.theme || 'endgame',
      Number(query.limit) || 10,
    );
  }

  @Get('daily')
  async getDailyPuzzle() {
    return this.puzzlesService.getDailyPuzzle();
  }

  @Get('rush')
  async getRushBatch(@Query() query: RushBatchQueryDto) {
    return this.puzzlesService.getBatchForRush(Number(query.limit) || 20);
  }

  @Post('rated/:id/result')
  async submitPuzzleResult(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: SubmitPuzzleResultDto,
  ) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.submitAttempt(
      userId,
      id,
      body.movesMade || [],
      body.timeTaken || 0,
    );
  }

  @Get('daily/:id/comments')
  async getDailyPuzzleComments(@Param('id') id: string) {
    return this.puzzlesService.getDailyPuzzleComments(id);
  }

  @Post('daily/:id/comments')
  async addDailyPuzzleComment(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: AddPuzzleCommentDto,
  ) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.puzzlesService.addDailyPuzzleComment(userId, id, body.content);
  }
}
