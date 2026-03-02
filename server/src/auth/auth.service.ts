import {
    Injectable,
    ConflictException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.usersService.create({
            name: dto.name,
            email: dto.email,
            passwordHash,
        });

        const tokens = await this.generateTokens(
            user._id.toString(),
            user.email,
        );
        await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

        return {
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                profile: user.profile,
                subscription: user.subscription,
            },
            ...tokens,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(
            user._id.toString(),
            user.email,
        );
        await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

        return {
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                profile: user.profile,
                subscription: user.subscription,
            },
            ...tokens,
        };
    }

    async refresh(userId: string, refreshToken: string) {
        const user = await this.usersService.findById(userId);
        if (!user || !user.refreshTokenHash) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const tokenValid = await bcrypt.compare(
            refreshToken,
            user.refreshTokenHash,
        );
        if (!tokenValid) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const tokens = await this.generateTokens(
            user._id.toString(),
            user.email,
        );
        await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

        return tokens;
    }

    async logout(userId: string) {
        await this.usersService.updateRefreshToken(userId, null);
        return { message: 'Logged out successfully' };
    }

    private async generateTokens(userId: string, email: string) {
        const payload = { sub: userId, email };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
                expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any,
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
                expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any,
            }),
        ]);

        return { accessToken, refreshToken };
    }

    private async storeRefreshToken(userId: string, refreshToken: string) {
        const hash = await bcrypt.hash(refreshToken, 10);
        await this.usersService.updateRefreshToken(userId, hash);
    }
}
