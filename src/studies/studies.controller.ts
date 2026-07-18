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
import { CreateStudyDto, AddChapterDto, UpdateChapterDto } from './dto/studies.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/studies')
export class StudiesController {
  constructor(private readonly studiesService: StudiesService) {}


  @AllowAnonymous()
  @Get()
  async getStudies() {
    return this.studiesService.getStudies();
  }

  @Get('my')
  async getMyStudies(@CurrentUser() userId: string) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.studiesService.getMyStudies(userId);
  }

  @AllowAnonymous()
  @Get(':id')
  async getStudy(@Param('id') id: string) {
    return this.studiesService.getStudy(id);
  }

  @Post()
  async createStudy(
    @CurrentUser() userId: string,
    @Body() body: CreateStudyDto,
  ) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.studiesService.createStudy(
      userId,
      body.title,
      body.description,
      body.isPublic,
    );
  }

  @Post(':id/chapters')
  async addChapter(
    @CurrentUser() userId: string,
    @Param('id') studyId: string,
    @Body() body: AddChapterDto,
  ) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.studiesService.addChapter(
      userId,
      studyId,
      body.title,
    );
  }

  @Put('chapters/:id')
  async updateChapter(
    @CurrentUser() userId: string,
    @Param('id') chapterId: string,
    @Body() body: UpdateChapterDto,
  ) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.studiesService.updateChapter(
      userId,
      chapterId,
      body,
    );
  }
}
