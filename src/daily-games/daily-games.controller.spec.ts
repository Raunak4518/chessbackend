import { Test, TestingModule } from '@nestjs/testing';
import { DailyGamesController } from './daily-games.controller';

describe('DailyGamesController', () => {
  let controller: DailyGamesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyGamesController],
    }).compile();

    controller = module.get<DailyGamesController>(DailyGamesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
