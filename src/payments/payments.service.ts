import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_dummy';
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any, // Using latest or fallback
    });
  }

  async createCheckoutSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new InternalServerErrorException('User not found');
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceId = this.configService.get<string>('STRIPE_PREMIUM_PRICE_ID') || 'price_dummy';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${frontendUrl}/billing?success=true`,
      cancel_url: `${frontendUrl}/billing?canceled=true`,
      metadata: {
        userId,
      },
    });

    return { url: session.url };
  }

  async handleWebhookEvent(payload: string, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || 'whsec_dummy';
    
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new InternalServerErrorException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const userId = session.metadata?.userId;
          if (userId) {
            await this.prisma.user.update({
              where: { id: userId },
              data: {
                isPremium: true,
                stripeSubscriptionId: session.subscription as string,
              },
            });
          }
        }
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await this.prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { isPremium: false },
        });
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}
