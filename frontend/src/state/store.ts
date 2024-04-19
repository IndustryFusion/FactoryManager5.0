import { configureStore } from "@reduxjs/toolkit";
import unAllocatedAssetReducer from './unAllocatedAsset/unAllocatedAssetSlice';
import powerConsumptionReducer from "./powerConsumption/powerConsumptionSlice";
export const store = configureStore({
    reducer: {
        unAllocatedAsset: unAllocatedAssetReducer,
        powerConsumption: powerConsumptionReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;