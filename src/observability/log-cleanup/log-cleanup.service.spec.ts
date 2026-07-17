import { Test, TestingModule } from '@nestjs/testing';
import { LogCleanupService } from './log-cleanup.service';

describe('LogCleanupService', () => {
  let service: LogCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogCleanupService],
    }).compile();

    service = module.get<LogCleanupService>(LogCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
