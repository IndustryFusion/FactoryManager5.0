import { createSlice } from '@reduxjs/toolkit';
import { string } from 'prop-types';

interface powerConsumptionSlice {
    minimumDate: Date | null;
    id: string;
};

const initialState: powerConsumptionSlice  = {
    minimumDate: null,
    id: ""
};

const entityIdSlice = createSlice({
    name: "powerConsumption",
    initialState,
    reducers: {
        create: (state, action) => {
            state.minimumDate = action.payload.minimumDate;
            state.id = action.payload.id ? action.payload.id : "";
        },
        reset: () => initialState,
    }
})

export const { create, reset } = entityIdSlice.actions;
export default entityIdSlice.reducer;