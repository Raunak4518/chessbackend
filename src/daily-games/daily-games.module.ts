import { Module } from '@nestjs/common';
import { DailyGamesController } from './daily-games.controller';
import { DailyGamesService } from './daily-games.service';

@Module({
  controllers: [DailyGamesController],
  providers: [DailyGamesService]
})
export class DailyGamesModule {}
