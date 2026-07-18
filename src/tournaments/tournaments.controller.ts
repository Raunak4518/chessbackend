import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { AuthenticatedRequest } from '../types';
import { CreateArenaDto } from './dto/tournaments.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @AllowAnonymous()
  @Get()
  async getTournaments() {
    return this.tournamentsService.listTournaments();
  }

  @AllowAnonymous()
  @Get(':id')
  async getTournamentDetails(@Param('id') id: string) {
    return this.tournamentsService.getTournament(id);
  }

  @Post(':id/join')
  async joinTournament(
    @CurrentUser() userId: string,
    @Param('id') tournamentId: string,
  ) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.tournamentsService.joinTournament(userId, tournamentId);
  }

  @Post('create-arena')
  async createArena(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateArenaDto,
  ) {
    if (!req.user || req.user.email !== 'admin@chessing.local') {
      throw new UnauthorizedException('Only administrators can create arenas');
    }
    const startTime = new Date(Date.now() + body.startsInMinutes * 60000);
    return this.tournamentsService.createArena(
      body.name,
      body.timeControl,
      startTime,
      body.durationMinutes,
    );
  }
}
