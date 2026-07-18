import { Controller, Post, Req, Res, Headers, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  async createCheckoutSession(@CurrentUser() userId: string) {
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.paymentsService.createCheckoutSession(userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    // Note: To verify the Stripe webhook signature properly, 
    // the raw request body is needed. 
    // You may need to configure NestJS to parse raw body for this specific route.
    return this.paymentsService.handleWebhookEvent(req.rawBody || req.body, signature);
  }
}
