// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//   http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();
const templateSandboxUrl = process.env.TEMPLATE_SANDBOX_BACKEND_URL;

@Injectable()
export class MongodbTemplatesService {
  constructor() { }

  async getTemplates() {
    try {
      const response = await axios.get(`${templateSandboxUrl}/templates/mongo-templates`);
      return response.data;
    } catch (error) {
      throw new NotFoundException('Failed to fetch templates');
    }
  }

  async getTemplateById(id: string) {
    try {
      const response = await axios.get(`${templateSandboxUrl}/templates/mongo-templates/${id}`);
      return response.data;
    } catch (error) {
      throw new NotFoundException(`Template with ID ${id} not found` +  error);
    }
  }

  async getTemplateByMongoId(id: string) {
    try {
      const response = await axios.get(`${templateSandboxUrl}/templates/mongo-templates/mongo/${id}`);
      return response.data;
    } catch (error) {
      throw new NotFoundException(`Template with ID ${id} not found` +  error);
    }
  }

  async getTemplateByType(type: string) {
    try {
      const response = await axios.get(`${templateSandboxUrl}/templates/mongo-templates/type/${type}`);
      return response.data;
    } catch (error) {
      throw new NotFoundException(`Template with ID ${type} not found` +  error);
    }
  }
}
