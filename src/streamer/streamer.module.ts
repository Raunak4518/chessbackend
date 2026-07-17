import { Module } from '@nestjs/common';
import { StreamerGateway } from './streamer.gateway';

@Module({
  providers: [StreamerGateway]
})
export class StreamerModule {}
