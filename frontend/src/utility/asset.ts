//
// Copyright (c) 2024 IB Systems GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import axios from "axios";
import api from "./jwt";
import { updatePopupVisible } from "./update-popup";
import { getAccessGroup } from "./indexed-db";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export const getCompanyIfricId = (): string => {
  if (
    typeof window !== "undefined" &&
    localStorage.getItem("company_ifric_id")
  ) {
    return localStorage.getItem("company_ifric_id") as string;
  }
  return "";
};

// Function to map the backend data to the Asset structure
export const mapBackendDataToAsset = (assetData: any) => {
  const refactoredData: any = {};
  Object.keys(assetData).forEach((key) => {
    const property = assetData[key];

    // Check if it's a property object with a value
    if (property && property.type === "Property") {
      const shortenedKey: any = key.split("/").pop(); // Use only the last part of the URL as key
      refactoredData[shortenedKey] = property.value;
    }
  });

  // Keep the asset's main identifier and type
  refactoredData.id = assetData.id;
  refactoredData.type = assetData.type;

  return refactoredData;
};

export const mapBackendDataOfAsset = (backendData: any[]) => {
  return backendData.map((item: any) => {
    const newItem: any = {};
    Object.keys(item).forEach((key) => {
      if (key.includes("/")) {
        const newKey = key.split("/").pop() || "";
        if (item[key].type === "Property") {
          newItem[newKey] = item[key].value;
        } else if (item[key].type === "Relationship") {
          newItem[newKey] = item[key].object;
        }
      } else {
        if (key == "type" || key == "id") {
          newItem[key] = item[key];
        } else if (key == "templateId") {
          newItem[key] = item[key].value;
        }
      }
    });
    return newItem;
  });
};

export const fetchAssets = async () => {
  try {
    const response = await api.get(
      BACKEND_API_URL +
        `/asset/get-company-manufacturer-asset/urn:ifric:ifx-eu-com-nap-6ab7cb06-bbe0-5610-878f-a9aa56a632ec`,
      {
        headers: {
          "Content-Type": "application/ld+json",
          Accept: "application/ld+json",
        },
      }
    );
    const responseData = response.data;
    // console.log("responseData",responseData)
    const mappedData = responseData.map((asset: any) => ({
      owner_company_name: asset.owner_company_name,
      assetData: mapBackendDataToAsset(asset.assetData),
    }));
    // console.log("mappedData",mappedData)
    return mappedData;
  } catch (error: any) {
    console.log("err from fetch asset ", error);
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
    } else {
      throw error;
    }
  }
};

export const postFile = async (formData: FormData) => {
  try {
    return await api.post(`${BACKEND_API_URL}/file`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (error: any) {
    console.log("err from fetch asset ", error);
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
    } else {
      throw error;
    }
  }
};

export const getAssetById = async (assetId: string): Promise<Asset | null> => {
  try {
    const response = await api.get(`${BACKEND_API_URL}/asset/get-asset-by-id/${assetId}`, {
      headers: {
        "Content-Type": "application/ld+json",
        Accept: "application/ld+json",
      },
    });
    const responseData = response.data;
    console.log("responseData here in this", responseData);
    
    const mappedData = mapBackendDataOfAsset([responseData]);
    console.log("mappedData here", mappedData);

    return mappedData.length > 0 ? mappedData[0] : null;
  } catch (error: any) {
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
      return null;
    } else {
      throw error;
    }
  }
};

export const setFactoryOwnerAssets = async (company_ifric_id: string)=> {
  try {
    const access_group = await getAccessGroup();
    const token = access_group.ifricdi
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    const response = await axios.post(
      `${BACKEND_API_URL}/asset/get-owner-asset/${company_ifric_id}`,
      {}, 
      {
       headers: {
          "Content-Type": "application/ld+json",
          "Accept": "application/ld+json",
          "Authorization": `Bearer ${token}`
      },
      }
    );
    console.log("post setOwner asset endpoint console",response.data);
    return response.data;
  } catch (error: any) {
      console.error(error);
  }
};

export const getSyncPdtData = async (company_ifric_id: string)=> {
  try {
    const response = await axios.get(
      `${BACKEND_API_URL}/company/get-sync-pdt-data/${company_ifric_id}`);
    console.log("resposne from getSyncPdtData ",response.data)
    return response.data;
  } catch (error: any) {
    throw error;
  }
};
