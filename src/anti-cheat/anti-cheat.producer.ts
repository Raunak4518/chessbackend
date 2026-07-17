import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AntiCheatProducer {
  private readonly logger = new Logger(AntiCheatProducer.name);

  constructor(@InjectQueue('anti-cheat-queue') private antiCheatQueue: Queue) {}

  async analyzeGame(gameData: {
    gameId: string;
    whitePlayerId: string;
    blackPlayerId: string;
    pgn: string;
    moves?: any[];
  }) {
    this.logger.log(`Adding game ${gameData.gameId} to anti-cheat queue`);
    await this.antiCheatQueue.add('analyze-game', gameData, {
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
