//factory-site utility .ts

import axios from "axios";
import { Factory } from "@/interfaces/factoryType";
import { Asset } from "@/interfaces/assetTypes";
import { MdQueryBuilder } from "react-icons/md";
import html2canvas from "html2canvas";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

/**
 * Uploads a file to the server.
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} The URL of the uploaded file on success.
 * @throws {Error} Throws an error if the upload fails.
 */

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

    console.log("The util upload  : ", response);

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
    console.log("Factory updated successfully");
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
  console.log(factoryToDelete);
  try {
    await axios.delete(API_URL + `/factory-site/${factoryToDelete.id}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    console.log("Factory deleted:", factoryToDelete);
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
          value: any;
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
  console.log("data bfore sending patch ", factoryToUpdate);

  console.log("the id is ", id);

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
    console.log("Factory updated successfully", response.data);
    return response.data;
  } else {
    console.error("Unexpected response status:", response.status);
  }
};

const mapBackendDataTofactory = (backendData: any): any => {
  return backendData.map((item: any) => {
    const newItem: any = {};
    Object.keys(item).forEach((key) => {
      if (key.includes("http://www.industry-fusion.org/schema#")) {
        const newKey = key.replace(
          "http://www.industry-fusion.org/schema#",
          ""
        );
        newItem[newKey] =
          item[key].type === "Property" ? item[key].value : item[key];
      } else {
        newItem[key] = item[key];
      }
    });
    return newItem;
  });
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
  const response = await axios.get(`${API_URL}/shop-floor/`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    withCredentials: true,

    params: { id: factoryId },
  });

  const mappedData1 = flattenData(response.data);
  console.log(response.data, "TTTTT");
  return response.data;
};

export const getNonShopFloorAsset = async (factoryId: string) => {
  try {
    const response = await axios.get(
      `${API_URL}/non-shop-floor-assets/${factoryId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      }
    );
    console.log(response.data, "the before filter data");

    return response.data;
  } catch (error) {
    console.error("Error fetching non-shop-floor assets", error);

    throw error;
  }
};

export const getNonShopFloorAssetDetails = async (assetId: string) => {
  try {
    const response = await axios.get(`${API_URL}/asset/${assetId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    console.log(response.data, "  non shop floor items ");
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
      if (key.includes("http://www.industry-fusion.org/schema#")) {
        const newKey = key.replace(
          "http://www.industry-fusion.org/schema#",
          ""
        );
        newItem[newKey] =
          item[key].type === "Property" ? item[key].value : item[key];
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

    console.log("Export successful");
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

    if (response.data && response.data.factoryData) {
      const factoryNode = response.data.factoryData.nodes.find(
        (node: any) => node.type && node.type.hasShopFloor
      );
      const backendShopFloors = factoryNode?.type?.hasShopFloor?.object || [];

      const currentShopFloors = nodes
        .filter((node) => node.data.type === "shopFloor")
        .map((node) => node.data.id);

      const disableSave = currentShopFloors.some((sf) =>
        backendShopFloors.includes(sf)
      );

      setIsSaveDisabled(disableSave);
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
        axios.get(`${API_URL}/asset/${assetId}`, {
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

export function extractHasRelations(assetData: any): { [key: string]: any } {
  const hasRelations: { [key: string]: any } = {};
  const prefixToRemove = "http://www.industry-fusion.org/schema#";

  assetData = assetData || {};

  Object.entries(assetData).forEach(([key, value]) => {
    if (key.startsWith(prefixToRemove)) {
      if (value && typeof value === "object" && value.type === "Relationship") {
        const relationshipDetail: any = {
          type: value.type,
          object: value.object,
        };

        // Remove the prefix from the key
        const cleanedKey = key.replace(prefixToRemove, "");
        hasRelations[cleanedKey] = relationshipDetail;
      }
    }
  });
  console.log(hasRelations, "llllllllll");
  return hasRelations;
}

export const saveFlowchartData = async (
  factoryId: string,
  nodes: any,
  edges: any
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

export const fetchAssetById = async (assetId: string) => {
  try {
    const response = await axios.get(API_URL + "/asset/" + `${assetId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    const responseData = response.data;
    const mappedData = extractHasRelations(responseData);
    console.log(mappedData, "The asset Node data");
    return mappedData;
  } catch (error) {
    console.error("Error:", error);
  }
};
