import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { OpeningsService } from './openings.service';

@Controller('api/openings')
export class OpeningsController {
  constructor(private readonly openingsService: OpeningsService) {}

  @Get('name')
  async getOpeningName(@Query('fen') fen: string) {
    if (!fen) {
      throw new BadRequestException('FEN is required');
    }
    return this.openingsService.getOpeningName(fen);
  }

  @Get('top-games')
  async getTopGames(
    @Query('fen') fen: string,
    @Query('limit') limit?: string,
  ) {
    if (!fen) {
      throw new BadRequestException('FEN is required');
    }
    const topGames = limit ? parseInt(limit, 10) : 5;
    return this.openingsService.getTopGames(fen, topGames);
  }
}
