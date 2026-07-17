import { Test, TestingModule } from '@nestjs/testing';
import { FactionsController } from './factions.controller';

describe('FactionsController', () => {
  let controller: FactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FactionsController],
    }).compile();

    controller = module.get<FactionsController>(FactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
