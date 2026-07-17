import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Chess } from 'chess.js';
import { GameStatus, GameWinner } from '@prisma/client';

@Injectable()
export class DailyGamesService {
  private readonly logger = new Logger(DailyGamesService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleTimeouts() {
    this.logger.log('Checking for daily games timeouts...');
    const now = new Date();

    const timedOutGames = await this.prisma.game.findMany({
      where: {
        timeControlCategory: 'DAILY',
        status: { in: ['WAITING', 'IN_PROGRESS'] },
        deadline: { lt: now },
        isTimeout: false,
      },
    });

    for (const game of timedOutGames) {
      const chess = new Chess(game.fen);
      const isWhiteTurn = chess.turn() === 'w';

      await this.prisma.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.COMPLETED,
          winner: isWhiteTurn ? GameWinner.BLACK : GameWinner.WHITE,
          isTimeout: true,
        },
      });
      this.logger.log(
        `Game ${game.id} timed out. Winner: ${isWhiteTurn ? 'BLACK' : 'WHITE'}`,
      );
    }
  }

  async createDailyGame(
    whitePlayerId: string,
    blackPlayerId: string,
    daysPerMove: number,
  ) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysPerMove);

    return this.prisma.game.create({
      data: {
        whitePlayerId,
        blackPlayerId,
        timeControlCategory: 'DAILY',
        daysPerMove,
        deadline,
        gameType: 'DAILY',
      },
    });
  }

  async getMyDailyGames(userId: string) {
    return this.prisma.game.findMany({
      where: {
        timeControlCategory: 'DAILY',
        status: { in: ['WAITING', 'IN_PROGRESS'] },
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      },
      include: {
        whitePlayer: {
          select: {
            id: true,
            name: true,
            rating: true,
            ratingDaily: true,
            image: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            name: true,
            rating: true,
            ratingDaily: true,
            image: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getGameById(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: {
          select: {
            id: true,
            name: true,
            rating: true,
            ratingDaily: true,
            image: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            name: true,
            rating: true,
            ratingDaily: true,
            image: true,
          },
        },
      },
    });
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  async makeMove(userId: string, gameId: string, from: string, to: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');
    if (game.status === 'COMPLETED' || game.status === 'ABANDONED')
      throw new BadRequestException('Game is over');

    const chess = new Chess(game.fen);
    const turn = chess.turn();
    const isWhiteTurn = turn === 'w';

    if (isWhiteTurn && game.whitePlayerId !== userId) {
      throw new BadRequestException('Not your turn');
    }
    if (!isWhiteTurn && game.blackPlayerId !== userId) {
      throw new BadRequestException('Not your turn');
    }

    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) throw new BadRequestException('Illegal move');
    } catch {
      throw new BadRequestException('Illegal move');
    }

    const nextFen = chess.fen();
    const isGameOver = chess.isGameOver();

    let status: GameStatus = game.status;
    let winner: GameWinner | null = null;
    if (isGameOver) {
      status = GameStatus.COMPLETED;
      if (chess.isCheckmate()) {
        winner = isWhiteTurn ? GameWinner.WHITE : GameWinner.BLACK;
      } else {
        winner = GameWinner.DRAW;
      }
    } else {
      status = GameStatus.IN_PROGRESS;
    }

    const deadline = new Date();
    if (game.daysPerMove) {
      deadline.setDate(deadline.getDate() + game.daysPerMove);
    }

    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        fen: nextFen,
        status,
        winner,
        deadline,
        pgn: chess.pgn(),
      },
    });
  }
}
