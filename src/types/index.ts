import { Request } from 'express';
import { Socket } from 'socket.io';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    [key: string]: unknown;
  };
  session?: {
    id: string;
    expiresAt: Date;
    [key: string]: unknown;
  };
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      id: string;
      name: string;
      email: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

// Global Interfaces for Analysis Service
export interface AnalysisMove {
  move: string | null;
  fen: string;
  color?: string;
  eval?: number;
  mate?: number | null;
  centipawns?: number;
  bestMove?: string | null;
  classification?: string;
  explanation?: string;
  moveAccuracy?: number;
  depth?: number;
}

export interface AnalysisResult {
  whiteAccuracy: number;
  blackAccuracy: number;
  moves: AnalysisMove[];
}
