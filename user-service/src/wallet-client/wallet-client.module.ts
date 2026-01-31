import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WalletClientService } from './wallet-client.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [WalletClientService, JwtService],
  exports: [WalletClientService],
})
export class WalletClientModule {}
