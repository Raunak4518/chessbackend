import { Test, TestingModule } from '@nestjs/testing';

import { getQueueToken } from '@nestjs/bullmq';

import { Queue } from 'bullmq';

import { MailService } from './mail.service';

import {
  EMAIL_QUEUE_NAME,
  EMAIL_PRIORITY,
  EMAIL_JOB_NAME,
} from './mail.constants';

describe('MailService', () => {
  let service: MailService;

  let queueMock: jest.Mocked<Queue>;

  beforeEach(async () => {
    const queueMockProvider = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,

        {
          provide: getQueueToken(EMAIL_QUEUE_NAME),

          useValue: queueMockProvider,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);

    queueMock = module.get(getQueueToken(EMAIL_QUEUE_NAME));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtpEmail', () => {
    it('should queue the OTP email with critical priority', async () => {
      const email = 'test@example.com';

      const otp = '123456';

      await service.sendOtpEmail(email, otp);

      /* eslint-disable @typescript-eslint/unbound-method */
      expect(queueMock.add).toHaveBeenCalledWith(
        EMAIL_JOB_NAME,

        {
          to: email,

          subject: 'Your Verification Code — Chess Arena',

          template: 'otp',

          context: { otp },
        },

        expect.objectContaining({
          priority: EMAIL_PRIORITY.CRITICAL,

          attempts: 3,
        }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should queue the welcome email with normal priority', async () => {
      const email = 'test@example.com';

      const name = 'Test User';

      await service.sendWelcomeEmail(email, name);

      /* eslint-disable @typescript-eslint/unbound-method */
      expect(queueMock.add).toHaveBeenCalledWith(
        EMAIL_JOB_NAME,

        {
          to: email,

          subject: 'Welcome to Chess Arena',

          template: 'welcome',

          context: { name },
        },

        expect.objectContaining({
          priority: EMAIL_PRIORITY.NORMAL,
        }),
      );
    });
  });

  describe('sendPromotionalEmail', () => {
    it('should queue promotional emails with low priority', async () => {
      const email = 'promo@example.com';

      const subject = 'Check out new bots!';

      const template = 'promotional';

      const context = { discountCode: 'CHESS50' };

      await service.sendPromotionalEmail(email, subject, template, context);

      /* eslint-disable @typescript-eslint/unbound-method */
      expect(queueMock.add).toHaveBeenCalledWith(
        EMAIL_JOB_NAME,

        { to: email, subject, template, context },

        expect.objectContaining({
          priority: EMAIL_PRIORITY.LOW,
        }),
      );
    });
  });
});
