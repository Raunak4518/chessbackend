import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Processor('anti-cheat-queue')
export class AntiCheatProcessor extends WorkerHost {
  private readonly logger = new Logger(AntiCheatProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing anti-cheat check for game ${job.data.gameId}`);

    const { gameId, whitePlayerId, blackPlayerId, pgn, moves } = job.data;

    // Simulate basic lightweight heuristic classification
    // 1. Move time variance (if moves are provided with timestamps)
    // 2. High percentage of instant moves (less than 1s)

    // For now, let's simulate a quick heuristic algorithm
    let suspiciousUserId: string | null = null;
    let suspiciousReason = '';

    // Simulate some logic here (mocked for now, to be replaced by actual engine in future)
    if (moves && moves.length > 20) {
      // Mock logic: randomly flag 1 in 1000, or explicitly flag if some test condition is met
      // Here we just parse the PGN and check if someone played flawlessly fast
      const fastMovesThreshold = 0.8; 
      // Imagine we found 80% of moves played in exactly 2.5 seconds
      // Let's mock a detection if the PGN contains a specific signature
      if (pgn && pgn.includes('flag_me_please')) {
         suspiciousUserId = whitePlayerId;
         suspiciousReason = 'Heuristic: Abnormal move timing consistency (95% correlation)';
      }
    }

    if (suspiciousUserId) {
      this.logger.warn(`Suspicious activity detected in game ${gameId} for user ${suspiciousUserId}. Reason: ${suspiciousReason}`);
      
      await this.prisma.user.update({
        where: { id: suspiciousUserId },
        data: { isFlaggedForCheating: true },
      });

      // We could also notify moderators via WebSockets or email here
    }

    return { status: 'completed', flagged: !!suspiciousUserId };
  }
}
