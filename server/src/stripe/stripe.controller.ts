import {
    Controller,
    Post,
    Headers,
    Req,
    RawBodyRequest,
    BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('stripe')
export class StripeController {
    constructor(private stripeService: StripeService) { }

    @Post('checkout')
    async createCheckout(
        @CurrentUser() user: { userId: string; email: string },
    ) {
        return this.stripeService.createCheckoutSession(user.userId, user.email);
    }

    @Post('portal')
    async createPortal(@CurrentUser() user: { userId: string }) {
        return this.stripeService.createPortalSession(user.userId);
    }

    @Public()
    @Post('webhook')
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ) {
        if (!signature) {
            throw new BadRequestException('Missing stripe-signature header');
        }

        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new BadRequestException('Missing raw body');
        }

        try {
            const event = this.stripeService.constructEvent(rawBody, signature);
            await this.stripeService.handleWebhookEvent(event);
            return { received: true };
        } catch (error: any) {
            throw new BadRequestException(`Webhook error: ${error.message}`);
        }
    }
}
