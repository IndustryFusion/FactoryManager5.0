import api from "./jwt";
import { updatePopupVisible } from "./update-popup"
const IFX_BACKEND_URL = process.env.NEXT_PUBLIC_IFX_BACKEND_URL

export const getBindings =async(companyIfricId: string)=>{
    try{
     const response = await api.get(`${IFX_BACKEND_URL}/binding/get-company-binding/${companyIfricId}`)
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
    
    export const getContractDetails = async(contractIfricId:string)=>{
    try{
        const response = await api.get(`${IFX_BACKEND_URL}/contract/${contractIfricId}`)
        return response.data
    }catch (error:any) {
        console.error("Error getting contracts:", error);
        if (error?.response && error?.response?.status === 401) {
          updatePopupVisible(true);
        } else {
          throw new Error(error.response?.data?.message || "Error getting contracts");
        }
      }
    }
    
    export const updateContractDetails = async(contractIfricId:string,dataToSend: Record<string,any>)=>{
        try{
            const response = await api.patch(`${IFX_BACKEND_URL}/contract/${contractIfricId}`,dataToSend,{
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },  
            })
            return response.data
        }catch (error:any) {
            console.error("Error updating contracts:", error);
            if (error?.response && error?.response?.status === 401) {
              updatePopupVisible(true);
            } else {
              throw new Error(error.response?.data?.message || "Error updating contracts");
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