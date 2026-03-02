import { Module } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [UsersModule],
    controllers: [StripeController],
    providers: [StripeService],
})
export class StripeModule { }
