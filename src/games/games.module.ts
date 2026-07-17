import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { MatchmakingService } from './matchmaking.service';

import { TournamentsModule } from '../tournaments/tournaments.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';

@Module({
  imports: [TournamentsModule, AntiCheatModule],
  providers: [GamesGateway, GamesService, MatchmakingService],
})
export class GamesModule {}
