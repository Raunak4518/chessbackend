import { Injectable, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OverworldService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      db: 3, // separate db for overworld cache
    });
  }

  async onModuleInit() {
    // Cache the world map in Redis on startup for instant access
    await this.cacheWorldMap();
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  async cacheWorldMap() {
    const hexes = await this.prisma.worldHex.findMany({
      include: {
        controllingFaction: true,
        structures: true,
      }
    });

    // Store entire map as JSON in Redis for O(1) fetching by clients
    await this.redisClient.set('aethelgard_map', JSON.stringify(hexes));
    console.log(`Cached ${hexes.length} hexes in Redis for Aethelgard Overworld.`);
  }

  async getMapState(userId?: string) {
    let hexes: any[] = [];
    const cachedMap = await this.redisClient.get('aethelgard_map');
    if (cachedMap) {
      hexes = JSON.parse(cachedMap);
    } else {
      hexes = await this.prisma.worldHex.findMany({
        include: {
          controllingFaction: true,
          structures: true,
        }
      });
      await this.redisClient.set('aethelgard_map', JSON.stringify(hexes));
    }

    if (!userId) return hexes;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { factionId: true }
    });

    if (!user || !user.factionId) return hexes;

    const friendlyHexes = hexes.filter(h => h.controllingFactionId === user.factionId);
    if (friendlyHexes.length === 0) return hexes;

    // Apply Fog of War (Radius 2 from any friendly hex)
    return hexes.map(hex => {
      let minDistance = Infinity;
      for (const fHex of friendlyHexes) {
        const dist = (Math.abs(hex.q - fHex.q) + Math.abs(hex.r - fHex.r) + Math.abs(hex.s - fHex.s)) / 2;
        if (dist < minDistance) minDistance = dist;
      }

      if (minDistance > 2) {
        // Obscured by Fog of War
        return {
          ...hex,
          terrain: 'UNKNOWN',
          controllingFactionId: null,
          controllingFaction: null,
          structures: []
        };
      }
      return hex;
    });
  }

  async setPlayerPosition(userId: string, q: number, r: number) {
    // Store player position in Redis with a 5 minute expiration (TTL)
    // to keep track of active map players
    await this.redisClient.setex(`overworld:player_pos:${userId}`, 300, JSON.stringify({ q, r }));
  }

  async getPlayerPosition(userId: string) {
    const pos = await this.redisClient.get(`overworld:player_pos:${userId}`);
    if (pos) return JSON.parse(pos);
    return null;
  }
}
