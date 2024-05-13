import { Injectable, NotFoundException, HttpException } from '@nestjs/common';
import { Model, ObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ReactFlowDto } from './dto/react-flow.dto';
import { FactorySite } from '../schemas/factory-site.schema';
import { ShopFloorAssetsService } from '../shop-floor-assets/shop-floor-assets.service';
import { ShopFloorService } from '../shop-floor/shop-floor.service';
import { AssetService } from '../asset/asset.service';
import { FactorySiteService } from '../factory-site/factory-site.service';
import { error } from 'console';


@Injectable()
export class ReactFlowService {
  constructor(
    @InjectModel(FactorySite.name)
    private factoryModel: Model<FactorySite>,
    private readonly shopFloorAssetService : ShopFloorAssetsService,  private readonly shopFloorService : ShopFloorService,
    private readonly assetService : AssetService,
    private readonly factorySiteService : FactorySiteService,

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
        const shopfloor = await this.shopFloorService.findAll(factoryId, token);
        const factoryData = await this.factorySiteService.findOne(factoryId, token);
        if (!shopfloor) {
            throw new NotFoundException(`Factory with ID ${factoryId} not found`);
        }

        const factoryName = factoryData['http://www.industry-fusion.org/schema#factory_name']?.value || "Factory";

        const result = {
            nodes: [],
            edges: [],
        };

        // Construct the factory node
        const factoryNode = {
            id: `factory_${factoryId}`,
            type: "factory",
            position: { x: 250, y: 70 },
            data: { label: factoryName, type: "factory", undeletable: true },
        };
        result.nodes.push(factoryNode);

        const shopFloorData = await this.shopFloorService.findAll(factoryId, token);
        let xOffset = 0; // Initial offset from the first shop floor node
        let yOffset = 0; // Vertical offset for assets, to move to the next row when needed
        const horizontalSpacing = 200; // Horizontal spacing between assets
        const verticalSpacing = 100; // Vertical s
        for (const shopFloor of shopFloorData) {
            const xPosition = 90 + xOffset; // Calculate x position with offset
            const shopFloorNode = {
                id: `shopFloor_${shopFloor.id}`,
                type: "shopFloor",
                position: { x: xPosition, y: 160 },
                data: { label: shopFloor["http://www.industry-fusion.org/schema#floor_name"]?.value, type: "shopFloor" },
                style: { backgroundColor: "#faedc4", border: "none" },
            };
            result.nodes.push(shopFloorNode);
            xOffset += 350; // Increment xOffset for next shop floor

            const edge = {
                id: `reactflow__edge-factory-${factoryId}-${shopFloorNode.id}`,
                source: `factory_${factoryId}`,
                target: `${shopFloorNode.id}`,
            };
            result.edges.push(edge);
            const assets = await this.shopFloorAssetService.findAll(shopFloor.id, token);
            let assetOffset = 0; // This offset will increment for each asset in the shop floor
            let assetCount = 0; // Counter to track the number of assets

            for (const asset of assets) {
                await this.processAsset(asset, token, result, shopFloorNode.id, 0, assetOffset);
                assetOffset += horizontalSpacing; // Increment the horizontal offset for the next asset
            }

            xOffset += 350; // Increment xOffset for next shop floor
         }
        
        const existingFactoryData = await this.factoryModel.findOne({ factoryId }).exec();
        const reactFlowData: ReactFlowDto = {
            factoryId: factoryId,
            factoryData: {
                nodes: result.nodes,
                edges: result.edges
            }
        };

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

async processAsset(asset, token, result, parentNodeId = null, depth = 0, siblingOffset = 0, yOffset = 0) {
    const assetData = await this.assetService.getAssetDataById(asset.id, token);
    const xOffsetStart = 40; // Starting X offset for assets
    const horizontalSpacing = 200; // Space between assets horizontally
    const verticalSpacing = 150; // Increased space between assets and relations vertically

    // Calculate the X and Y position for the asset node
    const xPos = xOffsetStart + (depth * horizontalSpacing) + siblingOffset ;
    const yPos = parentNodeId ? 280 + (depth * verticalSpacing) : 280 + yOffset;
    const assetNode = {
        id: `asset_${asset.id}_${new Date().getTime()}`,
        type: "asset",
        position: { x: xPos, y: yPos },
        data: {
            label: assetData['http://www.industry-fusion.org/schema#product_name']?.value || "Asset",
            type: "asset",
            id: asset.id,
        },
        style: { backgroundColor: "#caf1d8", border: "none" },
    };
    result.nodes.push(assetNode);

    if (parentNodeId) {
        const edgeToAsset = {
            id: `reactflow__edge-${parentNodeId}-${assetNode.id}`,
            source: parentNodeId,
            target: assetNode.id,
        };
        result.edges.push(edgeToAsset);
    }
    let newYPos = yPos + verticalSpacing; // Y position for relations is fixed below the asset

    // Determine horizontal start position for relations
    let relationXPos = xPos - (Object.keys(assetData).filter(key => key.includes('#has')).length - 1) * horizontalSpacing / 2;
    for (const [key, value] of Object.entries(assetData)) {
        if (key.startsWith("http://www.industry-fusion.org/schema#has")) {

      
            let relationValues = Array.isArray(value) ? value : [value];
            relationValues = relationValues.filter(rv => rv.object && rv.object.startsWith("urn:"));

            for (let i = 0; i < relationValues.length; i++) {
                const relationType = key.split("#").pop();
                const relationId = `relation_${relationType}_${Math.floor(100 + Math.random() * 900)}`;
                
                // For same assets, place relation nodes in the same x-axis
                const relationNode = {
                    id: relationId,
                    type: "relation",
                    position: { x: xPos+ relationXPos , y: newYPos }, // Keep same y-axis for relations of the same asset
                    data: { label: relationType, type: "relation" },
                    style: { backgroundColor: "#ead6fd", border: "none", borderRadius: "45%" },
                };
                result.nodes.push(relationNode);

                const edgeToRelation = {
                    id: `reactflow__edge-${assetNode.id}-${relationId}`,
                    source: assetNode.id,
                    target: relationId,
                };
                result.edges.push(edgeToRelation);

                const rv = relationValues[i];
                const relatedAsset = { id: rv.object }
                await this.processAsset(relatedAsset, token, result, relationId, depth + 1.5, xPos+ relationXPos, yPos + 2 * verticalSpacing);
                relationXPos += horizontalSpacing ;
            
            }
        }
    }
}

  
}
