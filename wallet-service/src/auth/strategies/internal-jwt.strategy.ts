import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface InternalJwtPayload {
  service: string;
}

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

  validate(payload: InternalJwtPayload) {
    // Validate that it's from a trusted internal service
    if (!payload.service || payload.service !== 'user-service') {
      throw new UnauthorizedException(
        'Invalid internal token - not from trusted service',
      );
    }

    return { service: payload.service };
  }
}
