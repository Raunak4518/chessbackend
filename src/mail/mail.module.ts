import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { EMAIL_QUEUE_NAME } from './mail.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE_NAME }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('SMTP_HOST', 'smtp.ethereal.email'),
          port: Number(config.get('SMTP_PORT', 587)),
          secure: config.get<number>('SMTP_PORT') === 465,
          auth: {
            user: config.get<string>('SMTP_USER', ''),
            pass: config.get<string>('SMTP_PASS', ''),
          },
        },
        defaults: {
          from: config.get<string>(
            'SMTP_FROM',
            '"Chess Arena" <noreply@chessarena.com>',
          ),
        },
        template: {
          dir: join(
            typeof __dirname !== 'undefined'
              ? __dirname
              : join(process.cwd(), 'src/mail'),
            'templates',
          ),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
