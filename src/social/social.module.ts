import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { SocialGateway } from './social.gateway';

@Module({
  providers: [SocialService, SocialGateway],
  controllers: [SocialController],
})
export class SocialModule {}
