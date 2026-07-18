import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HexTerrain } from '@prisma/client';

export interface RoomState {
  players: string[];
  fen: string;
  whitePlayerId: string; // Socket ID
  blackPlayerId: string; // Socket ID
  whiteUserId?: string;
  blackUserId?: string;
  whitePlayerName?: string;
  blackPlayerName?: string;
  whiteRating?: number;
  blackRating?: number;
  timeControl: string;
  gameType: string;
  tournamentId?: string;
  whiteTimeLeftMs: number;
  blackTimeLeftMs: number;
  lastMoveTimestamp: number;
  incrementMs: number;
  terrain?: HexTerrain;
  obstacles?: string[]; // e.g. ['d4', 'e5']
  targetHexId?: string;
}

@Injectable()
export class GamesService {
  private rooms = new Map<string, RoomState>();
  private socketToRoom = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  getRoom(roomName: string): RoomState | undefined {
    return this.rooms.get(roomName);
  }

  async createRoom(
    roomName: string,
    socketId: string,
    timeControl: string = '10|0',
    gameType: string = 'RAPID',
    tournamentId?: string,
    targetHexId?: string,
    userId?: string,
    playerName?: string,
    playerRating?: number,
  ): Promise<RoomState> {
    let baseMs = 10 * 60 * 1000;
    let incrementMs = 0;
    
    if (timeControl) {
      const parts = timeControl.split(/[|+]/);
      if (parts.length > 0) {
        const mins = parseFloat(parts[0]);
        if (!isNaN(mins)) baseMs = mins * 60 * 1000;
      }
      if (parts.length > 1) {
        const inc = parseFloat(parts[1]);
        if (!isNaN(inc)) incrementMs = inc * 1000;
      }
    }

    let terrain: HexTerrain = HexTerrain.PLAINS;
    let obstacles: string[] = [];

    if (targetHexId) {
      const hex = await this.prisma.worldHex.findUnique({ where: { id: targetHexId } });
      if (hex) {
        terrain = hex.terrain;
        if (terrain === HexTerrain.VOLCANO) obstacles = ['d4', 'd5', 'e4', 'e5'];
        else if (terrain === HexTerrain.MOUNTAIN) obstacles = ['b3', 'g6', 'f3'];
        else if (terrain === HexTerrain.SWAMP) obstacles = ['a4', 'h4', 'a5', 'h5'];
        else if (terrain === HexTerrain.CITADEL) obstacles = ['c4', 'f4', 'c5', 'f5'];
      }
    }

    const room: RoomState = {
      players: [socketId],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      whitePlayerId: socketId,
      blackPlayerId: '',
      whiteUserId: userId,
      whitePlayerName: playerName,
      whiteRating: playerRating,
      timeControl,
      gameType,
      tournamentId,
      targetHexId,
      whiteTimeLeftMs: baseMs,
      blackTimeLeftMs: baseMs,
      lastMoveTimestamp: Date.now(), // Will be reset on joinRoom
      incrementMs,
      terrain,
      obstacles,
    };
    this.rooms.set(roomName, room);
    this.socketToRoom.set(socketId, roomName);
    return room;
  }

  joinRoom(
    roomName: string,
    socketId: string,
    userId?: string,
    playerName?: string,
    playerRating?: number,
  ): RoomState | null {
    const room = this.rooms.get(roomName);
    if (!room || room.players.length >= 2) {
      return null;
    }
    room.players.push(socketId);
    room.blackPlayerId = socketId;
    room.blackUserId = userId;
    room.blackPlayerName = playerName;
    room.blackRating = playerRating;
    room.lastMoveTimestamp = Date.now(); // Start clock when game officially begins
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
    
    // Reset clock as well if baseMs is derivable
    let baseMs = 10 * 60 * 1000;
    if (room.timeControl) {
      const parts = room.timeControl.split(/[|+]/);
      if (parts.length > 0) {
        const mins = parseFloat(parts[0]);
        if (!isNaN(mins)) baseMs = mins * 60 * 1000;
      }
    }
    room.whiteTimeLeftMs = baseMs;
    room.blackTimeLeftMs = baseMs;
    room.lastMoveTimestamp = Date.now();

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
