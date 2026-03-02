import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { MealsModule } from './meals/meals.module';
import { WeightModule } from './weight/weight.module';
import { SupplementsModule } from './supplements/supplements.module';
import { SummaryModule } from './summary/summary.module';
import { GeminiModule } from './gemini/gemini.module';
import { StripeModule } from './stripe/stripe.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),

        MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/nutrified'),

        ThrottlerModule.forRoot([
            { name: 'short', ttl: 1000, limit: 3 },
            { name: 'medium', ttl: 10000, limit: 20 },
            { name: 'long', ttl: 60000, limit: 100 },
        ]),

        AuthModule,
        UsersModule,
        ProfileModule,
        MealsModule,
        WeightModule,
        SupplementsModule,
        SummaryModule,
        GeminiModule,
        StripeModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule { }
