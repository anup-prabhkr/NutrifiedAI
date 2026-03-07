import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_ACCESS_SECRET || (() => { if (process.env.NODE_ENV === 'production') throw new Error('JWT_ACCESS_SECRET must be set in production'); return 'dev-access-secret'; })(),
        });
    }

    async validate(payload: { sub: string; email: string }) {
        const user = await this.usersService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException();
        }
        return {
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            subscription: user.subscription,
        };
    }
}
