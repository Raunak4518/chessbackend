import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { StudiesService } from './studies.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { AuthenticatedRequest } from '../types';

@Controller('api/studies')
export class StudiesController {
  constructor(private readonly studiesService: StudiesService) {}

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id || (req.query?.userId as string);
    if (!userId) throw new UnauthorizedException('Not logged in');
    return userId;
  }

  @AllowAnonymous()
  @Get()
  async getStudies() {
    return this.studiesService.getStudies();
  }

  @Get('my')
  async getMyStudies(@Req() req: AuthenticatedRequest) {
    return this.studiesService.getMyStudies(this.getUserId(req));
  }

  @AllowAnonymous()
  @Get(':id')
  async getStudy(@Param('id') id: string) {
    return this.studiesService.getStudy(id);
  }

  @Post()
  async createStudy(
    @Req() req: AuthenticatedRequest,
    @Body() body: { title: string; description?: string; isPublic?: boolean },
  ) {
    return this.studiesService.createStudy(
      this.getUserId(req),
      body.title,
      body.description,
      body.isPublic,
    );
  }

  @Post(':id/chapters')
  async addChapter(
    @Req() req: AuthenticatedRequest,
    @Param('id') studyId: string,
    @Body() body: { title: string },
  ) {
    return this.studiesService.addChapter(
      this.getUserId(req),
      studyId,
      body.title,
    );
  }

  @Put('chapters/:id')
  async updateChapter(
    @Req() req: AuthenticatedRequest,
    @Param('id') chapterId: string,
    @Body()
    body: { fen?: string; pgn?: string; annotations?: unknown; title?: string },
  ) {
    return this.studiesService.updateChapter(
      this.getUserId(req),
      chapterId,
      body,
    );
  }
}

