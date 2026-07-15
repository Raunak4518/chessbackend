import { Injectable } from '@nestjs/common';

export interface RoomState {
  players: string[];
  fen: string;
  whitePlayerId: string;
  blackPlayerId: string;
  timeControl: string;
  gameType: string;
}

@Injectable()
export class GamesService {
  private rooms = new Map<string, RoomState>();
  private socketToRoom = new Map<string, string>();

  getRoom(roomName: string): RoomState | undefined {
    return this.rooms.get(roomName);
  }

  createRoom(roomName: string, socketId: string, timeControl: string = '10|0', gameType: string = 'RAPID'): RoomState {
    const room: RoomState = {
      players: [socketId],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      whitePlayerId: socketId,
      blackPlayerId: '',
      timeControl,
      gameType,
    };
    this.rooms.set(roomName, room);
    this.socketToRoom.set(socketId, roomName);
    return room;
  }

  joinRoom(roomName: string, socketId: string): RoomState | null {
    const room = this.rooms.get(roomName);
    if (!room || room.players.length >= 2) {
      return null;
    }
    room.players.push(socketId);
    room.blackPlayerId = socketId;
    this.socketToRoom.set(socketId, roomName);
    return room;
  }

  updateFen(roomName: string, fen: string): boolean {
    const room = this.rooms.get(roomName);
    if (!room) {
      return false;
    }
    room.fen = fen;
    return true;
  }

  resetRoom(roomName: string): string | null {
    const room = this.rooms.get(roomName);
    if (!room) {
      return null;
    }
    room.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    return room.fen;
  }

  handleDisconnect(
    socketId: string,
  ): { roomName: string; shouldNotify: boolean } | null {
    const roomName = this.socketToRoom.get(socketId);
    if (!roomName) {
      return null;
    }
    const room = this.rooms.get(roomName);
    if (room) {
      room.players = room.players.filter((id) => id !== socketId);
      const shouldNotify = room.players.length > 0;
      if (room.players.length === 0) {
        this.rooms.delete(roomName);
      }
      this.socketToRoom.delete(socketId);
      return { roomName, shouldNotify };
    }
    this.socketToRoom.delete(socketId);
    return null;
  }
}
