
import axios from "axios";
import api from "./jwt";
import { updatePopupVisible } from './update-popup';

const FACTORY_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const IFRIC_REGISTRY_BACKEND_URL = process.env.NEXT_PUBLIC_IFRIC_REGISTRY_BACKEND_URL;


export const generateAssetCertificate = async (assetData: {
  asset_ifric_id: string;
  expiry: string;
  user_email:string,
  company_ifric_id:string
}) => {
  try {
    const response = await api.post(
      `${FACTORY_BACKEND_URL}/certificate/create-asset-certificate`,
      assetData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    return response.data;
  } catch (error:any) {
    console.error("Error generating asset certificate:", error);
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
    } else {
      throw new Error(error.response?.data?.message || "Error generating certificate");
    }
  }
};


export const fetchAssetCertificates = async (assetIfricId: string, companyIfricId: string) => {
  try {   
    const response = await api.get(
      `${FACTORY_BACKEND_URL}/certificate/get-asset-certificates`,
      {
        params: {
          asset_ifric_id: assetIfricId,
          company_ifric_id: companyIfricId
        }
      }
    );
    console.log("response.data in asset cert", response.data);
    
    return response.data;
  } catch (error:any) {
    console.error("Error fetching asset certificates:", error);
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
    } else {
      throw new Error(error.response?.data?.message || "Error fetching certificates");
    }
  }
};


export const fetchCompanyCertificates = async (companyId: string) => {
  try {
    return await api.get(`${FACTORY_BACKEND_URL}/certificate/get-company-certificates/${companyId}`);
  } catch (error:any) {
    console.error("Error fetching company certificates:", error);
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
    } else {
      throw new Error(error.response?.data?.message || "Error fetching certificates");
    }
  }
};

export const generateCompanyCertificate = async (generateCertificateData: Record<string, any>) => {
  try {
    return await api.post(`${FACTORY_BACKEND_URL}/certificate/create-company-certificate`, generateCertificateData);
  } catch (error:any) {
    console.error("Error generating asset certificate:", error);
    if (error?.response && error?.response?.status === 401) {
      updatePopupVisible(true);
    } else {
      throw new Error(error.response?.data?.message || "Error generating certificate");
    }
  }
};
