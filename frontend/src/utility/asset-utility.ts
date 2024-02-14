import axios from "axios";
import { Asset } from "@/interfaces/assetTypes";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

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

  export const fetchAsset = async()=>{
    try{
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

    }catch(error){
        console.error("Error:", error)
    }
  }