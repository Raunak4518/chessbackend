import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FactionsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedFactions();
  }

  private async seedFactions() {
    const factions = [
      {
        name: "The Queen's Vanguard",
        description: 'Upholders of strategy, patience, and absolute control.',
        colorTheme: 'amber',
      },
      {
        name: 'The Sicilian Syndicate',
        description: 'Aggressive, tactical, and ruthlessly efficient.',
        colorTheme: 'red',
      },
      {
        name: 'The Iron Knights',
        description: 'Stalwart defenders relying on unbreakable defense.',
        colorTheme: 'blue',
      },
    ];

    for (const f of factions) {
      await this.prisma.faction.upsert({
        where: { name: f.name },
        update: {},
        create: {
          name: f.name,
          description: f.description,
          colorTheme: f.colorTheme,
          totalScore: 0,
        },
      });
    }
  }

  async getAllFactions() {
    return this.prisma.faction.findMany({
      orderBy: { totalScore: 'desc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async joinFaction(userId: string, factionId: string) {
    const faction = await this.prisma.faction.findUnique({ where: { id: factionId } });
    if (!faction) throw new NotFoundException('Faction not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.factionId) throw new BadRequestException('User already belongs to a faction');

    return this.prisma.user.update({
      where: { id: userId },
      data: { factionId },
    });
  }

  async incrementFactionScoreForUser(userId: string, points: number = 10) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.factionId) return null;

    return this.prisma.faction.update({
      where: { id: user.factionId },
      data: { totalScore: { increment: points } },
    });
  }
}
