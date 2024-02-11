import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service'


@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  /**
   * Middleware responsible for handling user session tokens.
   * On receiving valid login credentials, it fetches access and refresh tokens
   * from the keyclock service and sets them in the user's session.
   */
  async use(req: Request & { session: any }, res: Response, next: Function) {

    const username = req.body.username;
    const password = req.body.password;
    try {
      const response = await this.authService.login(username, password);
      if(response.accessToken) {
        req.session.accessToken = response.accessToken;
        req.session.refreshToken = response.refreshToken;
      } else {
        throw new Error('Invaid Credentials');
      }
    } catch (error) {
      throw new Error('Failed ' + error.message);
    }

    next();
  }
}