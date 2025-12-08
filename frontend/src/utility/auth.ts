
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
import axios from "axios";
import { updatePopupVisible } from './update-popup';
import { jwtDecode, JwtPayload } from "jwt-decode";
import { getAccessGroup, storeAccessGroup } from "./indexed-db";

const REGISTRY_API_URL =process.env.NEXT_PUBLIC_IFRIC_REGISTRY_BACKEND_URL;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface CustomJwtPayload extends JwtPayload {
    user: string;  
}

export const fetchUserDetails = async(email: string) => {
    try {
    
    const url = `${BACKEND_URL}/auth/get-user-details-by-email/${email}`;

    // Fetch user data
    const response = await api.get(url, {
    headers: {
        "Content-Type": "application/json",
    }});

    return response.data;
    } catch(error: any) {
        console.log('err from update user details by email ',error);
        if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        } else {
        throw error;
        }
    }
}

export const getCompanyDetailsById = async(company_id: string) => {
    try {
        return await api.get(`${BACKEND_URL}/auth/get-company-details/${company_id}`,{
            headers: {
              "Content-Type": "application/json",
            }         
        })
    
    } catch(error: any) {
        console.log('err from fetch company details by id ',error);
        if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        } else {
        throw error;
        }
    }
}

export const getCompanyDetailsByRecordId = async(company_id: string) => {
    try {
        return await api.get(`${BACKEND_URL}/auth/get-company-details-id/${company_id}`,{
            headers: {
              "Content-Type": "application/json",
            }         
        })
    
    } catch(error: any) {
        console.log('err from fetch company details by record id ',error);
        if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        } else {
        throw error;
        }
    }
}

export const updateCompanyTwin = async(dataToSend: Record<string, any>) => {
    try {
        return await api.patch(
            `${BACKEND_URL}/auth/update-company-twin`,
            dataToSend
        );
    } catch(error: any) {
        console.log('err from update company twin',error);
        if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        } else {
        throw error;
        }
    }
}

export const getCategorySpecificCompany = async(categoryName: string) => {
    try {
        return await api.get(`${BACKEND_URL}/auth/get-category-specific-company/${categoryName}`);
    } catch(error: any) {
        console.log('err from update company twin',error);
        if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        } else {
        throw error;
        }
    }
}

export const getAccessGroupData = async(token: string, from?: string) => {
    try {
        const registryHeader = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        const response = await axios.post(`${BACKEND_URL}/auth/decrypt-route`, {token, product_name: "Factory Manager"}, {
            headers: registryHeader
        });
        const loginData = {
          ...response.data.data,
          ...(from ? { from } : {})
      };
      await storeAccessGroup(loginData);
    } catch(error: any) {
        throw error;
    }
}

export const verifyCompanyCertificate = async(company_ifric_id: string) => {
    try{
        return await api.get(`${BACKEND_URL}/certificate/verify-company-certificate/${company_ifric_id}`);
    } catch(error: any){
        console.log("error getting company verification", error);
        if (error?.response && error?.response?.status === 401) {
        updatePopupVisible(true);
        } else {
        throw error;
        }
    }
}

export const getUserDetails = async (dataToSend: Record<string, string>) => {
    try {
        return await api.get(`${BACKEND_URL}/auth/get-user-details`, {
            headers: {
              "Content-Type": "application/json",
            },
            params: dataToSend,
        });

    } catch (error: any) {
        console.log('err from updating company user ',error);
        if (error?.response && error?.response?.status === 401) {
          updatePopupVisible(true);
        } else {
          throw error;
        }
    }
};

export const fetchCompanyProduct = async (dataCompanyIfricId: string) => {
    try {
        return await api.get(`${BACKEND_URL}/auth/get-company-products/${dataCompanyIfricId}`,{
            headers: {
              "Content-Type": "application/json",
            },
        });
    
    } catch (error: any) {
        console.log('err from fetch company product ',error);
        if (error?.response && error?.response?.status === 401) {
          updatePopupVisible(true);
        } else {
          throw error;
        }
    }
};

export const generateToken = async (data: Record<string, string>) => {
    try {
        return await axios.post(`${BACKEND_URL}/auth/generate-token`, data);
    } catch (error: any) {
        console.log('err from generating token ',error);
        if (error?.response && error?.response?.status === 401) {
          updatePopupVisible(true);
        } else {
          throw error;
        }
    }
};

export const authenticateToken = async (token: string) => {
  try {
    const response = await api.get(`${BACKEND_URL}/auth/authenticate-token/${token}`);
    return response.data;
  } catch(error: any) {
    throw error;
  }
}


export const encryptRoute = async (data: {
    environment: string;
    pageName: string;
    product_name: string;
    t?: (key: string) => string;
}) => {
    try {
        const accessGroupData = await getAccessGroup();
        if (!accessGroupData || !accessGroupData.ifricdi || !accessGroupData.company_ifric_id) {
            const errorMessage = data.t ? data.t("unableToRetrieveAuthData"):"";
            throw new Error(errorMessage);
        }

        const token = accessGroupData.ifricdi;
        const company_ifric_id = accessGroupData.company_ifric_id;
        const route = data.pageName;

        const requestData = {
            token,
            product_name: data.product_name,
            company_ifric_id,
            route
        };

        const response = await api.post(
            `${BACKEND_URL}/auth/encrypt-route`,
            requestData,
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.log('err from encrypt route ', error);
        if (error?.response && (error?.response?.status === 401 || error?.response?.status === 403)) {
            updatePopupVisible(true);
        } else {
            throw error;
        }
    }
}


export const getBaseURL = (environment: string | undefined, productName: string): string => {
  switch (productName) {
    case "DPP Creator":
      if (environment === "dev") {
        return "https://dev-platform.industry-fusion.com";
      } else if (environment === "local") {
        return "http://localhost:3003";
      } else {
        return "https://platform.industry-fusion.com";
      }

    case "IFX Platform":
      if (environment === "dev") {
        return "https://dev-platform.industryfusion-x.org";
      } else if (environment === "local") {
        return "http://localhost:3008";
      } else {
        return "https://platform.industryfusion-x.org";
      }

    case "Contract Manager":
      if (environment === "dev") {
        return "https://dev-contract.industryfusion-x.org";
      } else if (environment === "local") {
        return "http://localhost:3020";
      } else {
        return "https://contract.industryfusion-x.org";
      }

    case "Factory Manager":
      if (environment === "dev") {
        return "https://dev-factory.industry-fusion.com";
      } else if (environment === "local") {
        return "http://localhost:3002";
      } else {
        return "https://factory.industry-fusion.com";
      }
     case "Fleet Manager":
        if (environment === "dev") {
            return "https://dev-fleet.industry-fusion.com";
        } else if (environment === "local") {
            return "http://localhost:3001";
        } else {
            return "https://fleet.industry-fusion.com";
        }
    default:
       if (environment === "dev") {
        return "https://dev-factory.industry-fusion.com";
      } else if (environment === "local") {
        return "http://localhost:3002";
      } else {
        return "https://factory.industry-fusion.com";
      }
  }
}