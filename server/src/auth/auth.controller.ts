import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Public()
    @Get('verify-email')
    async verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Public()
    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body('email') email: string) {
        return this.authService.resendVerification(email);
    }

    @Public()
    @UseGuards(AuthGuard('jwt-refresh'))
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @CurrentUser() user: { userId: string; refreshToken: string },
    ) {
        return this.authService.refresh(user.userId, user.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@CurrentUser() user: { userId: string }) {
        return this.authService.logout(user.userId);
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @CurrentUser() user: { userId: string },
        @Body() body: { currentPassword: string; newPassword: string },
    ) {
        return this.authService.changePassword(user.userId, body.currentPassword, body.newPassword);
    }

    @Post('change-email')
    @HttpCode(HttpStatus.OK)
    async changeEmail(
        @CurrentUser() user: { userId: string },
        @Body() body: { newEmail: string; password: string },
    ) {
        return this.authService.changeEmail(user.userId, body.newEmail, body.password);
    }

    @Delete('delete-account')
    @HttpCode(HttpStatus.OK)
    async deleteAccount(@CurrentUser() user: { userId: string }) {
        return this.authService.deleteAccount(user.userId);
    }
}

