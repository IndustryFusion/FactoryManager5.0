import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cors({
    origin: ['http://192.168.49.155:31282', 'http://localhost:3002'],
    credentials: true, 
  }));
  app.use(cookieParser());
  app.use(
    session({
      secret: 'login_token', 
      resave: false,
      saveUninitialized: false,
    }),
  );
  await app.listen(4002);
}
bootstrap();
