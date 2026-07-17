import { Test, TestingModule } from '@nestjs/testing';

import { MailerService } from '@nestjs-modules/mailer';

import { Job } from 'bullmq';

import { MailProcessor } from './mail.processor';

import { EmailPayload } from './mail.service';

describe('MailProcessor', () => {
  let processor: MailProcessor;

  let mailerServiceMock: jest.Mocked<MailerService>;

  beforeEach(async () => {
    const mailerServiceMockProvider = {
      sendMail: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProcessor,

        {
          provide: MailerService,

          useValue: mailerServiceMockProvider,
        },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);

    mailerServiceMock = module.get(MailerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should send the email successfully using MailerService', async () => {
      const mockJob = {
        id: 'job-123',

        opts: { priority: 1 },

        data: {
          to: 'user@example.com',

          subject: 'Test Subject',

          template: 'otp',

          context: { otp: '654321' },
        },
      } as unknown as Job<EmailPayload>;

      await processor.process(mockJob);

      /* eslint-disable @typescript-eslint/unbound-method */
      expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
        to: 'user@example.com',

        subject: 'Test Subject',

        template: './otp',

        context: { otp: '654321' },
      });
    });

    it('should log and rethrow the error if MailerService fails', async () => {
      const mockJob = {
        id: 'job-123',

        opts: { priority: 1 },

        data: {
          to: 'user@example.com',

          subject: 'Test Subject',

          template: 'otp',

          context: { otp: '654321' },
        },
      } as unknown as Job<EmailPayload>;

      const mockError = new Error('SMTP connection timed out');

      mailerServiceMock.sendMail.mockRejectedValueOnce(mockError);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'SMTP connection timed out',
      );
    });
  });
});
