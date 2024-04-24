import { createSlice } from '@reduxjs/toolkit';
import { string } from 'prop-types';

interface entityIdState {
    id: string;
};

const initialState: entityIdState  = {
    id: ''
};

const entityIdSlice = createSlice({
    name: "entityId",
    initialState,
    reducers: {
        create: (state, action) => {
            state.id = state.id + action.payload;
        },
        update: (state, action) => {
            state.id = action.payload;
        },
        reset: () => initialState,
    }
})

export const { create, update, reset } = entityIdSlice.actions;
export default entityIdSlice.reducer;