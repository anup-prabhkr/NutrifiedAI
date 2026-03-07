import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_REFRESH_SECRET || (() => { if (process.env.NODE_ENV === 'production') throw new Error('JWT_REFRESH_SECRET must be set in production'); return 'dev-refresh-secret'; })(),
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: { sub: string; email: string }) {
        const refreshToken = req.body?.refreshToken;
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token missing');
        }

        const user = await this.usersService.findById(payload.sub);
        if (!user || !user.refreshTokenHash) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        return {
            userId: user._id.toString(),
            email: user.email,
            refreshToken,
        };
    }
}
