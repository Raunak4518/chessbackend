import { Test, TestingModule } from '@nestjs/testing';
import { DailyGamesService } from './daily-games.service';

describe('DailyGamesService', () => {
  let service: DailyGamesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyGamesService],
    }).compile();

    service = module.get<DailyGamesService>(DailyGamesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
