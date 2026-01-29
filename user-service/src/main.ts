import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Read port from environment variable or default to 3002
  const port = process.env.PORT || 3002;

  await app.listen(port);
  console.log(`User Service running on port ${port}`);
}
bootstrap();
