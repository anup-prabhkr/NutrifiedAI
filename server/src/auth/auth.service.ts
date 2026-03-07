import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { MealsService } from '../meals/meals.service';
import { WeightService } from '../weight/weight.service';
import { SupplementsService } from '../supplements/supplements.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private mailerService: MailerService,
        private mealsService: MealsService,
        private weightService: WeightService,
        private supplementsService: SupplementsService,
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

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await this.usersService.setEmailVerificationToken(
            user._id.toString(),
            verificationToken,
            expiry,
        );

        await this.mailerService.sendVerificationEmail(user.email, verificationToken);

        return {
            message: 'Registration successful. Please check your email to verify your account.',
            email: user.email,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.passwordHash) {
            throw new UnauthorizedException('This account uses Google sign-in. Please sign in with Google.');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isEmailVerified) {
            throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
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

    async verifyEmail(token: string) {
        const user = await this.usersService.findByVerificationToken(token);
        if (!user) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        if (!user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
            throw new BadRequestException('Verification token has expired. Please request a new one.');
        }

        await this.usersService.markEmailAsVerified(user._id.toString());

        const tokens = await this.generateTokens(user._id.toString(), user.email);
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

    async resendVerification(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            // Return generic message to avoid email enumeration
            return { message: 'If that email exists, a verification link has been sent.' };
        }

        if (user.isEmailVerified) {
            return { message: 'Email is already verified.' };
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.usersService.setEmailVerificationToken(
            user._id.toString(),
            verificationToken,
            expiry,
        );

        await this.mailerService.sendVerificationEmail(user.email, verificationToken);

        return { message: 'If that email exists, a verification link has been sent.' };
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

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!passwordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await this.usersService.updatePassword(userId, newHash);

        return { message: 'Password changed successfully' };
    }

    async changeEmail(userId: string, newEmail: string, password: string) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            throw new UnauthorizedException('Password is incorrect');
        }

        const normalizedEmail = newEmail.toLowerCase();
        if (normalizedEmail === user.email) {
            throw new BadRequestException('New email is the same as current email');
        }

        const existing = await this.usersService.findByEmail(normalizedEmail);
        if (existing) {
            throw new ConflictException('Email already in use');
        }

        await this.usersService.updateEmail(userId, normalizedEmail);

        // Mark as unverified and send a new verification email
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.usersService.setEmailVerificationToken(userId, verificationToken, expiry);
        await this.usersService.markEmailAsUnverified(userId);
        await this.mailerService.sendVerificationEmail(normalizedEmail, verificationToken);

        return { message: 'Email changed. Please verify your new email address.' };
    }

    async deleteAccount(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Delete all user data in parallel
        await Promise.all([
            this.mealsService.deleteAllForUser(userId),
            this.weightService.deleteAllForUser(userId),
            this.supplementsService.deleteAllForUser(userId),
        ]);

        // Delete the user document
        await this.usersService.deleteUser(userId);

        return { message: 'Account and all associated data have been permanently deleted.' };
    }

    async googleLogin(googleUser: {
        googleId: string;
        email: string;
        name: string;
        picture?: string;
    }) {
        if (!googleUser.email) {
            throw new BadRequestException('Google account has no email');
        }

        // 1. Check if user exists by googleId
        let user = await this.usersService.findByGoogleId(googleUser.googleId);

        if (!user) {
            // 2. Check if a user with this email already exists (registered via email/password)
            user = await this.usersService.findByEmail(googleUser.email);

            if (user) {
                // Link Google account to existing user
                await this.usersService.linkGoogleId(user._id.toString(), googleUser.googleId);
                user = await this.usersService.findById(user._id.toString());
            } else {
                // 3. Create a new user
                user = await this.usersService.createGoogleUser({
                    name: googleUser.name || googleUser.email.split('@')[0],
                    email: googleUser.email,
                    googleId: googleUser.googleId,
                });
            }
        }

        const tokens = await this.generateTokens(user!._id.toString(), user!.email);
        await this.storeRefreshToken(user!._id.toString(), tokens.refreshToken);

        return {
            user: {
                id: user!._id.toString(),
                name: user!.name,
                email: user!.email,
                profile: user!.profile,
                subscription: user!.subscription,
            },
            ...tokens,
        };
    }

    private async generateTokens(userId: string, email: string) {
        const payload = { sub: userId, email };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_ACCESS_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-access-secret'),
                expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any,
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-refresh-secret'),
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
