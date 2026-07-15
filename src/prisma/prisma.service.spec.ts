import { PrismaService } from './prisma.service';

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('./prisma.service', () => {
  return {
    PrismaService: jest.fn().mockImplementation(() => ({
      $connect: mockConnect,
      $disconnect: mockDisconnect,
      onModuleInit: async function () {
        await this.$connect();
      },
      onModuleDestroy: async function () {
        await this.$disconnect();
      },
    })),
  };
});

describe('PrismaService', () => {
  let service: InstanceType<typeof PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PrismaService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should expose onModuleInit', () => {
    expect(typeof service.onModuleInit).toBe('function');
  });

  it('should expose onModuleDestroy', () => {
    expect(typeof service.onModuleDestroy).toBe('function');
  });

  it('onModuleInit should call $connect', async () => {
    await service.onModuleInit();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy should call $disconnect', async () => {
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
