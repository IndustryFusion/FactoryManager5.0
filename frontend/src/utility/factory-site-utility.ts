// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import axios from "axios";
import { Factory } from "@/types/factory-type";
import { Asset } from "@/types/asset-types";
import { MdQueryBuilder } from "react-icons/md";
import html2canvas from "html2canvas";
import { AllocatedAssets } from "@/types/asset-types";
import { getAccessGroup } from "./indexed-db";
import api from "./jwt";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

/**
 * Uploads a file to the server.
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} The URL of the uploaded file on success.
 * @throws {Error} Throws an error if the upload fails.
 */

export interface ShopFloorProperty {
  type: string;
  value: string;
  observedAt: string;
}

export interface ShopFloorRelationship {
  type: string;
  object: string;
}

export interface ShopFloorResponse {
  id: string;
  type: string;
  "http://www.industry-fusion.org/schema#floor_name": ShopFloorProperty;
  "http://www.industry-fusion.org/schema#type_of_floor": ShopFloorProperty;
  "@context": string[];
}

export interface FactoryResponse {
  id: string;
  type: string;
  "http://www.industry-fusion.org/schema#hasShopFloor": ShopFloorRelationship[];
  "@context": string[];
}

export interface TransformedShopFloor {
  id: string;
  floorName: string;
  type_of_floor: string;
}
interface RelationshipDetail {
  type: string;
  object: string[];
  class?: string;
}



type ExtractedRelations = Record<
  string,
  { type: "Relationship"; segment: "component"; objects?: string[], product_type?: string; relationship_type?:string }
>;

export const handleUpload = async (file: File): Promise<string> => {
  const uploadData = new FormData();
  uploadData.append("file", file);

  try {
    const response = await axios.post(API_URL + "/file", uploadData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    if (response.status === 201) {
      return response.data;
    } else {
      throw new Error("Failed to upload file");
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Fetches the list of factories and assets from the server.
 * @returns {Promise<any>} The fetched factories and assets.
 * @throws {Error} Throws an error if fetching fails.
 */
export const fetchFactoriesAndAssets = async () => {
  try {
    const response = await axios.get(API_URL + "/factory-site", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    return response;
  } catch (error) {
    console.error("Error fetching factories and assets", error);
    return null;
  }
};

/**
 * Fetches details of a specific factory.
 * @param {string} factoryId - The ID of the factory to fetch.
 * @returns {Promise<any>} The fetched factory details.
 * @throws {Error} Throws an error if fetching fails.
 */
export async function fetchFactoryDetails(factoryId: string) {
  try {
    const response = await axios.get(`${API_URL}/factory-site/${factoryId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching factory details:", error);
    throw error;
  }
}

/**
 * Updates data for a specific factory.
 * @param {Factory} dataToUpdate - The updated factory data.
 * @param {string} factoryId - The ID of the factory to update.
 * @throws {Error} Throws an error if the update fails.
 */
export async function updateFactoryData(
  dataToUpdate: Factory,
  factoryId: string
) {
  try {
    const transformedData = transformDataForBackend(dataToUpdate);
    await axios.patch(`${API_URL}/factory-site/${factoryId}`, transformedData, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
  
  } catch (error) {
    console.error("Error updating factory:", error);
    throw error; // Rethrow to handle in component
  }
}

/**
 * Deletes a specific factory.
 * @param {Factory} factoryToDelete - The factory to delete.
 * @throws {Error} Throws an error if the deletion fails.
 */
export const deleteFactory = async (factoryToDelete: Factory) => {
  try {
    await axios.delete(API_URL + `/factory-site/${factoryToDelete.id}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
  } catch (error) {
    console.error("Error deleting factory", error);
  }
};

/**
 * Transforms factory data to the format expected by the backend.
 * @param {Factory} factoryData - The factory data to transform.
 * @returns {any} The transformed data.
 */
export const transformDataForBackend = (factoryData: Factory) => {
  interface TransformedData {
    [key: string]:
    | {
      type: string;
      value: string;
    }
    | string;
  }

  const transformedData: TransformedData = {};

  Object.entries(factoryData).forEach(([key, value]) => {
    transformedData[`http://www.industry-fusion.org/schema#${key}`] = {
      type: "Property",
      value: value,
    };
  });

  return transformedData;
};

/**
 * Updates a factory's data on the server.
 * @param {Factory} factoryToUpdate - The factory data to update.
 * @param {string} id - The ID of the factory to update.
 * @throws {Error} Throws an error if the update fails.
 */
export const updateFactory = async (factoryToUpdate: Factory, id: string) => {
  const response = await axios.patch(
    `${API_URL}/factory-site/${id}`,

    factoryToUpdate,

    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    }
  );

  if (response.status == 200 || response.status == 204) {
    return response.data;
  } else {
    console.error("Unexpected response status:", response.status);
  }
};

const flattenData = (data: any): any => {
  const newItem: any = {};
  Object.keys(data).forEach((key) => {
    if (key.includes("http://www.industry-fusion.org/schema#")) {
      const newKey = key.replace("http://www.industry-fusion.org/schema#", "");

      newItem[newKey] =
        data[key].type === "Property" ? data[key].value : data[key];
    } else if (!key.startsWith("http") && !key.startsWith("@")) {
      newItem[key] = data[key];
    }
  });
  return newItem;
};

export const getShopFloors = async (factoryId: string) => {
  const response = await axios.get(`${API_URL}/shop-floor/${factoryId}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    withCredentials: true,
  });
  const mappedData = flattenData(response.data);

  return mappedData;
};


export const getshopFloorById = async (factoryId: string) => {

  const response = await axios.get(`${API_URL}/shop-floor/${factoryId}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    withCredentials: true,

    params: { id: factoryId },
  });
  console.log("response 5545454",response)
  return response.data;
};

export const getNonShopFloorAsset = async (factoryId: string) => {
  const data = await getAccessGroup()
  const company_ifric_id = data.company_ifric_id;
  try {
    const response = await api.get(
      `${API_URL}/non-shop-floor-assets/${company_ifric_id}/${factoryId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
     console.log("Error fetching non-shop-floor assets", error);
  }
};

export const getNonShopFloorAssetDetails = async (assetId: string) => {
  try {
    const response = await axios.get(`${API_URL}/asset/get-asset-by-id/${assetId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching non-shop-floor assets", error);

    throw error;
  }
};

export const fetchAsset = async () => {
  try {
    const response = await axios.get(API_URL + "/asset", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    const responseData = response.data;
    const mappedData = mapBackendDataToAsset(responseData);
    return mappedData;
  } catch (error) {
    console.error("Error:", error);
  }
};
const mapBackendDataToAsset = (backendData: any[]): Asset[] => {
  return backendData.map((item: any) => {
    const newItem: any = {};
    Object.keys(item).forEach((key) => {
      if (key.includes("/")) {
        const newKey = key.split('/').pop() || '';
        newItem[newKey] = item[key].type === "Property" ? item[key].value : item[key];
      } else {
        newItem[key] = item[key];
      }
    });
    return newItem;
  });
};

export const exportElementToJPEG = async (
  element: any,
  filename = "download.jpeg"
) => {
  if (!element) {
    console.error("Element not provided for export");
    return;
  }

  try {
    // html2canvas to take a screenshot of the element
    const canvas = await html2canvas(element, {});
    const image = canvas.toDataURL("image/jpeg");

    // Create a temporary link element to trigger the download
    const link = document.createElement("a");
    link.href = image;
    link.download = filename;

    // Append the link to the document, trigger the download, then remove the link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("Error exporting element to JPEG:", error);
  }
};

export const checkShopFloorsForSaveDisable = (
  currentShopFloors: string[],
  backendShopFloors: string[]
): boolean => {
  return currentShopFloors.every((shopFloor) =>
    backendShopFloors.includes(shopFloor)
  );
};

export const fetchAndDetermineSaveState = async (
  factoryId: string,
  nodes: any[],
  setIsSaveDisabled: React.Dispatch<React.SetStateAction<boolean>>,
  API_URL: any
) => {
  try {
    const response = await axios.get(`${API_URL}/react-flow/${factoryId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    const fetchedFactoryId = response.data.factoryId;

    if (factoryId === fetchedFactoryId) {
      setIsSaveDisabled(true);
    } else {
      setIsSaveDisabled(false);
    }
  } catch (error) {
    console.error("Error fetching factory data:", error);
  }
};

export async function deleteShopFloorById(
  shopFloorId: string,
  factoryId: string
): Promise<void> {
  try {
    await axios.delete(`${API_URL}/shop-floor/${shopFloorId}`, {
      params: {
        "factory-id": factoryId,
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
  } catch (error) {
    throw new Error("Failed to delete shop floor");
  }
}

export async function getShopFloorAndAssetData(factoryId: string) {
  try {
    const factoryDataResponse = await axios.get(
      `${API_URL}/factory-site/${factoryId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      }
    );
    const factoryData = factoryDataResponse.data;
    const shopFloorId =
      factoryData["http://www.industry-fusion.org/schema#hasShopFloor"]?.object;

    const shopFloorDataResponse = await axios.get(
      `${API_URL}/shop-floor/${shopFloorId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      }
    );
    const shopFloorData = shopFloorDataResponse.data;

    // Normalize the assetId to always be an array
    let assetIds =
      shopFloorData["http://www.industry-fusion.org/schema#hasAsset"]?.object;
    assetIds = Array.isArray(assetIds) ? assetIds : [assetIds]; // Ensure assetIds is always an array

    let assetsData = [];
    if (assetIds && assetIds.length > 0) {
      // Fetch data for all assetIds
      const assetDataPromises = assetIds.map((assetId: any) =>
        axios.get(`${API_URL}/asset/get-asset-by-id/${assetId}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        })
      );
      const assetsResponses = await Promise.all(assetDataPromises);
      assetsData = assetsResponses.map((response) => response.data);
    }

    return { shopFloorId, assetIds, assetsData };
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}


function humanizeIRI(value?: string): string | undefined {
  if (!value) return undefined;
  const last = (value.split(/[\/#]/).filter(Boolean).pop() || value)
    .replace(/[_-]+/g, " ")
    // split camelCase & ALLCAPSNextWord
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  return last
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
const segVal = (x: any) => (x && typeof x === "object" ? x.value : undefined);
const SEGMENT_IRI = "https://industry-fusion.org/base/v0.1/segment";
const PRODUCT_TYPE_IRI = "https://industry-fusion.org/base/v0.1/relationship";
const CLASS_TYPE_IRI ="https://industry-fusion.org/base/v0.1/class";
const RELATIONSHIP_TYPE_IRI = "https://industry-fusion.org/base/v0.1/relationship_type";
export const relationToAssetCategory = (relationName: string) => {
  const token = relationName
    .replace(/^has[_-]?/i, "")           
    .replace(/_/g, " ")                   
    .replace(/([a-z])([A-Z])/g, "$1 $2")  
    .trim()
    .replace(/\s+/g, " ");               

  const title = token.replace(/\b\w/g, c => c.toUpperCase());
  return `${title}`;
};

export function extractHasRelations(assetData: { [key: string]: any }): ExtractedRelations {
  const entity = (assetData && (assetData as any).data) || assetData; 
  const out: ExtractedRelations = {};

  for (const [key, value] of Object.entries(entity)) {
    if (!key.includes("/") || !value || typeof value !== "object") continue;


    // segment === "component"
    const segment = segVal((value as any)[SEGMENT_IRI]);
    if (String(segment || "").toLowerCase() !== "component") continue;

    const cleanedKey = key.split("/").pop() || key;


    const rawObj = (value as any).object;

    let objects: string[] | undefined;

    if (Array.isArray(rawObj)) {
      objects = rawObj
        .map((o) => (typeof o === "string" ? o : o?.id ?? o?.object ?? undefined))
        .filter((v): v is string => !!v && v !== "NULL");
    } else if (typeof rawObj === "string" && rawObj !== "NULL") {
      objects = [rawObj];
    }

    let product_type: string | undefined;
    const pt = (value as any)[PRODUCT_TYPE_IRI];
    if (pt && typeof pt === "object") {
      const rawPT = segVal(pt) || (typeof pt.value === "string" ? pt.value : undefined);
      product_type = humanizeIRI(rawPT);
    }
    
    let relationship_type: string | undefined;
    const pt1 = (value as any)[RELATIONSHIP_TYPE_IRI];
    if (pt1 && typeof pt1 === "object") {
      const rawPT = segVal(pt1) || (typeof pt1.value === "string" ? pt1.value : undefined);
      relationship_type = rawPT;
    }

    let relation_class: string | undefined;
    const cls = (value as any)[CLASS_TYPE_IRI];
    if (cls && typeof cls === "object" && typeof cls.value === "string") {
      relation_class = cls.value;
    }
    out[cleanedKey] = {
      type: "Relationship",
      segment: "component",
      ...(product_type ? { product_type } : {}),
      ...(relation_class ? { class: relation_class } : {}),
      ...(objects && objects.length ? { objects } : {}),
      ...(relationship_type ? { relationship_type } : {}),
    };
  }
  console.log("out",out)
  return out;
}
export const saveFlowchartData = async (
  factoryId: string,
  nodes: [],
  edges: []
) => {
  const payload = {};
  try {
    const response = await axios.post(`${API_URL}/react-flow`, payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error saving flowchart:", error);
    throw error;
  }
};

export const getAssetRelationById = async (assetId: string) => {
  try {
    const response = await axios.get(API_URL + "/asset/get-asset-by-id/" + `${assetId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    const responseData = response.data;
    console.log("responseData",responseData)
    const mappedData = extractHasRelations(responseData);
    return mappedData;
  } catch (error) {
    console.error("Error:", error);
  }
};


export const getAssetById = async(assetId: string) =>{
  try {
    const response = await axios.get(API_URL + "/asset/get-asset-by-id/" + `${assetId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    const responseData = response.data;
    return responseData;
  } catch (error) {
    console.error("Error:", error);
  }
}

export const fetchAllocatedAssets = async (factoryId: string) => {
  try {
    const response = await axios.get(`${API_URL}/allocated-asset/${factoryId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching allocated assets:", error);
    throw new Error("Failed to fetch allocated assets");
  }
};

export const fetchAllAllocatedAssets = async () => {
  try {
    const response = await axios.get(`${API_URL}/allocated-asset/product-names`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    console.log("response allocated assets",response)
    return response.data;
  } catch (error) {
    console.error("Error fetching all allocated assets:", error);
    throw new Error("Failed to fetch allocated assets");
  }

}


export const fetchAssetDetailById = async(assetId:string)=>{
  try {
    const response = await axios.get(API_URL + "/asset/" + `${assetId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    const responseData = response.data;
    const productKey = Object.keys(responseData).find(key => key.includes("product_name"));
    const assetCategoryKey = Object.keys(responseData).find(key => key.includes("asset_category"));
    const mappedData = {
      id: responseData.id, 
      product_name: productKey ? responseData[productKey]?.value : undefined,
      asset_category: assetCategoryKey ? responseData[assetCategoryKey]?.value : undefined,
    
    };
    return mappedData;
  
  } catch (error) {
    console.error("Error:", error);
  }
}

export async function getShopFloorAssets(shopFloorId: string) {
  try {
    const shopFloorDataResponse = await axios.get(
      `${API_URL}/shop-floor/${shopFloorId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      }
    );
    const shopFloorData = shopFloorDataResponse.data;

    // Normalize the assetId to always be an array
    const hasAsset = shopFloorData["http://www.industry-fusion.org/schema#hasAsset"]
    let assetIds =
    Array.isArray(hasAsset)?
      hasAsset.map((elem:{type:string, object:string})=> elem?.object) :
      hasAsset?.object ;
    assetIds = Array.isArray(assetIds) ? assetIds : [assetIds]; // Ensure assetIds is always an array
    assetIds = assetIds.filter((id:string) => id !== "json-ld-1.1");
   
    let assetsData:{} = [];
    if (assetIds && assetIds.length > 0) {
      // Fetch data for all assetIds
      const assetDataPromises = assetIds.map((assetId: any) =>{     
       return   axios.get(`${API_URL}/asset/get-asset-by-id/${assetId}`, {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            withCredentials: true,
          })   
      }   
      );

      const assetsResponses = await Promise.all(assetDataPromises);
      
      assetsData = assetsResponses.map((response) =>{
        const productKey = Object.keys(response.data).find(key => key.includes("product_name"));
        const assetCategoryKey = Object.keys(response.data).find(key => key.includes("asset_category"))  
        const filteredObject = {
          id: response.data.id,
          product_name: productKey ? response.data[productKey]?.value : undefined,
          asset_category: assetCategoryKey ? response.data[assetCategoryKey]?.value : undefined,
        
        };
        return filteredObject;
      } );
      
    }

    return { shopFloorId, assetIds, assetsData };
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}


type ConsoleMethod = (message?: any, ...optionalParams: any[]) => void;

const filterPatterns: RegExp[] = [/^\[React Flow\]: Node type/]; // Add more patterns here as needed

const shouldFilterMessage = (message: string, patterns: RegExp[]): boolean =>
  patterns.some(pattern => pattern.test(message));

export const customLogger: {
  warn: ConsoleMethod;
  error: ConsoleMethod;
  log: ConsoleMethod;
} = {
  warn: (message?: any, ...optionalParams: any[]): void => {
    if (typeof message === 'string' && shouldFilterMessage(message, filterPatterns)) return;
    console.warn(message, ...optionalParams);
  },
  error: (message?: any, ...optionalParams: any[]): void => {
    if (typeof message === 'string' && shouldFilterMessage(message, filterPatterns)) return;
    console.error(message, ...optionalParams);
  },
  log: console.log,
};

const fetchSingleShopFloor = async (shopFloorId: string): Promise<ShopFloorResponse> => {
  try {
    const response = await axios.get(`${API_URL}/shop-floor/${shopFloorId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching shop floor data for ID ${shopFloorId}:`, error);
    throw error;
  }
};

/**
 * Transforms raw shop floor data into a simplified format
 * @param shopFloorData - Raw shop floor data from the API
 * @returns Transformed shop floor data
 */
const transformShopFloorData = (shopFloorData: ShopFloorResponse): TransformedShopFloor => {
  return {
    id: shopFloorData.id,
    floorName: shopFloorData["http://www.industry-fusion.org/schema#floor_name"]?.value || "Unnamed Floor",
    type_of_floor: shopFloorData["http://www.industry-fusion.org/schema#type_of_floor"]?.value || "Unknown"
  };
};

/**
 * Fetches all shop floors for a factory
 * @param factoryId - The ID of the factory
 * @returns Promise with an array of transformed shop floor data
 * @throws Error if the fetch fails
 */
export const fetchAllShopFloors = async (factoryId: string): Promise<TransformedShopFloor[]> => {
  try {
    // Fetch factory data to get shop floor IDs
    const factoryResponse = await axios.get<FactoryResponse>(`${API_URL}/shop-floor/${factoryId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
      params: { id: factoryId },
    });

    const hasShopFloor = factoryResponse.data["http://www.industry-fusion.org/schema#hasShopFloor"];

    // Check for json-ld-1.1 or empty relationships
    if (!hasShopFloor || 
        (Array.isArray(hasShopFloor) && hasShopFloor.length === 0) ||
        (!Array.isArray(hasShopFloor) && hasShopFloor.object === "json-ld-1.1")) {
      return [];
    }

    // Normalize to array
    const shopFloorRelationships = Array.isArray(hasShopFloor) ? hasShopFloor : [hasShopFloor];

    // Filter out json-ld-1.1 entries
    const validShopFloorRelationships = shopFloorRelationships.filter(
      relationship => relationship.object && relationship.object !== "json-ld-1.1"
    );

    if (validShopFloorRelationships.length === 0) {
      return [];
    }

    // Fetch all shop floor details in parallel
    const settled = await Promise.allSettled(
      validShopFloorRelationships.map((r) => fetchSingleShopFloor(r.object))
    );

    const ok = settled
      .filter((s): s is PromiseFulfilledResult<any> => s.status === "fulfilled")
      .map((s) => s.value)
      .filter(Boolean); 

    return ok.map(transformShopFloorData);
  } catch (error) {
    console.error('Error fetching shop floors:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch shop floors');
  }
};