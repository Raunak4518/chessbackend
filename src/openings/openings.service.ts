import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OpeningsService {
  private readonly logger = new Logger(OpeningsService.name);

  // In a real app with Redis, we'd inject CACHE_MANAGER and use it here.
  // We're keeping it simple and just acting as a proxy for now to avoid CORS/client-side rate-limits.

  async getOpeningName(fen: string): Promise<any> {
    try {
      const res = await fetch(`https://explorer.lichess.ovh/master?fen=${encodeURIComponent(fen)}&topGames=0`);
      if (!res.ok) return { opening: null };
      const json = await res.json();
      return { opening: { name: json?.opening?.name || null, eco: json?.opening?.eco || null } };
    } catch (err) {
      this.logger.error(`Error fetching opening name for FEN ${fen}:`, err);
      return { opening: null };
    }
  }

  async getTopGames(fen: string, limit: number): Promise<any> {
    try {
      const res = await fetch(`https://explorer.lichess.ovh/master?fen=${encodeURIComponent(fen)}&topGames=${limit}`);
      if (!res.ok) return { topGames: [] };
      const json = await res.json();
      return { topGames: json?.topGames || [] };
    } catch (err) {
      this.logger.error(`Error fetching top games for FEN ${fen}:`, err);
      return { topGames: [] };
    }
  }
}
