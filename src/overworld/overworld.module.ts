import { Module } from '@nestjs/common';
import { OverworldService } from './overworld.service';
import { OverworldController } from './overworld.controller';
import { OverworldGateway } from './overworld.gateway';

@Module({
  controllers: [OverworldController],
  providers: [OverworldService, OverworldGateway],
  exports: [OverworldService, OverworldGateway],
})
export class OverworldModule {}
