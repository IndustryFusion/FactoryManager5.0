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

import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { FindIndexedDbAuthDto } from './dto/token.dto';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { CompactEncrypt } from 'jose';


/**
 * Retrieves tokens from the keylock service.
 * Returns access and refresh tokens.
 * @throws {Error} Throws an error if there is a invalid credentials.
 * Expected behavior:
 * - Positive Test Case: Successful retrieval of tokens with HTTP status code 200.
 * - Negative Test Case: Throws invalid credentials in case of failure.
 */
@Injectable()
export class AuthService {
    private readonly API_URL = process.env.API_URL;
    private readonly CLIENT_ID = process.env.CLIENT_ID;
    private readonly registryUrl = process.env.IFRIC_REGISTRY_BACKEND_URL;
    private readonly SECRET_KEY = process.env.JWT_SECRET_KEY!;
    private readonly MASK_SECRET = process.env.MASK_SECRET!;

  async login(username: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      const data = new URLSearchParams({
        'username': username,
        'password': password,
        'grant_type': 'password',
        'client_id': this.CLIENT_ID as string
      });
      const response = await axios.post(this.API_URL, data, {headers});
      if(response.data) {
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        return {
          accessToken,
          refreshToken
        }
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw new Error('Failed to fetch access token ' + error);
    }
  }

  async getIndexedData(data: FindIndexedDbAuthDto) {
    try {
      const routeToken = data.token
      const { m: maskedJwt } = jwt.verify(routeToken, this.SECRET_KEY) as { m: string };
      const registryJwt = this.unmask(maskedJwt, this.MASK_SECRET);
      const decoded = jwt.decode(registryJwt) as
        | { sub?: string; user?: string; iat?: number; exp?: number }
        | null;
    

      if (!decoded) {
        throw new HttpException('Cannot decode registryJwt', HttpStatus.UNAUTHORIZED);
      }

          const registryHeader = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${registryJwt}`,
          };
            const registryResponse = await axios.post(
        `${this.registryUrl}/auth/get-indexed-db-data`,
        {
          company_id:   decoded.sub,
          email:        decoded.user,
          product_name:data.product_name,
        },
        { headers: registryHeader },
      );

          if (registryResponse.data) {
            const encryptedToken = await this.encryptData(registryResponse.data.data.jwt_token);
            registryResponse.data.data.ifricdi = this.mask(encryptedToken, process.env.MASK_SECRET);
            registryResponse.data.data.jwt_token = registryJwt;
            return registryResponse.data;
          }
        }catch(err) {
          if (err instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedException('Token has expired');
          }
          if(err?.response?.status == 401) {
            throw new UnauthorizedException();
          }
          throw new NotFoundException(`Failed to fetch indexed data: ${err.message}`);
        }
      
  }

  private  mask(input: string, key: string): string {
    return input.split('').map((char, i) =>
      (char.charCodeAt(0) ^ key.charCodeAt(i % key.length)).toString(16).padStart(2, '0')
    ).join('');
  }

  private unmask(masked: string, key: string): string {
    if (!key) {
      throw new Error("Mask secret is not defined");
    }
    const bytes = masked.match(/.{1,2}/g)!.map((h) => parseInt(h, 16));
    return String.fromCharCode(
      ...bytes.map((b, i) => b ^ key.charCodeAt(i % key.length))
    );
  }
    
  deriveKey(secret: string): Uint8Array {
    const hash = createHash('sha256');
    hash.update(secret);
    return new Uint8Array(hash.digest());
  }
  async encryptData(data: string) {
    const encoder = new TextEncoder();
    const encryptionKey = await this.deriveKey(process.env.JWT_SECRET_KEY);

    const encrypted = await new CompactEncrypt(encoder.encode(data))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(encryptionKey);
    return encrypted;
  }
}