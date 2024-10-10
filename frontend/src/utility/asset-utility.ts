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
import { Asset } from "../types/asset-types";
import { getAccessGroup } from "./indexed-db";
import api from "./jwt";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

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

  export const fetchAssetManagement = async()=>{
    try{
      const userData = await getAccessGroup();
      if (userData && userData.company_ifric_id) {
        const response = await api.get(API_URL + `/asset/asset-management/${userData.company_ifric_id}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        });
        const responseData = response.data; 
        console.log("responseData ",responseData);
        const mappedData = mapBackendDataToAsset(responseData);
        return mappedData;
      }
    }catch(error){
        console.error("Error:", error)
    }
  }

  export const fetchFormAllocatedAsset =async(payload:{})=>{
    const url = `${API_URL}/allocated-asset/form`;
    try{
      const response = await axios.post(url, payload, {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        withCredentials: true,
    })
    return response;

    }catch(error){
        console.error("Error:", error)
    }
  }