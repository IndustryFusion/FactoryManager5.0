import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import axios from 'axios';

@Injectable()
export class ContractService {
  private readonly ifxUrl = process.env.IFX_PLATFORM_BACKEND_URL;
  private readonly scorpioUrl = process.env.SCORPIO_URL;
  private readonly registryUrl = process.env.IFRIC_REGISTRY_BACKEND_URL;

  async findByType(contract_type: string) {
    try {
      const response = await axios.get(`${this.ifxUrl}/contract/get-contract-by-type/${contract_type}`);
      return response.data;
    } catch (err) {
      throw new NotFoundException(`Failed to fetch contract by type ${contract_type}: ${err.message}`);
    }
  }

  async findAllContractByAssetTypes(company_ifric_id: string, token: string, req: Request) {
    try {
      const contractData = [];
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      const registryHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': req.headers['authorization']
      };

      const companyData = await axios.get(`${this.registryUrl}/auth/get-company-details/${company_ifric_id}`, { headers: registryHeaders });
      if (!(companyData.data.length)) {
        return {
          status: 404,
          message: 'No company found with the provided ID'
        };
      }

      const response = await axios.get(`${this.registryUrl}/auth/get-owner-asset/${companyData.data[0]['_id']}`, { headers: registryHeaders });

      const typeArr = [];
      for (let i = 0; i < response.data.length; i++) {
        const assetId = response.data[i].asset_ifric_id;
        try {
          const scorpioResponse = await axios.get(`${this.scorpioUrl}/${assetId}`, { headers });
          console.log('scorpioResponseType', scorpioResponse.data.type);
          typeArr.push(scorpioResponse.data.type);
        } catch (err) {
          // console.log("Error fetching asset", i, err)
          continue;
        }
      }

      for (let i = 0; i < typeArr.length; i++) {
        let type = typeArr[i];
        const response = await axios.get(`${this.ifxUrl}/contract/get-contract-by-asset-type/${btoa(type)}`);
        if (response.data.length > 0) {
          contractData.push(...response.data);
        }
      }
      return contractData;
    } catch (err) {
      throw new NotFoundException(`Failed to fetch all contract by asset type: ${err.message}`);
    }
  }
}