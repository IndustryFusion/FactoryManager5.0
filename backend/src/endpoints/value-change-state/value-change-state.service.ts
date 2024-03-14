import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ValueChangeStateService {
  private readonly timescaleUrl = process.env.TIMESCALE_URL;
  async findOne(queryParams: any, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token
      };
      const queryString = Object.keys(queryParams)
            .map(key => key + '=' + queryParams[key])
            .join('&').replace('#','%23');

      const url = 'https://development.industry-fusion.com/pgrest/value_change_state_entries'+ '?' + queryString;
      console.log('url ',url);
      const response = await axios.get(url, {headers});
      console.log('response ',response.data)
      if (response.data) {
        return response.data;
      } else {
        throw new NotFoundException('asset not found');
      }
    } catch(err) {
      throw new NotFoundException(
        `Failed to fetch repository data: ${err.message}`,
      );
    }
  }

}
