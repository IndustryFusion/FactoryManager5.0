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
    origin: ['http://194.164.50.106:3001', 'http://localhost:3001'],
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
  await app.listen(4001);
}
bootstrap();
