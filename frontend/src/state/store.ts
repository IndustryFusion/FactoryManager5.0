import { configureStore } from "@reduxjs/toolkit";
import unAllocatedAssetReducer from './unAllocatedAsset/unAllocatedAssetSlice';
import machineStateReducer from "./machineState/machineStateSlice";
import entityIdReducer from "./entityId/entityIdSlice";
import authReducer from "./auth/authSlice"
import relationsReducer from "./relations/relationsSlice";
import powerConsumptionReducer from "./powerConsumption/powerConsumptionSlice";

export const store = configureStore({
    reducer: {
        unAllocatedAsset: unAllocatedAssetReducer,
        machineState: machineStateReducer,
        entityId: entityIdReducer,
        auth: authReducer,
        relations: relationsReducer,
        powerConsumption: powerConsumptionReducer
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;