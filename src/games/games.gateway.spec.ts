import { Test, TestingModule } from '@nestjs/testing';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { MatchmakingService } from './matchmaking.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockSocket = (id: string) => ({
  id,
  handshake: { auth: {}, headers: {} },
  data: {},
  join: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
});

describe('GamesGateway', () => {
  let gateway: GamesGateway;
  let gamesService: GamesService;
  let matchmakingService: MatchmakingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesGateway,
        GamesService,
        MatchmakingService,
        {
          provide: PrismaService,
          useValue: {
            session: { findUnique: jest.fn() },
            user: { findUnique: jest.fn(), update: jest.fn() },
            $transaction: jest.fn((promises) => Promise.all(promises)),
          },
        },
      ],
    }).compile();

    gateway = module.get<GamesGateway>(GamesGateway);
    gamesService = module.get<GamesService>(GamesService);
    matchmakingService = module.get<MatchmakingService>(MatchmakingService);

    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      sockets: { sockets: new Map() },
    };
  });

  afterEach(() => {
    matchmakingService.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should not throw on connection', () => {
      const socket = buildMockSocket('s1') as any;
      expect(() => gateway.handleConnection(socket)).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('should call leaveQueue on disconnect', () => {
      const spy = jest.spyOn(matchmakingService, 'leaveQueue');
      const socket = buildMockSocket('s1') as any;

      gateway.handleDisconnect(socket);

      expect(spy).toHaveBeenCalledWith('s1');
    });

    it('should emit opponentDisconnected when partner is still in the room', () => {
      const emitFn = jest.fn();
      (gateway as any).server.to.mockReturnValue({ emit: emitFn });

      gamesService.createRoom('room1', 's1');
      gamesService.joinRoom('room1', 's2');

      const socket = buildMockSocket('s1') as any;
      gateway.handleDisconnect(socket);

      expect(emitFn).toHaveBeenCalledWith('opponentDisconnected');
    });

    it('should not emit when the room becomes empty', () => {
      const emitFn = jest.fn();
      (gateway as any).server.to.mockReturnValue({ emit: emitFn });

      gamesService.createRoom('room1', 's1');

      const socket = buildMockSocket('s1') as any;
      gateway.handleDisconnect(socket);

      expect(emitFn).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinQueue', () => {
    it('should call joinQueue and emit queueJoined', () => {
      const spy = jest.spyOn(matchmakingService, 'joinQueue');
      const socket = buildMockSocket('s1') as any;

      gateway.handleJoinQueue(socket, { rating: 1200 });

      expect(spy).toHaveBeenCalledWith('s1', 1200, '10|0', 'RAPID');
      expect(socket.emit).toHaveBeenCalledWith('queueJoined');
    });
  });

  describe('handleLeaveQueue', () => {
    it('should call leaveQueue and emit queueLeft', () => {
      const spy = jest.spyOn(matchmakingService, 'leaveQueue');
      const socket = buildMockSocket('s1') as any;

      gateway.handleLeaveQueue(socket);

      expect(spy).toHaveBeenCalledWith('s1');
      expect(socket.emit).toHaveBeenCalledWith('queueLeft');
    });
  });

  describe('handleJoinRoom', () => {
    it('should create a new room and assign white when room does not exist', () => {
      const socket = buildMockSocket('s1') as any;

      gateway.handleJoinRoom(socket, { room: 'testRoom' });

      expect(socket.join).toHaveBeenCalledWith('testRoom');
      expect(socket.emit).toHaveBeenCalledWith('roomJoined', {
        color: 'w',
        room: 'testRoom',
      });
    });

    it('should assign black and emit gameStart when room has one player', () => {
      const whiteSocket = buildMockSocket('white') as any;
      const blackSocket = buildMockSocket('black') as any;

      gateway.handleJoinRoom(whiteSocket, { room: 'testRoom' });
      gateway.handleJoinRoom(blackSocket, { room: 'testRoom' });

      expect(blackSocket.emit).toHaveBeenCalledWith('roomJoined', {
        color: 'b',
        room: 'testRoom',
      });
    });

    it('should emit roomFull when room already has two players', () => {
      const s1 = buildMockSocket('s1') as any;
      const s2 = buildMockSocket('s2') as any;
      const s3 = buildMockSocket('s3') as any;

      gateway.handleJoinRoom(s1, { room: 'testRoom' });
      gateway.handleJoinRoom(s2, { room: 'testRoom' });
      gateway.handleJoinRoom(s3, { room: 'testRoom' });

      expect(s3.emit).toHaveBeenCalledWith('roomFull');
    });
  });

  describe('handleMakeMove', () => {
    it('should update FEN and relay move to the room', () => {
      gamesService.createRoom('room1', 's1');
      const socket = buildMockSocket('s1') as any;
      const toEmit = jest.fn();
      socket.to = jest.fn().mockReturnValue({ emit: toEmit });

      gateway.handleMakeMove(socket, {
        room: 'room1',
        from: 'e2',
        to: 'e4',
        fen: '8/8/8/8/4P3/8/8/8 b - e3 0 1',
      });

      expect(toEmit).toHaveBeenCalledWith('opponentMove', {
        from: 'e2',
        to: 'e4',
        fen: '8/8/8/8/4P3/8/8/8 b - e3 0 1',
      });
    });

    it('should not relay when the room does not exist', () => {
      const socket = buildMockSocket('s1') as any;
      const toEmit = jest.fn();
      socket.to = jest.fn().mockReturnValue({ emit: toEmit });

      gateway.handleMakeMove(socket, {
        room: 'ghost',
        from: 'e2',
        to: 'e4',
        fen: 'some-fen',
      });

      expect(toEmit).not.toHaveBeenCalled();
    });
  });

  describe('handleUndoMove', () => {
    it('should update FEN and relay undo to the room', () => {
      gamesService.createRoom('room1', 's1');
      const socket = buildMockSocket('s1') as any;
      const toEmit = jest.fn();
      socket.to = jest.fn().mockReturnValue({ emit: toEmit });

      gateway.handleUndoMove(socket, {
        room: 'room1',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        from: 'e4',
        to: 'e2',
      });

      expect(toEmit).toHaveBeenCalledWith('opponentUndo', expect.any(Object));
    });
  });

  describe('handleResetGame', () => {
    it('should broadcast gameReset with starting FEN', () => {
      gamesService.createRoom('room1', 's1');
      const socket = buildMockSocket('s1') as any;
      const broadcastEmit = jest.fn();
      (gateway as any).server.to.mockReturnValue({ emit: broadcastEmit });

      gateway.handleResetGame(socket, { room: 'room1' });

      expect(broadcastEmit).toHaveBeenCalledWith('gameReset', {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      });
    });

    it('should not broadcast when the room does not exist', () => {
      const socket = buildMockSocket('s1') as any;
      const broadcastEmit = jest.fn();
      (gateway as any).server.to.mockReturnValue({ emit: broadcastEmit });

      gateway.handleResetGame(socket, { room: 'ghost' });

      expect(broadcastEmit).not.toHaveBeenCalled();
    });
  });
});
