import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { MatchmakingService } from './matchmaking.service';

@Module({
  providers: [GamesGateway, GamesService, MatchmakingService],
})
export class GamesModule {}
