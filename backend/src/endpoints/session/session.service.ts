import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';


export const getSessionToken = async (req: Request): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log(req.headers['cookie']);
      let cookie = '';
      req.headers['cookie'].split('; ').forEach(pair => {
          const [key, value] = pair.split('=');
          // Store each key-value pair in the cookies object
          if(key == 'connect.sid' && value.includes('%3A')){
            cookie = value.split('%3A')[1].split('.')[0];
          }
          else if(key == 'connect.sid'){
            cookie = value;
          }
      });;

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