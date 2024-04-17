import { createSlice } from '@reduxjs/toolkit';
import { string } from 'prop-types';

interface unAllocatedAssetState {
    id: string;
    product_name: string;
    asset_category: string;
};

const initialState: unAllocatedAssetState[]  = [];

const unAllocatedAssetSlice = createSlice({
    name: "unAllocatedAsset",
    initialState,
    reducers: {
        create: (state, action) => {
            console.log('action payload ',action.payload);
            return action.payload;
        },
        reset: () => initialState,
    }
})

export const { create, reset } = unAllocatedAssetSlice.actions;
export default unAllocatedAssetSlice.reducer;