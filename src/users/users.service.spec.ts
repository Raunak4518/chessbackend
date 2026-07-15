import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user when one exists', async () => {
      const mockUser = {
        id: 'uuid-1',
        email: 'test@chess.com',
        name: 'Test User',
        emailVerified: false,
        image: null,
        rating: 1200,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.findByEmail('test@chess.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@chess.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when no user matches the email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.findByEmail('nobody@chess.com');

      expect(result).toBeNull();
    });

    it('should call findUnique with the exact email provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await service.findByEmail('exact@match.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'exact@match.com' },
      });
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('DB connection failed');
      mockPrismaService.user.findUnique.mockRejectedValueOnce(dbError);

      await expect(service.findByEmail('fail@chess.com')).rejects.toThrow(
        'DB connection failed',
      );
    });
  });
});
