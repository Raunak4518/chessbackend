import { Global, Module } from '@nestjs/common';
import { FactionsService } from './factions.service';
import { FactionsController } from './factions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [FactionsController],
  providers: [FactionsService],
  exports: [FactionsService],
})
export class FactionsModule {}
