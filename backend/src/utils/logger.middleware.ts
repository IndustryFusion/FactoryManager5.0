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

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  
    private logger = new Logger('HTTP');
  
    async use(req: Request, res: Response, next: Function) {
        const { method, originalUrl } = req;
        const userAgent = req.get('user-agent') || '';
        const start = Date.now();
        res.on('finish', () => {
            const { statusCode } = res;
            const contentLength = res.get('content-length');
            const responseTime = Date.now() - start;

            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${responseTime}ms`
            )
        });

        next();
    }
}