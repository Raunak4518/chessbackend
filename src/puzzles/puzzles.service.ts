import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PuzzlesService {
  constructor(private prisma: PrismaService) {}

  async getRatedPuzzle(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const userRating = user.ratingPuzzle;

    // Find a puzzle close to the user's rating that they haven't attempted yet
    const puzzle = await this.prisma.puzzle.findFirst({
      where: {
        rating: {
          gte: userRating - 200,
          lte: userRating + 200,
        },
        puzzleAttempts: {
          none: {
            userId: userId,
          },
        },
      },
      orderBy: {
        rating: 'asc', // simple tie breaker
      },
    });

    if (!puzzle) {
      // Fallback: just return a random puzzle if they've solved all in range
      return this.prisma.puzzle.findFirst({
        where: {
          puzzleAttempts: {
            none: {
              userId: userId,
            },
          },
        },
      });
    }

    return puzzle;
  }

  async getCustomPuzzles(theme: string, limit = 10) {
    return this.prisma.puzzle.findMany({
      where: {
        themes: {
          has: theme,
        },
      },
      take: limit,
    });
  }

  async getDailyPuzzle() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daily = await this.prisma.dailyPuzzle.findUnique({
      where: { date: today },
      include: { puzzle: true },
    });

    if (!daily) {
      // Create one if it doesn't exist for today
      const randomPuzzle = await this.prisma.puzzle.findFirst();
      if (!randomPuzzle) throw new NotFoundException('No puzzles in DB');

      daily = await this.prisma.dailyPuzzle.create({
        data: {
          date: today,
          puzzleId: randomPuzzle.id,
        },
        include: { puzzle: true },
      });
    }

    return daily;
  }

  async getBatchForRush(limit = 20) {
    // Return a progressively harder batch of puzzles for Puzzle Rush
    return this.prisma.puzzle.findMany({
      orderBy: { rating: 'asc' },
      take: limit,
    });
  }

  async submitAttempt(
    userId: string,
    puzzleId: string,
    success: boolean,
    timeSpentMs: number,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const puzzle = await this.prisma.puzzle.findUnique({
      where: { id: puzzleId },
    });

    if (!user || !puzzle)
      throw new NotFoundException('User or Puzzle not found');

    // Simplified Elo calculation
    const expectedScore =
      1 / (1 + Math.pow(10, (puzzle.rating - user.ratingPuzzle) / 400));
    const actualScore = success ? 1 : 0;
    const K = 32;

    const ratingChange = Math.round(K * (actualScore - expectedScore));

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { ratingPuzzle: Math.max(100, user.ratingPuzzle + ratingChange) },
    });

    // Also update puzzle rating slightly (e.g. K=16 for puzzles)
    const pRatingChange = Math.round(
      16 * (1 - actualScore - (1 - expectedScore)),
    );

    await this.prisma.puzzle.update({
      where: { id: puzzleId },
      data: {
        rating: Math.max(100, puzzle.rating + pRatingChange),
        attempts: { increment: 1 },
        successes: { increment: success ? 1 : 0 },
      },
    });

    await this.prisma.puzzleAttempt.create({
      data: {
        userId,
        puzzleId,
        success,
        timeSpentMs,
        ratingDiff: ratingChange,
      },
    });

    return {
      newRating: updatedUser.ratingPuzzle,
      ratingChange,
      success,
    };
  }

  async getDailyPuzzleComments(dailyPuzzleId: string) {
    return this.prisma.dailyPuzzleComment.findMany({
      where: { dailyPuzzleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            ratingPuzzle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDailyPuzzleComment(
    userId: string,
    dailyPuzzleId: string,
    content: string,
  ) {
    return this.prisma.dailyPuzzleComment.create({
      data: {
        userId,
        dailyPuzzleId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            ratingPuzzle: true,
          },
        },
      },
    });
  }
}
