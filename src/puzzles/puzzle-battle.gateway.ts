import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { QuestsService } from '../quests/quests.service';
import { FactionsService } from '../factions/factions.service';
import type { AuthenticatedSocket } from '../types';

interface BattlePlayer {
  id: string;
  socketId: string;
  score: number;
  rating: number;
  name: string;
}

interface BattleRoom {
  id: string;
  players: Record<string, BattlePlayer>;
  puzzles: any[];
  status: 'IN_PROGRESS' | 'FINISHED';
  roundIndex: number;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/puzzle-battle',
})
export class PuzzleBattleGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private queue: BattlePlayer[] = [];
  private rooms: Record<string, BattleRoom> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly questsService: QuestsService,
    private readonly factionsService: FactionsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    let sessionToken = (client.handshake.auth as Record<string, unknown>)
      ?.token as string | undefined;

    if (!sessionToken && client.handshake.headers.cookie) {
      const match = client.handshake.headers.cookie.match(
        /better-auth\.session-token=([^;]+)/,
      );
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
      } catch {
        // Ignored fallback
      }
    }

    client.data.user = {
      id: client.id,
      name: `Guest-${client.id.slice(0, 5)}`,
      email: 'guest@chess.local',
      ratingPuzzle: 1200,
    };
  }

  handleDisconnect(client: Socket) {
    this.queue = this.queue.filter((p) => p.socketId !== client.id);

    for (const [roomId, room] of Object.entries(this.rooms)) {
      if (room.players[client.id]) {
        if (room.status === 'IN_PROGRESS') {
          room.status = 'FINISHED';
          this.server.to(roomId).emit('opponentDisconnected');
        }
      }
    }
  }

  @SubscribeMessage('joinQueue')
  async handleJoinQueue(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.data.user?.id || client.id;
    const name = client.data.user?.name || `Guest-${client.id.slice(0, 5)}`;
    const rating = (client.data.user as any)?.ratingPuzzle || 1200;

    // Prevent double joining
    this.queue = this.queue.filter((p) => p.id !== userId);

    this.queue.push({
      id: userId,
      socketId: client.id,
      score: 0,
      rating,
      name,
    });

    if (this.queue.length >= 2) {
      const p1 = this.queue.shift();
      const p2 = this.queue.shift();

      if (p1 && p2) {
        const roomId = `battle_${p1.id}_${p2.id}`;

        // Fetch 7 random puzzles
        const totalPuzzles = await this.prisma.puzzle.count();
        const skip = Math.max(0, Math.floor(Math.random() * (totalPuzzles - 7)));
        const puzzles = await this.prisma.puzzle.findMany({
          take: 7,
          skip: skip,
        });

        this.rooms[roomId] = {
          id: roomId,
          players: {
            [p1.socketId]: p1,
            [p2.socketId]: p2,
          },
          puzzles,
          status: 'IN_PROGRESS',
          roundIndex: 0,
        };

        const sockets = await this.server.fetchSockets();
        const s1 = sockets.find((s) => s.id === p1.socketId);
        const s2 = sockets.find((s) => s.id === p2.socketId);

        if (s1 && s2) {
          s1.join(roomId);
          s2.join(roomId);

          this.server.to(roomId).emit('matchFound', {
            roomId,
            puzzles,
            players: {
              [p1.socketId]: {
                id: p1.id,
                name: p1.name,
                rating: p1.rating,
                socketId: p1.socketId,
              },
              [p2.socketId]: {
                id: p2.id,
                name: p2.name,
                rating: p2.rating,
                socketId: p2.socketId,
              },
            },
          });
        }
      }
    }
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.queue = this.queue.filter((p) => p.socketId !== client.id);
  }

  @SubscribeMessage('makeMove')
  handleMakeMove(
    @MessageBody()
    data: { roomId: string; source: string; target: string; fen: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.rooms[data.roomId];
    if (room && room.status === 'IN_PROGRESS') {
      client.to(data.roomId).emit('opponentMove', {
        source: data.source,
        target: data.target,
        fen: data.fen,
      });
    }
  }

  @SubscribeMessage('puzzleSolved')
  handlePuzzleSolved(
    @MessageBody() data: { roomId: string; timeMs: number; roundIndex?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.rooms[data.roomId];
    if (room && room.status === 'IN_PROGRESS') {
      if (data.roundIndex !== undefined && data.roundIndex !== room.roundIndex) {
        return; // Stale solve due to race condition
      }
      
      const player = room.players[client.id];
      if (player) {
        player.score += 1;

        // Notify both players who won the round
        this.server.to(data.roomId).emit('roundWon', {
          winnerSocketId: client.id,
          timeMs: data.timeMs,
          playerScore: player.score,
        });

        room.roundIndex += 1;

        if (player.score === 3) {
          room.status = 'FINISHED';
          const winnerId = player.id;
          const loserId = Object.values(room.players).find(
            (p) => p.id !== winnerId,
          )?.id;

          this.server.to(data.roomId).emit('battleEnded', {
            winnerId,
            reason: 'score_reached'
          });

          if (winnerId) {
            this.questsService.incrementQuestProgress(winnerId, 'WIN_PUZZLE_BATTLE').catch(() => {});
            this.questsService.incrementQuestProgress(winnerId, 'PLAY_BATTLES').catch(() => {});
            this.factionsService.incrementFactionScoreForUser(winnerId, 25).catch(() => {});
          }
          if (loserId) {
            this.questsService
              .incrementQuestProgress(loserId, 'PLAY_BATTLES')
              .catch(() => {});
          }

          setTimeout(() => {
            delete this.rooms[data.roomId];
          }, 10000);
        }
      }
    }
  }

  @SubscribeMessage('sendEmote')
  handleSendEmote(
    @MessageBody() data: { roomId: string; emoji: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.rooms[data.roomId];
    if (room && room.status === 'IN_PROGRESS') {
      client.to(data.roomId).emit('opponentEmote', {
        emoji: data.emoji,
      });
    }
  }

  @SubscribeMessage('rematch')
  handleRematch(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Basic rematch support: if one wants a rematch, they leave and re-join queue for now.
    // Full rematch logic requires tracking both acceptances.
  }
}
