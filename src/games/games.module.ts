import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { MatchmakingService } from './matchmaking.service';

import { TournamentsModule } from '../tournaments/tournaments.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { OverworldModule } from '../overworld/overworld.module';

@Module({
  imports: [TournamentsModule, AntiCheatModule, OverworldModule],
  providers: [GamesGateway, GamesService, MatchmakingService],
})
export class GamesModule {}
