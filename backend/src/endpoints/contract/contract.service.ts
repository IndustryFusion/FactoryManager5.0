import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import axios from 'axios';

@Injectable()
export class ContractService {
  private readonly ifxUrl = process.env.IFX_PLATFORM_BACKEND_URL;

  async findByType(contract_type: string) {
    try {
      const response = await axios.get(`${this.ifxUrl}/contract/get-contract-by-type/${contract_type}`);
      return response.data;
    } catch(err) {
      throw new NotFoundException(`Failed to fetch contract by type ${contract_type}: ${err.message}`);
    }
  }
}
