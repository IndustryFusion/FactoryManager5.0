import { configureStore } from "@reduxjs/toolkit";
import unAllocatedAssetReducer from './unAllocatedAsset/unAllocatedAssetSlice';
import machineStateReducer from "./machineState/machineStateSlice";
import entityIdReducer from "./entityId/entityIdSlice";
import relationsReducer from "./relations/relationsSlice";

export const store = configureStore({
    reducer: {
        unAllocatedAsset: unAllocatedAssetReducer,
        machineState: machineStateReducer,
        entityId: entityIdReducer,
        relations: relationsReducer
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;