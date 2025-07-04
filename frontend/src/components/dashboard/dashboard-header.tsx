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

import { useDashboard } from "@/context/dashboard-context";
import "../../styles/dashboard.css"
import { useTranslation } from "next-i18next";

const AutoRefresh = () => {
  const { selectedAssetData } = useDashboard();
  const { t } = useTranslation(['dashboard']);

  return (
    <>
      <div className=" mr-5 flex justify-content-between">
        {selectedAssetData?.product_name === undefined ?
          <h3 style={{ fontSize: "21px" }}>{t('unknownProduct')}</h3>
          :
          <h3 style={{ fontSize: "21px" }}>
            <span style={{textTransform: 'capitalize'}}>{`${selectedAssetData?.product_name} :`}</span>
            <span style={{ textTransform: "lowercase" }}>{` ${selectedAssetData?.id}`}</span>
          </h3>
        }
      </div>
    </>
  )
}

export default AutoRefresh;