import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { InternalJwtStrategy } from './strategies/internal-jwt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, InternalJwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
