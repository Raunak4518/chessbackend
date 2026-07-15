import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EMAIL_QUEUE_NAME,
  EMAIL_PRIORITY,
  EMAIL_JOB_NAME,
  EmailPriority,
} from './mail.constants';

export interface OtpEmailPayload {
  template: 'otp';
  context: { otp: string };
  to: string;
  subject: string;
}

export interface WelcomeEmailPayload {
  template: 'welcome';
  context: { name: string };
  to: string;
  subject: string;
}

export interface GenericEmailPayload {
  template: string;
  context: Record<string, unknown>;
  to: string;
  subject: string;
}

export type EmailPayload =
  | OtpEmailPayload
  | WelcomeEmailPayload
  | GenericEmailPayload;

@Injectable()
export class MailService {
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  private async enqueue(
    payload: EmailPayload,
    priority: EmailPriority,
  ): Promise<void> {
    await this.emailQueue.add(EMAIL_JOB_NAME, payload, {
      priority,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    await this.enqueue(
      {
        to,
        subject: 'Your Verification Code — Chess Arena',
        template: 'otp',
        context: { otp },
      },
      EMAIL_PRIORITY.CRITICAL,
    );
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.enqueue(
      {
        to,
        subject: 'Welcome to Chess Arena',
        template: 'welcome',
        context: { name },
      },
      EMAIL_PRIORITY.NORMAL,
    );
  }

  async sendPromotionalEmail(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    await this.enqueue(
      { to, subject, template: templateName, context },
      EMAIL_PRIORITY.LOW,
    );
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, unknown>,
    priority: EmailPriority = EMAIL_PRIORITY.NORMAL,
  ): Promise<void> {
    await this.enqueue(
      { to, subject, template: templateName, context },
      priority,
    );
  }
}
