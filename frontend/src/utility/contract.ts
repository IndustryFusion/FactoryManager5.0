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

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
 
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
      return await api.get(`${BACKEND_API_URL}/contract/get-contract-by-type/${type}`, {
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
      `${BACKEND_API_URL}/binding`,
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
