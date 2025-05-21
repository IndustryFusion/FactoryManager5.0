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
import { Onboarding } from '../schemas/onboarding.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class OnboardingAssetService {

  constructor(
    @InjectModel(Onboarding.name, 'factory')
    private onboardingModel: Model<Onboarding>,
  ) { }

  async create(data: OnboardingDto) {
    try {
      const onbaordDevice = await this.onboardingModel.findOne({ device_id: data.device_id }).exec();
      if (onbaordDevice) {
        return {
          "success": false,
          "status": 409,
          "message": "Device already exists"
        }
      }
      const newOnboard = new this.onboardingModel(data);
      newOnboard.save();
      return {
        "success": true,
        "status": 201,
        "message": "Created Successfully"
      }
    } catch (err) {
      throw err;
    }
  }

  async findOne(id: string) {
    try {
      const onbaordDevice = await this.onboardingModel.findOne({ device_id: id }).exec();
      if (!onbaordDevice) {
        throw new NotFoundException(`Device with id ${id} not found`);
      }
      return onbaordDevice;
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch onboarding data: ${err.message}`,
      );
    }
  }

  async update(id: string, data: OnboardingDto) {
    try {
      const onbaordDevice = await this.onboardingModel.findOne({ device_id: id }).exec();
      if (!onbaordDevice) {
        throw new NotFoundException(`Device with id ${id} not found`);
      }

      const updatedDevice = await this.onboardingModel.findOneAndUpdate(
        { device_id: id },
        data
      ).exec();

      return {
        "success": true,
        "status": 204,
        "message": "Updated Successfully"
      }
      
    } catch (err) {
      throw err;
    }
  }

  async findOneByIp(id: string) {
    try {
      const onbaordDevice = await this.onboardingModel.findOne({ ip_address: id }).exec();
      if (!onbaordDevice) {
        throw new NotFoundException(`Device with IP ${id} not found`);
      }
      return onbaordDevice;
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch onboarding data: ${err.message}`,
      );
    }
  }

}
