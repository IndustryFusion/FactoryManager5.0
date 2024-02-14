import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';

export const getSessionToken = async (req: Request): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('Cookie',req.headers['cookie'].split('='))

      const cookie = req.headers['cookie'].split('=')[2];
      const sessionStore = req['sessionStore'];

      sessionStore.get(cookie, (err, sessionData) => {
        if (err) {
          reject(new NotFoundException('Session not found'));
        }
        console.log('seesion',sessionData)
        const token = sessionData['accessToken'];
        resolve(token);
      });
    });
  }