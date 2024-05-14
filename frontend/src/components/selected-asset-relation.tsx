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

import React from "react";

type SelectedAssetsListProps = {
  selectedAssets: string[];
};

const SelectedAssetsList: React.FC<SelectedAssetsListProps> = ({
  selectedAssets,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "row", overflowX: "auto" }}>
      {selectedAssets.map((asset, index) => (
        <div key={index} style={{ marginRight: "10px" }}>
          {asset}
        </div>
      ))}
    </div>
  );
};

export default SelectedAssetsList;
