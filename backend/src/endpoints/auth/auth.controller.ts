import { Controller, Post, Delete, Session, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('auth')
export class AuthController {

  @Post('login')
  getSession(@Session() session: Record<string, any>) {
    try {
        const token = {
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          sessionId: session.id
        };
        return Promise.resolve(token);
    } catch (err) {
      console.log('Login middleware err ',err);
      throw new err;
    }
  }
}
