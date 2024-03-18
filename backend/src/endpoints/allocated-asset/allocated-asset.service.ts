import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AssetService } from '../asset/asset.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import { ReactFlowService } from '../react-flow/react-flow.service';

@Injectable()
export class AllocatedAssetService {
  constructor(
    private readonly factorySiteService: FactorySiteService,
    private readonly assetService: AssetService,
    private readonly shopFloorService: ShopFloorService,
    private readonly reactFlowService: ReactFlowService
  ) {}
  private readonly scorpioUrl = process.env.SCORPIO_URL;

  async create(token: string) {
    try{
      let hasAssetArr = [];
      let factoryData = await this.factorySiteService.findAll(token);
      for(let i = 0; i < factoryData.length; i++){
        let shopFloorIds = factoryData[i]['http://www.industry-fusion.org/schema#hasShopFloor'];
        console.log('shopFloorIds ', shopFloorIds);

        if (shopFloorIds && Array.isArray(shopFloorIds) && shopFloorIds.length > 0) {
          for (let i = 0; i < shopFloorIds.length; i++) {
            let id = shopFloorIds[i].object;
            if (id.includes('urn')) {
              let shopFloorData = await this.shopFloorService.findOne(id, token);
              console.log('shopFloorData ', shopFloorData);
              let hasAsset = shopFloorData['http://www.industry-fusion.org/schema#hasAsset'];
              if (hasAsset && Array.isArray(hasAsset) && hasAsset.length > 0) {
                hasAsset.forEach((data) => {
                  hasAssetArr.push(data.object);
                })
              } else if (hasAsset && hasAsset.object.includes('urn')) {
                hasAssetArr = [...hasAssetArr, hasAsset.object];
              }
            }
          }
        } else if (shopFloorIds && shopFloorIds.object.includes('urn')) {
          let shopFloorData = await this.shopFloorService.findOne(
            shopFloorIds.object,
            token,
          );
          console.log('shopFloorData ', shopFloorData);
          let hasAsset = shopFloorData['http://www.industry-fusion.org/schema#hasAsset'];
          console.log('hasAsset ', hasAsset);
          if (hasAsset && Array.isArray(hasAsset) && hasAsset.length > 0) {
            hasAsset.forEach((data) => {
              hasAssetArr.push(data.object);
            })
          } else if (hasAsset && hasAsset.object.includes('urn')) {
            hasAssetArr = [...hasAssetArr, hasAsset.object];
          }
        }
      }
      console.log('hasAssetArr ',hasAssetArr);
      if (hasAssetArr.length > 0) {
        let relationArr = [];
        for(let i = 0; i < hasAssetArr.length; i++){
          let id = hasAssetArr[i];
          let assetData = await this.assetService.getAssetDataById(id, token);
          for(let key in assetData){
            if(key.includes('has')){
              let relationData = assetData[key];
              if(Array.isArray(relationData) && relationData.length > 0){
                for(let j = 0; j < relationData.length; j++){
                  relationArr.push(relationData[j].object);
                }
              } else if(relationData.object.includes('urn')){
                relationArr.push(relationData.object);
              }
            }
          }
        }
        hasAssetArr = [...hasAssetArr, ...relationArr];
        const headers = {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/ld+json',
          'Accept': 'application/ld+json'
        };

        const data = {
          "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
          "id": "urn:ngsi-ld:allocated-assets-store",
          "type": "urn-holder",
          "http://www.industry-fusion.org/schema#last-data": {
            type: 'Property',
            object: hasAssetArr
          }
        };
        console.log('data ',data);
        let response = await axios.post(this.scorpioUrl, data, {headers});
        console.log('status ',response.status)
        console.log('statusText ',response.statusText)
        return {
          status: response.status,
          statusText: response.statusText
        }
      } else {
        return {
          status: true,
          statusText: 'No Allocated Assets Available'
        }
      }
    } catch(err){
      return err;
    }
  }
  
  async createGlobal(token: string) {
    try{
      let reactData = await this.reactFlowService.findAll();
      console.log('reactData ',reactData);
      let assetArr = [];
      for(let i = 0; i < reactData.length; i++){
        if(reactData[i].factoryData){
          let factoryData = reactData[i].factoryData['nodes'];
          factoryData.forEach(data => {
            if(data.id.startsWith('asset')){
              let assetId = data.id.split('_')[1];
              assetArr.push(assetId);
            }
          })
        }
      }
      console.log('assetArr ',assetArr);
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };

      const data = {
        "@context": "https://industryfusion.github.io/contexts/v0.1/context.jsonld",
        "id": "urn:ngsi-ld:global-allocated-assets-store",
        "type": "urn-holder",
        "http://www.industry-fusion.org/schema#last-data": {
          type: 'Property',
          object: assetArr
        }
      };
      console.log('data ',data);
      let response = await axios.post(this.scorpioUrl, data, {headers});
      console.log('status ',response.status)
      console.log('statusText ',response.statusText)
      return {
        status: response.status,
        statusText: response.statusText
      }
    }catch(err){
      return err;
    }
  }

  async findAll(token: string) {
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      //fetch the allocated assets from scorpio
      const fetchUrl = `${this.scorpioUrl}/urn:ngsi-ld:allocated-assets-store`;
      let response = await axios.get(fetchUrl, {
        headers
      });
      
      let assetIds = response.data["http://www.industry-fusion.org/schema#last-data"].object;
      let finalArray = [];
      if (Array.isArray(assetIds) && assetIds.length > 0) {
        for (let i = 0; i < assetIds.length; i++) {
          let id = assetIds[i];
          const assetData = await this.assetService.getAssetDataById(id, token);
          const finalData = {
            id,
            product_name: assetData['http://www.industry-fusion.org/schema#product_name'].value,
            asset_category: assetData['http://www.industry-fusion.org/schema#asset_category'].value
          };
          finalArray.push(finalData);
        }
      } else if(assetIds && assetIds.includes('urn')){
        const assetData = await this.assetService.getAssetDataById(assetIds, token);
        const finalData = {
          id: assetIds,
          product_name: assetData['http://www.industry-fusion.org/schema#product_name'].value,
          asset_category: assetData['http://www.industry-fusion.org/schema#asset_category'].value
        };
        finalArray.push(finalData);
      }
      return finalArray;
    } catch(err) {
      return err;
    }
  }

  async getAllocatedAssets(token: string) {
    try{
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      //fetch the allocated assets from scorpio
      const fetchUrl = `${this.scorpioUrl}/urn:ngsi-ld:global-allocated-assets-store`;
      let response = await axios.get(fetchUrl, {
        headers
      });
      
      return response.data["http://www.industry-fusion.org/schema#last-data"].object;
    } catch(err) {
      return err;
    }
  }

  async update(token: string) {
    try{
      let deleteResponse = await this.remove("urn:ngsi-ld:allocated-assets-store", token);
      if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
        let response =  await this.create(token);
        if(response['status'] == 200 || response['status'] == 201) {
          let globalResponse = await this.createGlobal(token); 
          return {
            status: globalResponse.status,
            data: globalResponse.data,
          };
        }
      }
    } catch(err) {
      return err;
    }
  }

  async updateGlobal(token: string) {
    try{
      let deleteResponse = await this.remove("urn:ngsi-ld:global-allocated-assets-store",token);
      if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
        let response =  await this.createGlobal(token);
        return {
          status: response.status,
          data: response.data,
        };
      }
    } catch(err) {
      return err;
    }
  }

  async remove(id:string, token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const updateUrl = `${this.scorpioUrl}/${id}`;
      let response =  await axios.delete(updateUrl, { headers });
      return {
        status: response.status,
        data: response.data,
      };
    } catch(err) {
      return err;
    }
  }
}