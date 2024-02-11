import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';

export const getSessionToken = async (req: Request): Promise<string> => {
    return new Promise((resolve, reject) => {

      const cookie = req.headers['cookie'].split('%3A')[1].split('.')[0];
      const sessionStore = req['sessionStore'];

      sessionStore.get(cookie, (err, sessionData) => {
        if (err) {
          reject(new NotFoundException('Session not found'));
        }
        const token = sessionData['accessToken'];
        resolve(token);
      });
    });
  }