import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.setGlobalPrefix('api');
  // Root welcome route (avoid 404 at /)
  const adapter = app.getHttpAdapter();
  adapter.get('/', (req: any, res: any) => {
    res.status(200).send({
      message: 'Mini Banking API is running',
      api: '/api',
      docs: 'Use /api/auth/login, /api/accounts/*, /api/transactions*',
    });
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
}

bootstrap();


