import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import axios from 'axios';

@Injectable()
export class ContractService {
  private readonly ifxUrl = process.env.IFX_PLATFORM_BACKEND_URL;
  private readonly scorpioUrl = process.env.SCORPIO_URL;


  async findByType(contract_type: string) {
    try {
      const response = await axios.get(`${this.ifxUrl}/contract/get-contract-by-type/${contract_type}`);
      return response.data;
    } catch(err) {
      throw new NotFoundException(`Failed to fetch contract by type ${contract_type}: ${err.message}`);
    }
  }

  async findAllContractByAssetTypes(token: string) {
    try {
      const contractData = [];
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      let typeUrl = `${this.scorpioUrl}/urn:ngsi-ld:asset-type-store`;
      let typeData = await axios.get(typeUrl,{headers});
      let typeArr = typeData.data["http://www.industry-fusion.org/schema#type-data"].value.items.map(item => item.value);
      typeArr = Array.isArray(typeArr) ? typeArr : (typeArr !== "json-ld-1.1" ? [typeArr] : []);
      
      for(let i = 0; i < typeArr.length; i++) {
        let type = typeArr[i];
        const response = await axios.get(`${this.ifxUrl}/contract/get-contract-by-asset-type/${btoa(type)}`);
        if(response.data.length > 0) {
          contractData.push(...response.data);
        }
      }
      return contractData;
    } catch(err) {
      throw new NotFoundException(`Failed to fetch all contract by asset type: ${err.message}`);
    }
  }
}
