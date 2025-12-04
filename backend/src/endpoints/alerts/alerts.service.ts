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

import { Body, Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { AlertStatusDto } from './dto/alerta-status.dto';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class AlertsService {

  private readonly alertaUrl = process.env.ALERTA_URL;
  private readonly alertaKey = process.env.ALERTA_KEY;

  /**
  * Retrieves all alerts from scorpio.
  * @returns Returns an array of all alerts objects.
  * @throws {Error} Throws an error if there is a failure in fetching alerts from scorpio.
  * Expected behavior:
  * - Positive Test Case: Successful retrieval of assest with HTTP status code 200.
  * - Negative Test Case: NotFoundException thrown when endpoint is wrong with HTTP status code 404.
  * - Error Handling: Throws a NotFoundException in case of failure.
  */
  async findAll() {
    try {
      const headers = {
        Authorization: 'Key ' + this.alertaKey,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      let url = this.alertaUrl + '/alerts';
      const response = await axios.get(url, {headers});
      if (response.data) {
        return response.data;
      }
      else {
        throw new HttpException("Alerta fetch failed", HttpStatus.INTERNAL_SERVER_ERROR)
      }
      
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException({
          errorCode: `PG_${err.response.status}`,
          message: typeof err.response.data === "object" ? err.response.data.message : err.response.data
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "PG_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async findOne(id: string) {
    try {
      const headers = {
        Authorization: 'Key ' + this.alertaKey,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      let url = this.alertaUrl + '/alerts?resource=' + id;
      const response = await axios.get(url, {headers});
      return response.data;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException({
          errorCode: `PG_${err.response.status}`,
          message: typeof err.response.data === "object" ? err.response.data.message : err.response.data
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "PG_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async updateStatus(id: string, data: AlertStatusDto) {
    try {
      const headers = {
        Authorization: 'Key ' + this.alertaKey,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      let url = this.alertaUrl + '/alert/' + id + '/status';
      const response = await axios.put(url, data, {headers});
      return response.data;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else if (err.response) {
        throw new HttpException({
          errorCode: `PG_${err.response.status}`,
          message: typeof err.response.data === "object" ? err.response.data.message : err.response.data
        }, err.response.status);
      } else {
        throw new HttpException({
          errorCode: "PG_500",
          message: err.message
        }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
