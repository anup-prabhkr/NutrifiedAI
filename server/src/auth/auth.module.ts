import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './auth.guard';
import { UsersModule } from '../users/users.module';
import { MailerModule } from '../mailer/mailer.module';
import { MealsModule } from '../meals/meals.module';
import { WeightModule } from '../weight/weight.module';
import { SupplementsModule } from '../supplements/supplements.module';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.register({}),
        MailerModule,
        MealsModule,
        WeightModule,
        SupplementsModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        JwtRefreshStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
    exports: [AuthService],
})
export class AuthModule { }

