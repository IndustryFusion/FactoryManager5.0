import { createSlice } from '@reduxjs/toolkit';
import { string } from 'prop-types';

interface relationsState{
    id: string;
    values: string[];
}

const initialState:relationsState= {
    id: "",
    values: []
}

const relationSlice = createSlice({
    name: "relations",
    initialState,
    reducers: {
        create: (state, action) => {
            console.log('inside relations slice ',action.payload);
            const { id, values } = action.payload;

           return {
            ...state,
            id,
            values
           }
        },
        reset: () => initialState,
    }
})

export const { create, reset } = relationSlice.actions;
export default relationSlice.reducer;