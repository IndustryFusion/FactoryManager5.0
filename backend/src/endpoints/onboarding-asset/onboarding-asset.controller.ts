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

import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException } from '@nestjs/common';
import { OnboardingAssetService } from './onboarding-asset.service';

@Controller('onboarding-asset')
export class OnboardingAssetController {
  constructor(private readonly onboardingAssetService: OnboardingAssetService) {}

  @Post()
  create(@Body() data) {
    try{
      let response = this.onboardingAssetService.create(data);
      if(response['status'] == 200 || response['status'] == 201) {
        return {
          success: true,
          status: response['status'],
          message: response['message']
        }
      } else {
        return response;
      }
    }catch(err){
      return { 
        success: false,
        message: err
      };
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    try {
      return this.onboardingAssetService.findOne(id);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Get('/ip/:id')
  findOneByIp(@Param('id') id: string) {
    try {
      return this.onboardingAssetService.findOneByIp(id);
    } catch (err) {
      throw new NotFoundException();
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data) {
    try{
      let response = this.onboardingAssetService.update(id, data);
      if(response['status'] == 200 || response['status'] == 204) {
        return {
          success: true,
          status: response['status'],
          message: response['message']
        }
      } else{
        return response;
      }
    }catch(err){
      throw new Error('failed to update speecific file ' + err);
    }
  }
}
