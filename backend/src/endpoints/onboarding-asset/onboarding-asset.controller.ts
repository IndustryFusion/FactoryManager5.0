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
