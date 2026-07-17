import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UnauthorizedException,
  Delete,
} from '@nestjs/common';
import { SocialService } from './social.service';
import type { AuthenticatedRequest } from '../types';
import { SendChallengeDto } from './dto/social.dto';

@Controller('api/social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id || (req.query?.userId as string);
    if (!userId) throw new UnauthorizedException('Not logged in');
    return userId;
  }

  @Get('friends')
  async getFriends(@Req() req: AuthenticatedRequest) {
    return this.socialService.getFriends(this.getUserId(req));
  }

  @Get('requests')
  async getPendingRequests(@Req() req: AuthenticatedRequest) {
    return this.socialService.getPendingRequests(this.getUserId(req));
  }

  @Post('friends/request/:id')
  async sendFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.socialService.sendFriendRequest(this.getUserId(req), id);
  }

  @Post('friends/accept/:id')
  async acceptFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.socialService.acceptFriendRequest(this.getUserId(req), id);
  }

  @Delete('friends/request/:id')
  async declineFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.socialService.declineFriendRequest(this.getUserId(req), id);
  }

  @Get('challenges')
  async getIncomingChallenges(@Req() req: AuthenticatedRequest) {
    return this.socialService.getIncomingChallenges(this.getUserId(req));
  }

  @Post('challenge/:id')
  async sendChallenge(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: SendChallengeDto,
  ) {
    return this.socialService.sendChallenge(
      this.getUserId(req),
      id,
      body.timeControl || '10|0',
      body.colorPref || 'random',
    );
  }

  @Post('challenge/:id/accept')
  async acceptChallenge(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.socialService.acceptChallenge(this.getUserId(req), id);
  }

  @Delete('challenge/:id')
  async declineChallenge(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.socialService.declineChallenge(this.getUserId(req), id);
  }
}

