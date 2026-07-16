import { Module } from '@nestjs/common';
import { PuzzlesController } from './puzzles.controller';
import { PuzzlesService } from './puzzles.service';
import { PrismaService } from '../prisma/prisma.service';
import { PuzzleBattleGateway } from './puzzle-battle.gateway';

@Module({
  controllers: [PuzzlesController],
  providers: [PuzzlesService, PrismaService, PuzzleBattleGateway],
})
export class PuzzlesModule {}
