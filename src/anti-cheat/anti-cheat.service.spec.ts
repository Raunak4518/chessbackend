import { Test, TestingModule } from '@nestjs/testing';
import { AntiCheatService } from './anti-cheat.service';

describe('AntiCheatService', () => {
  let service: AntiCheatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AntiCheatService],
    }).compile();

    service = module.get<AntiCheatService>(AntiCheatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
