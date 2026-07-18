import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { OverworldService } from './overworld.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/overworld')
export class OverworldController {
  constructor(private readonly overworldService: OverworldService) {}

  @Get('map')
  async getMapState(@CurrentUser() userId: string) {
    return this.overworldService.getMapState(userId);
  }
}
