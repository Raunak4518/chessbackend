export const EMAIL_QUEUE_NAME = 'email';

export const EMAIL_PRIORITY = {
  CRITICAL: 1,
  HIGH: 5,
  NORMAL: 10,
  LOW: 20,
} as const;

export type EmailPriority =
  (typeof EMAIL_PRIORITY)[keyof typeof EMAIL_PRIORITY];

export const EMAIL_JOB_NAME = 'send-email';
