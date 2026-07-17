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
    @Req() req: AuthenticatedRequest,
    @Param('id') tournamentId: string,
  ) {
    const userId = req.user?.id || (req.query?.userId as string);
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.tournamentsService.joinTournament(userId, tournamentId);
  }

  // Admin or testing endpoint
  @Post('create-arena')
  async createArena(
    @Body()
    body: {
      name: string;
      timeControl: string;
      durationMinutes: number;
      startsInMinutes: number;
    },
  ) {
    const startTime = new Date(Date.now() + body.startsInMinutes * 60000);
    return this.tournamentsService.createArena(
      body.name,
      body.timeControl,
      startTime,
      body.durationMinutes,
    );
  }
}
