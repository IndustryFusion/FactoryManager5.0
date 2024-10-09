import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UpdateBindingDto } from './dto/update-binding.dto';
import axios from 'axios';

@Injectable()
export class BindingService {
  private readonly ifxUrl = process.env.IFX_PLATFORM_BACKEND_URL;
  async create(data: CreateBindingDto) {
    try {
      const response = await axios.post(`${this.ifxUrl}/binding`, data);
      return response.data;
    } catch(err) {
      throw new InternalServerErrorException(`Failed to create binding: ${err.message}`);
    }
  }
}
