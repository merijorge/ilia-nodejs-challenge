import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WalletClientService {
  private readonly logger = new Logger(WalletClientService.name);
  private walletServiceUrl: string;
  private internalJwtSecret: string;
  private readonly REQUEST_TIMEOUT = 2000; // 2 seconds

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

    this.logger.log(`Wallet client initialized: url=${this.walletServiceUrl}`);
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
            timeout: this.REQUEST_TIMEOUT,
          },
        ),
      );

      this.logger.log(`Wallet created successfully: userId=${userId}`);
      return response.data;
    } catch (error) {
      return this.handleWalletServiceError(error, userId);
    }
  }

  private handleWalletServiceError(error: any, userId: string): never {
    const axiosError = error as AxiosError;

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      this.logger.error(
        `Wallet service timeout: userId=${userId}, timeout=${this.REQUEST_TIMEOUT}ms`,
      );
      throw new ServiceUnavailableException('Wallet service request timed out');
    }

    // Handle network/connection errors (service down)
    if (axiosError.code === 'ECONNREFUSED') {
      this.logger.error(
        `Wallet service connection refused: userId=${userId}, url=${this.walletServiceUrl}`,
      );
      throw new ServiceUnavailableException(
        'Wallet service is currently unavailable',
      );
    }

    if (axiosError.code === 'ENOTFOUND') {
      this.logger.error(
        `Wallet service DNS lookup failed: userId=${userId}, url=${this.walletServiceUrl}`,
      );
      throw new InternalServerErrorException(
        'Wallet service configuration error',
      );
    }

    // Handle HTTP response errors (4xx, 5xx)
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data;

      this.logger.error(
        `Wallet service HTTP error: userId=${userId}, status=${status}, data=${JSON.stringify(data)}`,
      );

      // 4xx errors (client errors) - pass through
      if (status >= 400 && status < 500) {
        throw new HttpException(
          data || 'Wallet service rejected request',
          status,
        );
      }

      // 5xx errors (server errors) - wallet service is having issues
      if (status >= 500) {
        throw new ServiceUnavailableException(
          'Wallet service is experiencing issues',
        );
      }
    }

    // Unknown error
    this.logger.error(
      `Unknown wallet service error: userId=${userId}, error=${error.message}`,
      error.stack,
    );

    throw new ServiceUnavailableException(
      'Failed to communicate with wallet service',
    );
  }
}
