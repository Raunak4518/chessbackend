import { Test, TestingModule } from '@nestjs/testing';
import { FactionsService } from './factions.service';

describe('FactionsService', () => {
  let service: FactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FactionsService],
    }).compile();

    service = module.get<FactionsService>(FactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
