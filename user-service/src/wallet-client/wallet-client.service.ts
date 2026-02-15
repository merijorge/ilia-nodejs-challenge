import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WalletClientService {
  private readonly logger = new Logger(WalletClientService.name);
  private walletServiceUrl: string;
  private internalJwtSecret: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    const walletUrl = this.configService.get<string>('WALLET_SERVICE_URL');
    const internalSecret = this.configService.get<string>('JWT_INTERNAL_KEY');

    if (!walletUrl) {
      throw new Error('WALLET_SERVICE_URL environment variable is not set');
    }

    if (!internalSecret) {
      throw new Error('JWT_INTERNAL_KEY environment variable is not set');
    }

    this.walletServiceUrl = walletUrl;
    this.internalJwtSecret = internalSecret;
  }

  private generateInternalToken(): string {
    return this.jwtService.sign(
      { service: 'user-service' },
      { secret: this.internalJwtSecret, expiresIn: '5m' },
    );
  }

  async createWallet(userId: string): Promise<any> {
    const token = this.generateInternalToken();

    this.logger.debug(`Creating wallet for user: id=${userId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.walletServiceUrl}/wallet/internal/create`,
          { userId: userId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Wallet created successfully: userId=${userId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Wallet creation failed: userId=${userId}, error=${error.message}`,
        error.stack,
      );

      if (error.response) {
        this.logger.error(
          `Wallet service responded with error: status=${error.response.status}, data=${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }

      // Network error (service down, timeout, etc)
      throw new HttpException('Wallet service unavailable', 503);
    }
  }
}
