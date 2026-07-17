import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface QuestDefinition {
  id: string;
  target: number;
}

const QUEST_TYPES: QuestDefinition[] = [
  { id: 'WIN_GAMES', target: 3 },
  { id: 'SOLVE_PUZZLES', target: 5 },
  { id: 'PLAY_BATTLES', target: 2 },
  { id: 'WIN_PUZZLE_BATTLE', target: 1 },
];

@Injectable()
export class QuestsService {
  constructor(private prisma: PrismaService) {}

  private getEndOfDay(): Date {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  }

  async getActiveQuests(userId: string) {
    const now = new Date();

    // Find unexpired quests
    let quests = await this.prisma.userQuest.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
      },
    });

    // If user has no active quests today, generate 3 random ones
    if (quests.length === 0) {
      const endOfDay = this.getEndOfDay();

      // Select 3 unique random quests
      const shuffled = [...QUEST_TYPES].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);

      const newQuests = await Promise.all(
        selected.map((q) =>
          this.prisma.userQuest.create({
            data: {
              userId,
              questId: q.id,
              target: q.target,
              progress: 0,
              completed: false,
              expiresAt: endOfDay,
            },
          }),
        ),
      );

      quests = newQuests;
    }

    return quests;
  }

  async incrementQuestProgress(
    userId: string,
    questId: string,
    amount: number = 1,
  ) {
    const now = new Date();

    const activeQuest = await this.prisma.userQuest.findFirst({
      where: {
        userId,
        questId,
        completed: false,
        expiresAt: { gt: now },
      },
    });

    if (!activeQuest) return null;

    const newProgress = Math.min(
      activeQuest.progress + amount,
      activeQuest.target,
    );
    const completed = newProgress >= activeQuest.target;

    const updated = await this.prisma.userQuest.update({
      where: { id: activeQuest.id },
      data: {
        progress: newProgress,
        completed,
      },
    });

    return updated;
  }
}
