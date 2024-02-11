import { Injectable } from '@nestjs/common';
import axios from 'axios';

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
}