import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudies() {
    return this.prisma.study.findMany({
      where: { isPublic: true },
      include: { owner: { select: { id: true, name: true, rating: true } }, _count: { select: { chapters: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getMyStudies(userId: string) {
    return this.prisma.study.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { chapters: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getStudy(id: string) {
    const study = await this.prisma.study.findUnique({
      where: { id },
      include: { 
        owner: { select: { id: true, name: true, rating: true } },
        chapters: { orderBy: { sortOrder: 'asc' } }
      }
    });
    if (!study) throw new NotFoundException('Study not found');
    return study;
  }

  async createStudy(userId: string, title: string, description?: string, isPublic = true) {
    return this.prisma.study.create({
      data: {
        title,
        description,
        isPublic,
        ownerId: userId,
        chapters: {
          create: [{ title: 'Chapter 1' }]
        }
      }
    });
  }

  async addChapter(userId: string, studyId: string, title: string) {
    const study = await this.prisma.study.findUnique({ where: { id: studyId }, include: { chapters: true } });
    if (!study) throw new NotFoundException('Study not found');
    if (study.ownerId !== userId) throw new UnauthorizedException('Not authorized');

    return this.prisma.studyChapter.create({
      data: {
        studyId,
        title,
        sortOrder: study.chapters.length
      }
    });
  }

  async updateChapter(userId: string, chapterId: string, data: { fen?: string, pgn?: string, annotations?: any, title?: string }) {
    const chapter = await this.prisma.studyChapter.findUnique({ where: { id: chapterId }, include: { study: true } });
    if (!chapter) throw new NotFoundException('Chapter not found');
    if (chapter.study.ownerId !== userId) throw new UnauthorizedException('Not authorized');

    return this.prisma.studyChapter.update({
      where: { id: chapterId },
      data
    });
  }
}
