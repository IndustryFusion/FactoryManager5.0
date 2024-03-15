import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AssetService } from '../asset/asset.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';

@Injectable()
export class AllocatedAssetService {
  constructor(
    private readonly factorySiteService: FactorySiteService,
    private readonly assetService: AssetService,
    private readonly shopFloorService: ShopFloorService,
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
            product_name: assetData['http://www.industry-fusion.org/schema#product_name']?.value,
            asset_category: assetData['http://www.industry-fusion.org/schema#asset_category']?.value
          };
          finalArray.push(finalData);
        }
      } else if(assetIds && assetIds.includes('urn')){
        const assetData = await this.assetService.getAssetDataById(assetIds, token);
        const finalData = {
          id: assetIds,
          product_name: assetData['http://www.industry-fusion.org/schema#product_name']?.value,
          asset_category: assetData['http://www.industry-fusion.org/schema#asset_category']?.value
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
      const fetchUrl = `${this.scorpioUrl}/urn:ngsi-ld:allocated-assets-store`;
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
      let deleteResponse = await this.remove(token);
      if(deleteResponse['status'] == 200 || deleteResponse['status'] == 204) {
        let response =  await this.create(token);
        return {
          status: response.status,
          data: response.data,
        };
      }
    } catch(err) {
      return err;
    }
  }

  async remove(token: string) {
    try {
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/ld+json',
        'Accept': 'application/ld+json'
      };
      const updateUrl = `${this.scorpioUrl}/urn:ngsi-ld:allocated-assets-store`;
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