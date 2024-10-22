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

import { configureStore } from "@reduxjs/toolkit";
import unAllocatedAssetReducer from './unAllocatedAsset/unAllocatedAssetSlice';
import machineStateReducer from "./machineState/machineStateSlice";
import entityIdReducer from "./entityId/entityIdSlice";
import authReducer from "./auth/authSlice"
import relationsReducer from "./relations/relationsSlice";
import powerConsumptionReducer from "./powerConsumption/powerConsumptionSlice";
import bindingsSliceReducer from "./binding/bindingsSlice"
import assetManagementReducer from './assetManagement/assetManagementSlice';
import contractsSliceReducer from "./contract/contractSlice";


export const store = configureStore({
    reducer: {
        unAllocatedAsset: unAllocatedAssetReducer,
        machineState: machineStateReducer,
        entityId: entityIdReducer,
        auth: authReducer,
        relations: relationsReducer,
        powerConsumption: powerConsumptionReducer,
        bindings: bindingsSliceReducer,
        assetManagement: assetManagementReducer,
        contracts: contractsSliceReducer
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;