import { Module } from '@nestjs/common';
import { OpeningsController } from './openings.controller';
import { OpeningsService } from './openings.service';

@Module({
  controllers: [OpeningsController],
  providers: [OpeningsService],
  exports: [OpeningsService],
})
export class OpeningsModule {}
