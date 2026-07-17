import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME } from './mail.constants';
import { EmailPayload } from './mail.service';

@Processor(EMAIL_QUEUE_NAME)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<EmailPayload>): Promise<void> {
    const { to, subject, template, context } = job.data;

    this.logger.log(
      `Processing email job ${job.id} | priority=${job.opts.priority} | to=${to} | template=${template}`,
    );

    if (template === 'otp') {
      this.logger.log(
        `[DEV ONLY - OTP CODE]: The verification code for ${to} is: ${String(context.otp)}`,
      );
    }

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: `./${template}`,
        context,
      });

      this.logger.log(`Email job ${job.id} sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `Email job ${job.id} failed for ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
