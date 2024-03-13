import { Injectable, NotFoundException, HttpException } from '@nestjs/common';
import { Model, ObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ReactFlowDto } from './dto/react-flow.dto';
import { FactorySite } from '../schemas/factory-site.schema';
import { ShopFloorAssetsService } from '../shop-floor-assets/shop-floor-assets.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import { AssetService } from '../asset/asset.service';
import { error } from 'console';


@Injectable()
export class ReactFlowService {
  constructor(
    @InjectModel(FactorySite.name)
    private factoryModel: Model<FactorySite>,
    private readonly shopFloorAssetService : ShopFloorAssetsService,  private readonly shopFloorService : ShopFloorService,
    private readonly assetService : AssetService,

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

   
 async findFactoryAndShopFloors(factoryId: string, token: string): Promise<any> {
    try {
      const factoryData = await this.shopFloorService.findOne(factoryId, token);
      if (!factoryData) {
        throw new NotFoundException(`Factory with ID ${factoryId} not found`);
      }

      const result = {
        nodes: [],
        edges: [],
      };

      // Construct the factory node
      const factoryNode = {
        id: `factory-${factoryId}`,
        type: "factory",
        position: { x: 250, y: 70 },
        data: { label: "Factory", type: "factory", undeletable: true },
      };
      result.nodes.push(factoryNode);

      const shopFloorData = await this.shopFloorService.findAll(factoryId, token);
      for (const shopFloor of shopFloorData) {
        const shopFloorNode = {
          id: `shopFloor_${shopFloor.id}`,
          type: "shopFloor",
          position: { x: 150 + result.nodes.length * 250, y: 160 },
          data: { label: shopFloor["http://www.industry-fusion.org/schema#floor_name"]?.value, type: "shopFloor" },
          style: { backgroundColor: "#faedc4", border: "none" },
        };
        result.nodes.push(shopFloorNode);

        const edge = {
          id: `reactflow__edge-factory-${factoryId}-${shopFloorNode.id}`,
          source: `factory-${factoryId}`,
          target: `${shopFloorNode.id}`,
        };
        result.edges.push(edge);

        const assets = await this.shopFloorAssetService.findAll(shopFloor.id, token);
        for (const asset of assets) {
          await this.processAsset(asset, token, result, shopFloorNode.id); 
        }
      }

        const reactFlowData: ReactFlowDto = {
            factoryId: factoryId,
            factoryData: {
                nodes: result.nodes,
                edges: result.edges
            }
        };

        const existingFactoryData = await this.factoryModel.findOne({ factoryId }).exec();

        if (existingFactoryData) {
       
          await this.factoryModel.updateOne({ factoryId }, { $set: { 'factoryData.nodes': result.nodes, 'factoryData.edges': result.edges }}).exec();
          return {
              success: true,
              message: "Factory updated successfully with nodes and edges.",
              factoryId
          };
      } else {
       
          return await this.create(reactFlowData); 
      }
    } catch (err) {
      throw new HttpException(err.message, 500);
    }
  }

  async processAsset(asset, token, result, parentNodeId = null) {
    // Fetch asset data
    const assetData = await this.assetService.getAssetDataById(asset.id, token);
    // Generate a 4-digit unique code for the asset node
    const assetUniqueCode = Math.floor(1000 + Math.random() * 9000);

    // Create and add the asset node
    const assetNode = {
      id: `asset_${asset.id}_${assetUniqueCode}`,
      type: "asset",
      position: { x: 100 + result.nodes.length * 100, y: 220 },
      data: { label: assetData['http://www.industry-fusion.org/schema#product_name']?.value || "Asset", type: "asset" },
      style: { backgroundColor: "#caf1d8", border: "none" },
    };
    result.nodes.push(assetNode);

    // If parentNodeId is provided, create an edge from the parent node to this asset node
    if (parentNodeId) {
      const edgeToAsset = {
        id: `reactflow__edge-${parentNodeId}-${assetNode.id}`,
        source: parentNodeId,
        target: assetNode.id,
      };
      result.edges.push(edgeToAsset);
    }

    // Process each relationship of the asset
    for (const [key, value] of Object.entries(assetData)) {
      if (key.startsWith("http://www.industry-fusion.org/schema#has")) {
        const relationValue = value as any;
        if (relationValue.object && relationValue.object.startsWith("urn:")) {
            const relationUniqueCode = Math.floor(1000 + Math.random() * 9000);
          // Create and add the relation node
          const relationId = `relation_${key.split("#").pop()}_asset_${relationValue.object}_${relationUniqueCode}`;
          const relationNode = {
            id: relationId,
            type: "relation",
            position: { x: 100 + result.nodes.length * 100, y: 320 },
            data: { label: key.split("#").pop(), type: "relation" },
            style: { backgroundColor: "#ead6fd", border: "none", borderRadius: "45%" },
          };
          result.nodes.push(relationNode);

          // Create and add edge from the asset node to the relation node
          const edgeToRelation = {
            id: `reactflow__edge-asset_${relationId}`,
            source: assetNode.id,
            target: relationId,
          };
          result.edges.push(edgeToRelation);

          // Recursively process the related asset
          const relatedAsset = { id: relationValue.object };
          await this.processAsset(relatedAsset, token, result, relationId);
        }
      }
    }
  }
  
}
