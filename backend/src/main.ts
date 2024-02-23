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
    origin: [process.env.CORS_ORIGIN],
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
