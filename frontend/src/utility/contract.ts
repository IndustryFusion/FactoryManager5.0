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


import api from "./jwt";
import { updatePopupVisible } from "./update-popup";
import moment from 'moment';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const IFX_BACKEND_URL = process.env.NEXT_PUBLIC_IFX_PLATFORM_BACKEND_URL;
 
export const getTemplateByName = async (templateName: string) => {
    try {
      return await api.get(`${BACKEND_API_URL}/templates/template-name?name=${templateName}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    } catch (error: any) {
      if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        return null;
      } else {
        throw error;
      }
    }
};

export const getTemplateByType = async (type: string) => {
    try {
        return await api.get(
            `${process.env.NEXT_PUBLIC_TEMPLATE_SANDBOX_BACKEND_URL}/templates/mongo-templates/type/${type}`, {
            headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            },
        });
    } catch (error: any) {
      if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        return null;
      } else {
        throw error;
      }
    }
};

export const getCompanyCertificate = async (company_ifric_id: string) => {
    try {
      return await api.get(`${BACKEND_API_URL}/certificate/get-company-certificates/${company_ifric_id}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
      });
    } catch (error: any) {
      if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        return null;
      } else {
        throw error;
      }
    }
};

export const getContractByType = async (type: string) => {
    try {
      console.log("type ",type);
      return await api.get(`${IFX_BACKEND_URL}/contract/get-contract-by-type/${type}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
      });
    } catch (error: any) {
      if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        return null;
      } else {
        throw error;
      }
    }
};

export const getContractByAssetType = async (type: string) => {
  try {
    return await api.get(`${IFX_BACKEND_URL}/contract/get-contract-by-asset-type/${type}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
    });
  } catch (error: any) {
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
      return null;
    } else {
      throw error;
    }
  }
};

export const getAssetByType = async (type: string) => {
    try {
      return await api.get(`${BACKEND_API_URL}/asset/type/${type}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
      });
    } catch (error: any) {
      if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        return null;
      } else {
        throw error;
      }
    }
};

export const getAssetCertificateById = async (asset_ifric_id: string, company_ifric_id: string) => {
  try {
    return await api.get(
      `${BACKEND_API_URL}/certificate/get-asset-certificates`,
      {
        params: {
          asset_ifric_id,
          company_ifric_id
        }
      }
    );
  } catch (error: any) {
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
      return null;
    } else {
      throw error;
    }
  }
};

export const createBinding = async (data: Record<string, any>) => {
  try {
    return await api.post(
      `${IFX_BACKEND_URL}/binding`,
      data
    );
  } catch (error: any) {
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
      return null;
    } else {
      throw error;
    }
  }
};

export const getAllContract = async (company_ifric_id: string) => {
  try {
    const certificateResponse = await getCompanyCertificate(company_ifric_id);
    console.log("certificateResponse ",certificateResponse?.data);
    if(certificateResponse?.data) {
      const lastCertificateExpiry = moment(certificateResponse.data[0].expiry_on);
      const currentTime = moment();
      if(lastCertificateExpiry.isAfter(currentTime)) {
        const contract = [];
        const response = await api.get(`${BACKEND_API_URL}/asset/get-owner-asset/${company_ifric_id}`);
        if(response.data.length) {
          const assetData: Record<string,any>[] = response.data;
          const uniqueTypes: string[] = [...new Set(assetData.map((item: Record<string, any>) => item.type as string))];
          for(let i = 0; i < uniqueTypes.length; i++) {
            const contractResponse = await getContractByAssetType(btoa(uniqueTypes[i]));
            if(contractResponse?.data) {
              contract.push(...contractResponse.data);
            }
          }
        }
        return contract;
      } else {
        throw new Error("Certificate has expired and is no longer valid.");
      }
    } else {
      throw new Error("No Company Certificate available, please create one");
    }
  } catch (error: any) {
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
      return null;
    } else {
      throw error;
    }
  }
};

export const getContracts =async(companyIfricId: string)=>{
  try{
   const response = await api.get(`${IFX_BACKEND_URL}/contract/get-company-contract/${companyIfricId}`)
   return response.data
  }
  catch (error:any) {
      console.error("Error getting contracts:", error);
      if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
      } else {
        throw new Error(error.response?.data?.message || "Error getting contracts");
      }
    }
  }

  export const createContract = async (dataToSend: Record<string,any>) => {
    try{
        return await api.post(`${IFX_BACKEND_URL}/contract`, dataToSend,{
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },  
        })
    }
    catch (error: any) {
        if (error?.response && error?.response?.status === 401) {
          updatePopupVisible(true);
          return null;
        } else {
          throw error;
        }
      }
}

export const deleteContract = async(contractIfricId:string)=>{
  try{
    const response = await api.delete(`${IFX_BACKEND_URL}/contract/${contractIfricId}`);
    return response.data;
  }catch (error:any) {
        console.error("Error updating contracts:", error);
        if (error?.response && error?.response?.status === 401) {
          updatePopupVisible(true);
        } else {
          throw new Error(error.response?.data?.message || "Error deleteing contracts");
        }
      }
    }

export const updateContractDetails = async (contractIfricId: string, dataToSend: Record<string, any>) => {
  try {
    const response = await api.patch(`${IFX_BACKEND_URL}/contract/${contractIfricId}`, dataToSend, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
    return response.data
  } catch (error: any) {
    console.error("Error updating contracts:", error);
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
    } else {
      throw new Error(error.response?.data?.message || "Error updating contracts");
    }
  }
}

export const getContractDetails = async (contractIfricId: string) => {
  try {
    const response = await api.get(`${IFX_BACKEND_URL}/contract/${contractIfricId}`)
    return response.data
  } catch (error: any) {
    console.error("Error getting contracts:", error);
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
    } else {
      throw new Error(error.response?.data?.message || "Error getting contracts");
    }
  }
}