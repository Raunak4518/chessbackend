import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
}
