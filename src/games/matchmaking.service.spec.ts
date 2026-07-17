import { Test, TestingModule } from '@nestjs/testing';

import { MatchmakingService } from './matchmaking.service';

describe('MatchmakingService', () => {
  let service: MatchmakingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchmakingService],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);
  });

  afterEach(() => {
    service.onModuleDestroy();

    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit / onModuleDestroy', () => {
    it('onModuleInit should start the interval', () => {
      const spy = jest.spyOn(global, 'setInterval');

      service.onModuleInit();

      expect(spy).toHaveBeenCalled();

      service.onModuleDestroy();
    });

    it('onModuleDestroy should clear the interval', () => {
      const spy = jest.spyOn(global, 'clearInterval');

      service.onModuleInit();

      service.onModuleDestroy();

      expect(spy).toHaveBeenCalled();
    });

    it('onModuleDestroy should be safe to call when no interval is set', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe('joinQueue', () => {
    it('should add a player to the queue', () => {
      service.joinQueue('player1', 1200, '10|0', 'RAPID');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect((service as any).queue).toHaveLength(1);
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect((service as any).queue[0].socketId).toBe('player1');
    });

    it('should replace a player that is already in the queue', () => {
      service.joinQueue('player1', 1200, '10|0', 'RAPID');

      service.joinQueue('player1', 1300, '10|0', 'RAPID');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect((service as any).queue).toHaveLength(1);
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect((service as any).queue[0].rating).toBe(1300);
    });
  });

  describe('leaveQueue', () => {
    it('should remove the player from the queue', () => {
      service.joinQueue('player1', 1200, '10|0', 'RAPID');

      service.leaveQueue('player1');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect((service as any).queue).toHaveLength(0);
    });

    it('should be safe when the player is not in the queue', () => {
      expect(() => service.leaveQueue('ghost')).not.toThrow();
    });
  });

  describe('registerMatchCallback', () => {
    it('should store the callback', () => {
      const cb = jest.fn();

      service.registerMatchCallback(cb);
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect((service as any).matchCallback).toBe(cb);
    });
  });

  describe('checkMatches (via private access)', () => {
    it('should match two players with identical ratings', () => {
      const callback = jest.fn();

      service.registerMatchCallback(callback);

      service.joinQueue('player1', 1200, '10|0', 'RAPID');

      service.joinQueue('player2', 1200, '10|0', 'RAPID');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      (service as any).checkMatches();

      expect(callback).toHaveBeenCalledTimes(1);
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const match = callback.mock.calls[0][0];
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect(match.roomName).toMatch(/^room-/);
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect([match.white, match.black]).toContain('player1');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect([match.white, match.black]).toContain('player2');
    });

    it('should remove matched players from the queue', () => {
      service.joinQueue('player1', 1200, '10|0', 'RAPID');

      service.joinQueue('player2', 1200, '10|0', 'RAPID');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      (service as any).checkMatches();

      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect((service as any).queue).toHaveLength(0);
    });

    it('should not match players outside the initial rating threshold', () => {
      const callback = jest.fn();

      service.registerMatchCallback(callback);

      service.joinQueue('player1', 1200, '10|0', 'RAPID');

      service.joinQueue('player2', 1500, '10|0', 'RAPID');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      (service as any).checkMatches();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should do nothing with fewer than two players', () => {
      const callback = jest.fn();

      service.registerMatchCallback(callback);

      service.joinQueue('player1', 1200, '10|0', 'RAPID');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      (service as any).checkMatches();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should match players after threshold expands over time', () => {
      const callback = jest.fn();

      service.registerMatchCallback(callback);

      const now = Date.now();

      jest.spyOn(Date, 'now').mockReturnValue(now);

      service.joinQueue('player1', 1200, '10|0', 'RAPID');

      service.joinQueue('player2', 1350, '10|0', 'RAPID');

      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      (service as any).checkMatches();

      expect(callback).not.toHaveBeenCalled();

      jest.spyOn(Date, 'now').mockReturnValue(now + 6000);

      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      (service as any).checkMatches();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should match multiple pairs in one pass', () => {
      const callback = jest.fn();

      service.registerMatchCallback(callback);

      service.joinQueue('a', 1200, '10|0', 'RAPID');

      service.joinQueue('b', 1200, '10|0', 'RAPID');

      service.joinQueue('c', 1200, '10|0', 'RAPID');

      service.joinQueue('d', 1200, '10|0', 'RAPID');
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      (service as any).checkMatches();

      expect(callback).toHaveBeenCalledTimes(2);
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect((service as any).queue).toHaveLength(0);
    });
  });
});
