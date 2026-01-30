import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class InternalJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-internal',
) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_INTERNAL_KEY');

    if (!secret) {
      throw new Error(
        'JWT_INTERNAL_KEY is not defined in environment variables',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    if (!payload.userId) {
      throw new UnauthorizedException('Invalid internal token');
    }

    return { userId: payload.userId };
  }
}
