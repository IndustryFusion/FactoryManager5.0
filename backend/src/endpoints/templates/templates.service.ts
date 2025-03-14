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

import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { TemplateDto } from './dto/template.dto';
import { TemplateDescriptionDto } from './dto/templateDescription.dto';
import axios from 'axios';

@Injectable()
export class TemplatesService {
  private readonly baseUrl = process.env.GITHUB_BASE_URL;
  private readonly token = process.env.GITHUB_TOKEN;

  /**
   * Retrieves templates from the server.
   * @returns {Promise<TemplateDto[]>} Returns an array of Template objects.
   * @throws {Error} Throws an error if there is a failure in fetching templates.
   * Expected behavior:
   * - Positive Test Case: Successful retrieval of templates with HTTP status code 200.
   * - Negative Test Case: NotFoundException thrown when templates not found.
   * - Error Handling: Throws a NotFoundException in case of failure.
   */
  async getTemplates(): Promise<TemplateDto[]> {
    try {
      const headers = {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      };

      const response = await axios.get(this.baseUrl, {
        headers,
      });

      const template: TemplateDto[] = [];

      if (response.data.length) {
        for (let i = 0; i < response.data.length; i++) {
          const name = response.data[i].name;
          const url = `${this.baseUrl}/${name}`;
          const value = await axios.get(url, {
            headers,
          });
          if (value.data.encoding === 'base64' && value.data.content) {
            // Decode Base64 content to UTF-8 string
            const decodedContent = Buffer.from(
              value.data.content,
              'base64',
            ).toString('utf-8');
            const parsedContent = JSON.parse(decodedContent);
            template.push({
              id: Buffer.from(parsedContent.$id).toString('base64'),
              title: parsedContent.title,
              description: parsedContent.description,
              templateId: parsedContent.properties['iffs:ifric_template_id'].default
            });
          }
        }
        return template;
      } else {
        throw new NotFoundException('templates not found');
      }
    } catch (err) {
      throw new Error(`Failed to fetch all templates: ${err.message}`);
    }
  }


  /**
   * Retrieves specific template from the server.
   * @returns {Promise<TemplateDescriptionDto[]>} Returns an array of specific Template objects.
   * @throws {Error} Throws an error if there is a failure in fetching template.
   * Expected behavior:
   * - Positive Test Case: Successful retrieval of template with HTTP status code 200.
   * - Negative Test Case: NotFoundException thrown when path not found, template not found with HTTP status code 404.
   * - Error Handling: Throws a NotFoundException in case of failure.
   */
  async getTemplateById(id: string): Promise<TemplateDescriptionDto[]> {
    try {
      const decodedId = Buffer.from(id, 'base64').toString('ascii');
      let path = decodedId.split('/').pop();
      
      if (path) {
        path = `${path.replace(/-/g, '_')}_schema.json`;
        const url = `${this.baseUrl}/${path}`;
        const templateDescriptions: TemplateDescriptionDto[] = [];

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
          const parsedContent = JSON.parse(decodedContent);
          templateDescriptions.push({
            type: parsedContent.$id,
            title: parsedContent.title,
            description: parsedContent.description,
            properties: parsedContent.properties,
          });
        }
        return templateDescriptions;
      } else {
        throw new NotFoundException('Path is undefined');
      }
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

  async getTemplateByName(name: string): Promise<TemplateDescriptionDto[]> {
    try {

      const fileName = `${name}.json`;
      const url = `${this.baseUrl}/${fileName}`;
      const templateDescriptions: TemplateDescriptionDto[] = [];
      const headers = {
        'Authorization': 'Bearer ' + this.token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      };

      const response = await axios.get(url, {
        headers
      });

      if (response.data.encoding === 'base64' && response.data.content) {
        // Decode Base64 content to UTF-8 string
        const decodedContent = Buffer.from(
          response.data.content,
          'base64',
        ).toString('utf-8');
        const parsedContent = JSON.parse(decodedContent);
        templateDescriptions.push({
          type: parsedContent.$id,
          title: parsedContent.title,
          description: parsedContent.description,
          properties: parsedContent.properties,
        });
      }
      return templateDescriptions;
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

  async getContractTemplateById(id: string) {
    try {
      const decodedId = Buffer.from(id, 'base64').toString('ascii');
      console.log("decodedId ",decodedId);
      const templateDescriptions: TemplateDescriptionDto[] = [];
      const headers = {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      };
      
      const response = await axios.get(this.baseUrl, {
        headers,
      });
      console.log("response ",response.data);
      if (response.data.length) {
        for(let i = 0; i < response.data.length; i++) {
          const name = response.data[i].name;
          const url = `${this.baseUrl}/${name}`;
          const value = await axios.get(url, {
            headers,
          });
          if (value.data.encoding === 'base64' && value.data.content) {
            // Decode Base64 content to UTF-8 string
            const decodedContent = Buffer.from(
              value.data.content,
              'base64',
            ).toString('utf-8');
            const parsedContent = JSON.parse(decodedContent);
            if(parsedContent.$id === decodedId) {
              templateDescriptions.push({
                type: parsedContent.$id,
                title: parsedContent.title,
                description: parsedContent.description,
                properties: parsedContent.properties,
              });
              break;
            }
          }
        }
      }
      return templateDescriptions;
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

  async findContractByTemplates() {
    try {
      const headers = {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      };
      const result = [];
      const response = await axios.get(this.baseUrl, {
        headers,
      });
      if (response.data.length) {
        for(let i = 0; i < response.data.length; i++) {
          const name = response.data[i].name;
          const url = `${this.baseUrl}/${name}`;
          const value = await axios.get(url, {
            headers,
          });
          if (value.data.encoding === 'base64' && value.data.content) {
            // Decode Base64 content to UTF-8 string
            const decodedContent = Buffer.from(
              value.data.content,
              'base64',
            ).toString('utf-8');
            const parsedContent = JSON.parse(decodedContent);
            try {
              // const contractData = await this.contractModel.find({asset_type: parsedContent.properties.asset_type.default});
              let flag = false;

              // check whether the asset type already exists, if yes then add contract name with it.
              result.forEach(value => {
                const key = Object.keys(value)[0];
                const assetType = parsedContent.properties.asset_type.default.split("/").pop();
                if (key === assetType) {
                  value[key] = [...value[key], name.split(".")[0]];
                  flag = true;
                }
              })

              if(!flag) {
                result.push({[parsedContent.properties.asset_type.default.split("/").pop()]: [name.split(".")[0]]});
              }
            } catch(err) {
              throw new InternalServerErrorException(err.message);
            }
          }
        }
      }
      return result;
    } catch(err) {
      throw new NotFoundException(`Failed to fetch contract by templates: ${err.message}`);
    }
  }
}
