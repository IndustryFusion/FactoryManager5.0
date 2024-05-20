// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 


import { Request } from 'express';

export const getSessionToken = async (req: Request) => {
  try{
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
    });
    const sessionStore = req['sessionStore'];
    const sessionData = await new Promise((resolve, reject) => {
      sessionStore.get(cookie, (err, data) => {
          if (err) {
            reject(err); 
          } else {
            resolve(data); 
          }
      });
    });
    const token = sessionData['accessToken'];
    return token;
  }catch(err){
    return err;
  }
}

export const getCronToken = async (req: Request) => {
  let sessionStore = req['sessionStore'].sessions;
  const firstValue = JSON.parse(Object.values(sessionStore)[0] as string);
  return firstValue.accessToken;
}