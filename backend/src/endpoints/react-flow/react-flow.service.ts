import { Injectable } from '@nestjs/common';
import { Model, ObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ReactFlowDto } from './dto/react-flow.dto';
import { FactorySite } from '../schemas/factory-site.schema';
@Injectable()
export class ReactFlowService {
  constructor(
    @InjectModel(FactorySite.name)
    private factoryModel: Model<FactorySite>,
  ) {}

  async create(data: ReactFlowDto) {
    try {
      let response = await this.factoryModel.findOne({factoryId: data.factoryId});
      if(!response) {
        const createdFactory = new this.factoryModel(data);
        return createdFactory.save();
      } else {
        return {
          "success": false,
          "status": 409,
          "message": "factoryId already exists"
        }
      }
      
    } catch(err) {
      throw err;
    }
  }

  async findOne(factoryId: string) {
    try {
      return await this.factoryModel.findOne({factoryId});
    }catch(err) {
      throw err;
    }
  }

  async findAll() {
    try {
      let result = await this.factoryModel.find({});
      return result;
    }catch(err) {
      throw err;
    }
  }

  async update(factoryId: string, data: ReactFlowDto) {
    try {
      const updatedUser = await this.factoryModel.updateOne({factoryId} , data, {
        new: true, 
      });
      console.log('updatedUser ',updatedUser);
      return updatedUser;
    } catch(err) {
      throw err;
    }
  }

  async remove(factoryId: string) {
    try {
      return await this.factoryModel.deleteOne({factoryId});
    } catch(err) {
      throw err;
    }
  }
}
