import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { WalletClientService } from './wallet-client.service';

@Module({
  imports: [HttpModule, ConfigModule, JwtModule.register({})],
  providers: [WalletClientService],
  exports: [WalletClientService],
})
export class WalletClientModule {}
