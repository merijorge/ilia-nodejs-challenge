import { Module } from '@nestjs/common';
import { WalletClientModule } from '../wallet-client/wallet-client.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [WalletClientModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
