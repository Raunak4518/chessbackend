import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

export interface QueueItem {
  socketId: string;
  rating: number;
  timeControl: string;
  gameType: string;
  joinedAt: number;
  tournamentId?: string;
}

export interface MatchResult {
  roomName: string;
  white: string;
  black: string;
  timeControl: string;
  gameType: string;
  tournamentId?: string;
}

@Injectable()
export class MatchmakingService implements OnModuleInit, OnModuleDestroy {
  private queue: QueueItem[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private matchCallback: ((match: MatchResult) => void) | null = null;

  onModuleInit() {
    this.intervalId = setInterval(() => {
      this.checkMatches();
    }, 2000);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  registerMatchCallback(callback: (match: MatchResult) => void) {
    this.matchCallback = callback;
  }

  joinQueue(
    socketId: string,
    rating: number,
    timeControl: string,
    gameType: string,
    tournamentId?: string,
  ) {
    this.leaveQueue(socketId);
    this.queue.push({
      socketId,
      rating,
      timeControl,
      gameType,
      joinedAt: Date.now(),
      tournamentId,
    });
  }

  leaveQueue(socketId: string) {
    this.queue = this.queue.filter((item) => item.socketId !== socketId);
  }

  private checkMatches() {
    if (this.queue.length < 2) {
      return;
    }

    const matchedIndices = new Set<number>();

    for (let i = 0; i < this.queue.length; i++) {
      if (matchedIndices.has(i)) continue;

      for (let j = i + 1; j < this.queue.length; j++) {
        if (matchedIndices.has(j)) continue;

        const playerA = this.queue[i];
        const playerB = this.queue[j];

        // Must be in the same gameType pool
        if (playerA.gameType !== playerB.gameType) continue;

        // Must be in the same tournament (or both outside)
        if (playerA.tournamentId !== playerB.tournamentId) continue;

        if (this.areCompatible(playerA, playerB)) {
          matchedIndices.add(i);
          matchedIndices.add(j);

          const roomName = `room-${Math.random().toString(36).substring(2, 10)}`;
          const assignWhite = Math.random() < 0.5;

          const match: MatchResult = {
            roomName,
            white: assignWhite ? playerA.socketId : playerB.socketId,
            black: assignWhite ? playerB.socketId : playerA.socketId,
            timeControl: playerA.timeControl,
            gameType: playerA.gameType,
            tournamentId: playerA.tournamentId,
          };

          if (this.matchCallback) {
            this.matchCallback(match);
          }
          break;
        }
      }
    }

    if (matchedIndices.size > 0) {
      this.queue = this.queue.filter((_, idx) => !matchedIndices.has(idx));
    }
  }

  private areCompatible(a: QueueItem, b: QueueItem): boolean {
    const elapsedA = (Date.now() - a.joinedAt) / 1000;
    const elapsedB = (Date.now() - b.joinedAt) / 1000;

    const thresholdA = 100 + Math.floor(elapsedA / 5) * 50;
    const thresholdB = 100 + Math.floor(elapsedB / 5) * 50;

    const ratingDiff = Math.abs(a.rating - b.rating);

    return ratingDiff <= thresholdA && ratingDiff <= thresholdB;
  }
}
