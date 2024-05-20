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

import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as YAML from 'js-yaml';

@Injectable()
export class OnboardingAssetService {
  private readonly gatwayUrl = process.env.GATEWAY_BASE_URL;
  private readonly token = process.env.GATEWAY_TOKEN;

  async create(data: any) {
    try {
      let fileName = `${data['device_id']}.yaml`;
      const fileContent = YAML.dump(data);
      const headers = {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      };
      let url = this.gatwayUrl + '/' + fileName;
      const response = await axios.put(url,
        {
          message: 'Add new file',
          content: Buffer.from(fileContent).toString('base64'),
        },
        { headers }
      );
      if(response.data){
        return {
          "success": true,
          "status": 201,
          "message": "Added To GitHub Successfully"
        }
      }
    }catch(err){
      if (err.response && err.response.status === 422) {
        return {
          "success": false,
          "status": 422,
          "message": "File already exist"
        }
      } else {
        throw err;
      }
    }
  }

  async findOne(id: string) {
    try {
      let name = `${id}.yaml`;
      const url = `${this.gatwayUrl}/${name}`;
      const headers = {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      };
      const response = await axios.get(url, {
        headers,
      });
      if (response.data.encoding === 'base64' && response.data.content) {
        // Decode Base64 content to UTF-8 string
        const decodedContent = Buffer.from(
          response.data.content,
          'base64',
        ).toString('utf-8');
        const parsedContent = YAML.load(decodedContent);
        return parsedContent;
      }
    } catch (err) {
              throw new NotFoundException(
          `Failed to fetch repository data: ${err.message}`,
        );
          }
  }

  async update(id: string, data: any) {
    try {
      let fileName = `${id}.yaml`;
      const fileContent = YAML.dump(data);
      const headers = {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      };
      let url = this.gatwayUrl + '/' + fileName;

      // Retrieve existing file content
      const getResponse = await axios.get(url, { 
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3', // Specify raw content
        } 
      });

      const response = await axios.put(url,
        {
          message: 'updat file coontent',
          content: Buffer.from(fileContent).toString('base64'),
          sha: getResponse.data.sha
        },
        { headers }
      );
      if(response.data){
        return {
          "success": true,
          "status": 204,
          "message": "Updated Successfully"
        }
      }else {
        return response;
      }
    }catch(err){
      throw err;
    }
  }
}
