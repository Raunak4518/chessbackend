import { Controller, Get, Post, Param, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('academy')
export class AcademyController {
  constructor(private prisma: PrismaService) {}

  @Get('progress')
  async getProgress(@Req() req: any) {
    const userId = req.user?.id || req.session?.user?.id || req.session?.userId;
    if (!userId) {
      return [];
    }

    const progress = await this.prisma.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true },
    });

    return progress.map((p) => p.lessonId);
  }

  @Post('complete/:lessonId')
  async completeLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
    const userId = req.user?.id || req.session?.user?.id || req.session?.userId;
    if (!userId) {
      throw new UnauthorizedException('You must be logged in to track progress.');
    }

    const record = await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {},
      create: { userId, lessonId },
    });

    return { success: true, record };
  }
}
