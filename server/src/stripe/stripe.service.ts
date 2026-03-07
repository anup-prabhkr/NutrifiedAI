import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';

@Injectable()
export class StripeService {
    private stripe: Stripe | null = null;

    constructor(private usersService: UsersService) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (secretKey && secretKey !== 'sk_test_your-stripe-secret-key') {
            this.stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });
        } else {
            console.warn('⚠️  STRIPE_SECRET_KEY not set — billing features will be unavailable');
        }
    }

    async createCheckoutSession(userId: string, email: string) {
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }

        // Find or create Stripe customer
        let user = await this.usersService.findById(userId);
        let customerId = user?.subscription?.stripeCustomerId;

        if (!customerId) {
            const customer = await this.stripe.customers.create({ email });
            customerId = customer.id;
            await this.usersService.updateSubscription(userId, {
                stripeCustomerId: customerId,
            });
        }

        const session = await this.stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [
                {
                    price: process.env.STRIPE_PRO_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.FRONTEND_URL}/subscription?success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/subscription?canceled=true`,
            metadata: { userId },
        });

        return { url: session.url };
    }

    async createPortalSession(userId: string) {
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }

        const user = await this.usersService.findById(userId);
        const customerId = user?.subscription?.stripeCustomerId;

        if (!customerId) {
            throw new Error('No billing account found');
        }

        const session = await this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.FRONTEND_URL}/subscription`,
        });

        return { url: session.url };
    }

    async handleWebhookEvent(event: Stripe.Event) {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                if (userId) {
                    await this.usersService.updateSubscription(userId, {
                        tier: 'pro',
                        status: 'active',
                    });
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId =
                    typeof subscription.customer === 'string'
                        ? subscription.customer
                        : subscription.customer.id;
                const user =
                    await this.usersService.findByStripeCustomerId(customerId);
                if (user) {
                    const isActive = ['active', 'trialing'].includes(
                        subscription.status,
                    );
                    await this.usersService.updateSubscription(
                        user._id.toString(),
                        {
                            tier: isActive ? 'pro' : 'free',
                            status: subscription.status,
                        },
                    );
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId =
                    typeof subscription.customer === 'string'
                        ? subscription.customer
                        : subscription.customer.id;
                const user =
                    await this.usersService.findByStripeCustomerId(customerId);
                if (user) {
                    await this.usersService.updateSubscription(
                        user._id.toString(),
                        {
                            tier: 'free',
                            status: 'canceled',
                        },
                    );
                }
                break;
            }
        }
    }

    constructEvent(payload: Buffer, signature: string): Stripe.Event {
        if (!this.stripe) {
            throw new Error('Stripe is not configured');
        }
        return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || (() => { throw new Error('STRIPE_WEBHOOK_SECRET is not configured'); })(),
        );
    }
}
