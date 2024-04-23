import { configureStore } from "@reduxjs/toolkit";
import unAllocatedAssetReducer from './unAllocatedAsset/unAllocatedAssetSlice';
import powerConsumptionReducer from "./powerConsumption/powerConsumptionSlice";
import entityIdReducer from "./entityId/entityIdSlice";
export const store = configureStore({
    reducer: {
        unAllocatedAsset: unAllocatedAssetReducer,
        powerConsumption: powerConsumptionReducer,
        entityId: entityIdReducer
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;