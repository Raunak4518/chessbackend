import { Controller, Get, Req, Param, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
import { QuestsService } from './quests.service';
import type { AuthenticatedRequest } from '../types';

@Controller('api/quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Get('active')
  async getActiveQuests(@Req() req: AuthenticatedRequest) {
    // If not authenticated, return empty array for now
    if (!req.user || !req.user.id) return [];

    return this.questsService.getActiveQuests(req.user.id);
  }

  @Get(':id/claim')
  async claimQuestReward(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    if (!req.user || !req.user.id) throw new UnauthorizedException('Not logged in');
    try {
      return await this.questsService.claimQuestReward(req.user.id, id);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
