import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { GamesService } from './games.service';
import { MatchmakingService, MatchResult } from './matchmaking.service';
import { JoinRoomDto } from './dtos/join-room.dto';
import { MakeMoveDto } from './dtos/make-move.dto';
import { UndoMoveDto } from './dtos/undo-move.dto';
import { ResetGameDto } from './dtos/reset-game.dto';
import { JoinQueueDto } from './dtos/join-queue.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { Chess } from 'chess.js';
import {
  decayRD,
  calculateNewRatingAndRD,
  parseTimeControl,
  getPlayerRatingField,
} from './glicko';

async function updateRatingsOnNest(
  prisma: PrismaService,
  whiteId: string,
  blackId: string,
  gameType: string,
  outcome: number, // 1.0 for White Win, 0.0 for Black Win, 0.5 for Draw
  moveCount: number,
) {
  if (moveCount < 2) {
    return;
  }

  try {
    const playerA = await prisma.user.findUnique({ where: { id: whiteId } });
    const playerB = await prisma.user.findUnique({ where: { id: blackId } });

    if (!playerA || !playerB) {
      return;
    }

    const fields = getPlayerRatingField(gameType);

    const rA = (playerA[fields.rating] as number) ?? 1200;
    const rdA = (playerA[fields.rd] as number) ?? 350.0;
    const laA = playerA[fields.lastActive] as Date | null;

    const rB = (playerB[fields.rating] as number) ?? 1200;
    const rdB = (playerB[fields.rd] as number) ?? 350.0;
    const laB = playerB[fields.lastActive] as Date | null;

    const decayedRDA = decayRD(rdA, laA);
    const decayedRDB = decayRD(rdB, laB);

    const updateA = calculateNewRatingAndRD(rA, decayedRDA, rB, decayedRDB, outcome);
    const updateB = calculateNewRatingAndRD(rB, decayedRDB, rA, decayedRDA, 1.0 - outcome);

    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: whiteId },
        data: {
          [fields.rating]: updateA.rating,
          [fields.rd]: updateA.rd,
          [fields.lastActive]: now,
          rating: updateA.rating,
        },
      }),
      prisma.user.update({
        where: { id: blackId },
        data: {
          [fields.rating]: updateB.rating,
          [fields.rd]: updateB.rd,
          [fields.lastActive]: now,
          rating: updateB.rating,
        },
      }),
      prisma.ratingHistory.create({
        data: {
          userId: whiteId,
          rating: updateA.rating,
          gameType,
        }
      }),
      prisma.ratingHistory.create({
        data: {
          userId: blackId,
          rating: updateB.rating,
          gameType,
        }
      })
    ]);

    // Simple achievement check
    const checkAchievements = async (userId: string, isWinner: boolean, oppRating: number, newRating: number) => {
      const existing = await prisma.userAchievement.findMany({ where: { userId } });
      const unlocked = new Set(existing.map(a => a.achievement));
      
      const toUnlock: string[] = [];
      if (isWinner && !unlocked.has('FIRST_WIN')) toUnlock.push('FIRST_WIN');
      if (isWinner && oppRating > 1500 && !unlocked.has('BEAT_1500')) toUnlock.push('BEAT_1500');
      if (newRating > 1500 && !unlocked.has('REACHED_1500')) toUnlock.push('REACHED_1500');

      if (toUnlock.length > 0) {
        await prisma.userAchievement.createMany({
          data: toUnlock.map(a => ({ userId, achievement: a })),
          skipDuplicates: true,
        });
      }
    };

    if (outcome === 1.0) {
      await checkAchievements(whiteId, true, rB, updateA.rating);
      await checkAchievements(blackId, false, rA, updateB.rating);
    } else if (outcome === 0.0) {
      await checkAchievements(whiteId, false, rB, updateA.rating);
      await checkAchievements(blackId, true, rA, updateB.rating);
    }

  } catch (err) {
    console.error('Failed to update ratings in NestJS transaction:', err);
  }
}

@UsePipes(new ValidationPipe())
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gamesService: GamesService,
    private readonly matchmakingService: MatchmakingService,
    private readonly prisma: PrismaService,
    private readonly tournamentsService: TournamentsService,
  ) {
    this.matchmakingService.registerMatchCallback((match) => {
      this.handleMatchFound(match);
    });
  }

  async handleConnection(client: Socket) {
    let sessionToken = client.handshake.auth?.token;

    if (!sessionToken && client.handshake.headers.cookie) {
      const match = client.handshake.headers.cookie.match(/better-auth\.session-token=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }

    if (sessionToken) {
      try {
        const session = await this.prisma.session.findUnique({
          where: { token: sessionToken },
          include: { user: true },
        });

        if (session && session.expiresAt > new Date()) {
          client.data.user = session.user;
          return;
        }
      } catch (err) {
        // Ignored fallback
      }
    }

    client.data.user = {
      id: client.id,
      name: `Guest-${client.id.slice(0, 5)}`,
      email: 'guest@chess.local',
      rating: 1200,
      ratingBullet: 1200,
      rdBullet: 350.0,
      ratingBlitz: 1200,
      rdBlitz: 350.0,
      ratingRapid: 1200,
      rdRapid: 350.0,
      ratingDaily: 1200,
      rdDaily: 350.0,
    };
  }

  handleDisconnect(client: Socket) {
    this.matchmakingService.leaveQueue(client.id);
    const result = this.gamesService.handleDisconnect(client.id);
    if (result && result.shouldNotify) {
      this.server.to(result.roomName).emit('opponentDisconnected');
    }
  }

  private handleMatchFound(match: MatchResult) {
    this.gamesService.createRoom(
      match.roomName,
      match.white,
      match.timeControl,
      match.gameType,
      match.tournamentId,
    );
    const room = this.gamesService.joinRoom(match.roomName, match.black);

    if (room) {
      const whiteSocket = this.server.sockets.sockets.get(match.white);
      const blackSocket = this.server.sockets.sockets.get(match.black);

      if (whiteSocket) {
        whiteSocket.join(match.roomName);
        whiteSocket.emit('roomJoined', { color: 'w', room: match.roomName });
      }

      if (blackSocket) {
        blackSocket.join(match.roomName);
        blackSocket.emit('roomJoined', { color: 'b', room: match.roomName });
      }

      const getProfile = (socketId: string) => {
        const socket = this.server.sockets.sockets.get(socketId);
        const gt = room.gameType;
        const fields = getPlayerRatingField(gt);
        return {
          id: socket?.data?.user?.id ?? socketId,
          name: socket?.data?.user?.name ?? `Guest-${socketId.slice(0, 5)}`,
          rating: socket?.data?.user ? (socket.data.user[fields.rating] ?? 1200) : 1200,
        };
      };

      this.server.to(match.roomName).emit('gameStart', {
        fen: room.fen,
        timeControl: room.timeControl,
        gameType: room.gameType,
        white: getProfile(room.whitePlayerId),
        black: getProfile(room.blackPlayerId),
      });
    }
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinQueueDto,
  ) {
    const tc = data.timeControl ?? '10|0';
    const parsed = parseTimeControl(tc);
    const fields = getPlayerRatingField(parsed.gameType);

    const userRating = client.data.user ? (client.data.user[fields.rating] ?? 1200) : 1200;

    this.matchmakingService.joinQueue(
      client.id,
      userRating,
      parsed.timeControl,
      parsed.gameType,
    );
    client.emit('queueJoined');
  }

  @SubscribeMessage('joinTournamentQueue')
  handleJoinTournamentQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string; timeControl: string },
  ) {
    const tc = data.timeControl ?? '10|0';
    const parsed = parseTimeControl(tc);
    const fields = getPlayerRatingField(parsed.gameType);

    const userRating = client.data.user ? (client.data.user[fields.rating] ?? 1200) : 1200;

    this.matchmakingService.joinQueue(
      client.id,
      userRating,
      parsed.timeControl,
      parsed.gameType,
      data.tournamentId,
    );
    client.emit('queueJoined');
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.matchmakingService.leaveQueue(client.id);
    client.emit('queueLeft');
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const roomName = data.room;
    const existing = this.gamesService.getRoom(roomName);

    if (!existing) {
      const room = this.gamesService.createRoom(roomName, client.id);
      client.join(roomName);
      client.emit('roomJoined', { color: 'w', room: roomName });
    } else if (existing.players.length === 1) {
      const room = this.gamesService.joinRoom(roomName, client.id);
      if (room) {
        client.join(roomName);
        client.emit('roomJoined', { color: 'b', room: roomName });

        const getProfile = (socketId: string) => {
          const socket = this.server.sockets.sockets.get(socketId);
          const fields = getPlayerRatingField(room.gameType);
          return {
            id: socket?.data?.user?.id ?? socketId,
            name: socket?.data?.user?.name ?? `Guest-${socketId.slice(0, 5)}`,
            rating: socket?.data?.user ? (socket.data.user[fields.rating] ?? 1200) : 1200,
          };
        };

        this.server.to(roomName).emit('gameStart', {
          fen: room.fen,
          timeControl: room.timeControl,
          gameType: room.gameType,
          white: getProfile(room.whitePlayerId),
          black: getProfile(room.blackPlayerId),
        });
      }
    } else {
      client.emit('roomFull');
    }
  }

  @SubscribeMessage('makeMove')
  async handleMakeMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MakeMoveDto,
  ) {
    const room = this.gamesService.getRoom(data.room);
    if (!room) return;

    const updated = this.gamesService.updateFen(data.room, data.fen);
    if (updated) {
      client.to(data.room).emit('opponentMove', {
        from: data.from,
        to: data.to,
        fen: data.fen,
      });

      try {
        const chess = new Chess(data.fen);
        if (chess.isGameOver()) {
          let outcome = 0.5;
          if (chess.isCheckmate()) {
            const turn = chess.turn();
            outcome = turn === 'b' ? 1.0 : 0.0;
          }

          const movesCount = chess.history().length;
          const whiteSocket = this.server.sockets.sockets.get(room.whitePlayerId);
          const blackSocket = this.server.sockets.sockets.get(room.blackPlayerId);

          const whiteUserId = whiteSocket?.data?.user?.id;
          const blackUserId = blackSocket?.data?.user?.id;

          if (whiteUserId && blackUserId && whiteUserId !== room.whitePlayerId && blackUserId !== room.blackPlayerId) {
            await updateRatingsOnNest(
              this.prisma,
              whiteUserId,
              blackUserId,
              room.gameType,
              outcome,
              movesCount,
            );

            if (room.tournamentId) {
              const gameWinner = outcome === 1.0 ? 'WHITE' : outcome === 0.0 ? 'BLACK' : 'DRAW';
              await this.tournamentsService.recordGameResult(
                room.tournamentId,
                whiteUserId,
                blackUserId,
                gameWinner as any
              );
            }
          }
        }
      } catch (err) {
        // Ignored
      }
    }
  }

  @SubscribeMessage('undoMove')
  handleUndoMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UndoMoveDto,
  ) {
    const updated = this.gamesService.updateFen(data.room, data.fen);
    if (updated) {
      client.to(data.room).emit('opponentUndo', {
        fen: data.fen,
        from: data.from,
        to: data.to,
      });
    }
  }

  @SubscribeMessage('resetGame')
  handleResetGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ResetGameDto,
  ) {
    const nextFen = this.gamesService.resetRoom(data.room);
    if (nextFen) {
      this.server.to(data.room).emit('gameReset', { fen: nextFen });
    }
  }

  @SubscribeMessage('resign')
  async handleResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ResetGameDto,
  ) {
    const room = this.gamesService.getRoom(data.room);
    if (!room) return;

    client.to(data.room).emit('opponentResigned');

    try {
      const outcome = client.id === room.whitePlayerId ? 0.0 : 1.0;
      const chess = new Chess(room.fen);
      const movesCount = chess.history().length;

      const whiteSocket = this.server.sockets.sockets.get(room.whitePlayerId);
      const blackSocket = this.server.sockets.sockets.get(room.blackPlayerId);

      const whiteUserId = whiteSocket?.data?.user?.id;
      const blackUserId = blackSocket?.data?.user?.id;

      if (whiteUserId && blackUserId && whiteUserId !== room.whitePlayerId && blackUserId !== room.blackPlayerId) {
        await updateRatingsOnNest(
          this.prisma,
          whiteUserId,
          blackUserId,
          room.gameType,
          outcome,
          movesCount,
        );

        if (room.tournamentId) {
          const gameWinner = outcome === 1.0 ? 'WHITE' : outcome === 0.0 ? 'BLACK' : 'DRAW';
          await this.tournamentsService.recordGameResult(
            room.tournamentId,
            whiteUserId,
            blackUserId,
            gameWinner as any
          );
        }
      }
    } catch (err) {
      // Ignored
    }
  }

  @SubscribeMessage('spectateGame')
  handleSpectateGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    const roomName = data.room;
    client.join(roomName);
    
    const room = this.gamesService.getRoom(roomName);
    if (room) {
      client.emit('spectateStart', { fen: room.fen, timeControl: room.timeControl, gameType: room.gameType });
    }
  }

  @SubscribeMessage('sendGameMessage')
  handleSendGameMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string, message: string },
  ) {
    const username = client.data?.user?.name || 'Guest';
    this.server.to(data.room).emit('gameMessage', {
      sender: username,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  }
}
