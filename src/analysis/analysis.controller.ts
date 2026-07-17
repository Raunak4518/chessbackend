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

@Controller('api/analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('pgn')
  async analyzePgn(@Body() body: { pgn: string }) {
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
}

