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

interface BattlePlayer {
  id: string;
  socketId: string;
  score: number;
  strikes: number;
  rating: number;
  name: string;
}

interface BattleRoom {
  id: string;
  players: Record<string, BattlePlayer>;
  puzzles: any[];
  startTime: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/puzzle-battle'
})
export class PuzzleBattleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private queue: BattlePlayer[] = [];
  private rooms: Record<string, BattleRoom> = {};

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    this.queue = this.queue.filter(p => p.socketId !== client.id);
    
    // Check if they were in a room
    for (const [roomId, room] of Object.entries(this.rooms)) {
      const isPlayer = Object.values(room.players).some(p => p.socketId === client.id);
      if (isPlayer && room.status === 'IN_PROGRESS') {
        room.status = 'FINISHED';
        this.server.to(roomId).emit('battleEnded', { reason: 'opponent_disconnected', players: room.players });
      }
    }
  }

  @SubscribeMessage('joinQueue')
  async handleJoinQueue(@MessageBody() data: { userId: string, rating: number, name: string }, @ConnectedSocket() client: Socket) {
    this.queue.push({
      id: data.userId,
      socketId: client.id,
      score: 0,
      strikes: 0,
      rating: data.rating,
      name: data.name
    });

    if (this.queue.length >= 2) {
      const p1 = this.queue.shift();
      const p2 = this.queue.shift();

      if (p1 && p2) {
        const roomId = `battle_${p1.id}_${p2.id}`;
        
        // Fetch 40 random puzzles sorted by rating
        const puzzles = await this.prisma.puzzle.findMany({
          take: 40,
          orderBy: { rating: 'asc' }
        });

        this.rooms[roomId] = {
          id: roomId,
          players: {
            [p1.socketId]: p1,
            [p2.socketId]: p2
          },
          puzzles,
          startTime: Date.now() + 3000, // starts in 3 seconds
          status: 'IN_PROGRESS'
        };

        const sockets = await this.server.fetchSockets();
        const s1 = sockets.find(s => s.id === p1.socketId);
        const s2 = sockets.find(s => s.id === p2.socketId);

        if (s1 && s2) {
          s1.join(roomId);
          s2.join(roomId);
          this.server.to(roomId).emit('matchFound', {
            roomId,
            puzzles,
            players: { [p1.id]: p1, [p2.id]: p2 },
            startTime: this.rooms[roomId].startTime
          });
        }
      }
    }
  }

  @SubscribeMessage('puzzleSolved')
  handlePuzzleSolved(@MessageBody() data: { roomId: string, puzzleId: string }, @ConnectedSocket() client: Socket) {
    const room = this.rooms[data.roomId];
    if (room && room.status === 'IN_PROGRESS') {
      const player = room.players[client.id];
      if (player) {
        player.score += 1;
        this.server.to(data.roomId).emit('opponentScoreUpdate', { 
          userId: player.id, 
          score: player.score, 
          strikes: player.strikes 
        });
      }
    }
  }

  @SubscribeMessage('puzzleFailed')
  handlePuzzleFailed(@MessageBody() data: { roomId: string, puzzleId: string }, @ConnectedSocket() client: Socket) {
    const room = this.rooms[data.roomId];
    if (room && room.status === 'IN_PROGRESS') {
      const player = room.players[client.id];
      if (player) {
        player.strikes += 1;
        this.server.to(data.roomId).emit('opponentScoreUpdate', { 
          userId: player.id, 
          score: player.score, 
          strikes: player.strikes 
        });

        if (player.strikes >= 3) {
          // Player is out, check if other player is also out
          const otherPlayer = Object.values(room.players).find(p => p.socketId !== client.id);
          if (otherPlayer && otherPlayer.strikes >= 3) {
            room.status = 'FINISHED';
            this.server.to(data.roomId).emit('battleEnded', { reason: 'both_strike_out', players: room.players });
          }
        }
      }
    }
  }
}
