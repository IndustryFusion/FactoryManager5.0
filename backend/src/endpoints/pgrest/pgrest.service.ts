import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PgRestService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;

  create() {
    return 'This action adds a new factoryManager';
  }

  async findAll(token : string, queryParams: any) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };

      const queryString = Object.keys(queryParams)
            .map(key => key + '=' + queryParams[key])
            .join('&').replace('#','%23');

      const url = this.timescaleUrl + '?' + queryString;

      const response = await axios.get(url, {headers});
      if(response.data) {
        return response.data;
      } else {
        throw new NotFoundException('asset not found');
      }
    } catch(err) {
      throw new NotFoundException(`Failed to fetch repository data: ${err.message}`);
    }
  }

  findOne(id: string) {
    return `This action returns a #${id} factoryManager`;
  }

  update(id: string) {
    return `This action updates a #${id} factoryManager`;
  }

  remove(id: string) {
    return `This action removes a #${id} factoryManager`;
  }
}
