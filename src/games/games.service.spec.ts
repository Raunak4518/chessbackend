import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('GamesService', () => {
  let service: GamesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamesService],
    }).compile();

    service = module.get<GamesService>(GamesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom', () => {
    it('should create a room with the correct initial state', () => {
      const room = service.createRoom('room1', 'socket-white');

      expect(room).toBeDefined();
      expect(room.players).toEqual(['socket-white']);
      expect(room.whitePlayerId).toBe('socket-white');
      expect(room.blackPlayerId).toBe('');
      expect(room.fen).toBe(INITIAL_FEN);
    });

    it('should store the room so getRoom returns it', () => {
      const room = service.createRoom('room1', 'socket-white');
      expect(service.getRoom('room1')).toEqual(room);
    });
  });

  describe('getRoom', () => {
    it('should return undefined for a non-existent room', () => {
      expect(service.getRoom('no-such-room')).toBeUndefined();
    });

    it('should return the created room by name', () => {
      service.createRoom('room-abc', 'sock1');
      expect(service.getRoom('room-abc')).toBeDefined();
    });
  });

  describe('joinRoom', () => {
    it('should allow a second player to join', () => {
      service.createRoom('room1', 'socket-white');
      const room = service.joinRoom('room1', 'socket-black');

      expect(room).not.toBeNull();
      expect(room?.players).toContain('socket-black');
      expect(room?.blackPlayerId).toBe('socket-black');
    });

    it('should return null when joining a full room', () => {
      service.createRoom('room1', 'socket-white');
      service.joinRoom('room1', 'socket-black');

      const result = service.joinRoom('room1', 'socket-extra');
      expect(result).toBeNull();
    });

    it('should return null when joining a non-existent room', () => {
      const result = service.joinRoom('ghost-room', 'socket-x');
      expect(result).toBeNull();
    });
  });

  describe('updateFen', () => {
    it('should update the FEN and return true', () => {
      service.createRoom('room1', 'socket-white');
      const newFen = '8/8/8/8/8/8/8/8 w - - 0 1';

      const updated = service.updateFen('room1', newFen);

      expect(updated).toBe(true);
      expect(service.getRoom('room1')?.fen).toBe(newFen);
    });

    it('should return false when updating a non-existent room', () => {
      expect(service.updateFen('no-room', 'some-fen')).toBe(false);
    });
  });

  describe('resetRoom', () => {
    it('should reset FEN to the starting position', () => {
      service.createRoom('room1', 'socket-white');
      service.updateFen('room1', '8/8/8/8/8/8/8/8 w - - 0 1');

      const fen = service.resetRoom('room1');

      expect(fen).toBe(INITIAL_FEN);
      expect(service.getRoom('room1')?.fen).toBe(INITIAL_FEN);
    });

    it('should return null for a non-existent room', () => {
      expect(service.resetRoom('ghost')).toBeNull();
    });
  });

  describe('handleDisconnect', () => {
    it('should return null when socket is not in any room', () => {
      const result = service.handleDisconnect('unknown-socket');
      expect(result).toBeNull();
    });

    it('should notify remaining player when one disconnects from a two-player room', () => {
      service.createRoom('room1', 'white');
      service.joinRoom('room1', 'black');

      const result = service.handleDisconnect('white');

      expect(result).not.toBeNull();
      expect(result?.roomName).toBe('room1');
      expect(result?.shouldNotify).toBe(true);
    });

    it('should delete the room when the last player disconnects', () => {
      service.createRoom('room1', 'only-player');
      service.handleDisconnect('only-player');

      expect(service.getRoom('room1')).toBeUndefined();
    });

    it('should return shouldNotify: false when last player disconnects', () => {
      service.createRoom('room1', 'white');
      service.joinRoom('room1', 'black');

      service.handleDisconnect('white');
      const result = service.handleDisconnect('black');

      expect(result).not.toBeNull();
      expect(result?.shouldNotify).toBe(false);
    });
  });
});
