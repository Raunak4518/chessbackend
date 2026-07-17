import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { AuthenticatedRequest } from '../types';
import { IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class AnalyzePgnDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  pgn: string;
}

@Controller('api/analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('pgn')
  async analyzePgn(@Body() body: AnalyzePgnDto) {
    if (!body.pgn) throw new Error('PGN required');
    return this.analysisService.analyzePgn(body.pgn);
  }

  @Post(':id')
  async triggerAnalysis(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = req.user?.id || (req.query?.userId as string);
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.analysisService.analyzeGame(id);
  }

  @AllowAnonymous()
  @Get(':id')
  async getAnalysis(@Param('id') id: string) {
    return this.analysisService.analyzeGame(id);
  }

  @AllowAnonymous()
  @Get(':id/coach')
  async getCoachAnalysis(@Param('id') id: string) {
    // This is a mocked LLM script generator for the game.
    // In a real scenario, this would query an LLM provider with the game's PGN.
    return {
      script: [
        { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: "Welcome to your post-game review. Let's see how you did.", audioUrl: null },
        { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", text: "You started with a strong classical opening.", audioUrl: null },
        { fen: "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2", text: "Developing the Bishop to C4 puts pressure on the center.", audioUrl: null },
        { fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3", text: "But you blundered the knight later. Let's work on your tactical vision.", audioUrl: null }
      ]
    };
  }
}
