import { createSlice } from '@reduxjs/toolkit';

interface powerConsumptionState {
    labels: string[];
    powerConsumption: number[];
    emission: number[];
};

const weeks: powerConsumptionState  = {
    labels: [],
    powerConsumption: [],
    emission: [],
};

const months: powerConsumptionState  = {
    labels: [],
    powerConsumption: [],
    emission: [],
};

const initialState = {
    weeks,
    months
}

const powerConsumptionSlice = createSlice({
    name: "powerConsumption",
    initialState,
    reducers: {
        create: (state, action) => {
            const { type, weeks, months } = action.payload;
            return {
                ...state,
                weeks: type === 'weeks' ? weeks : state.weeks,
                months: type === 'months' ? months : state.months,
            };
        },
        reset: () => initialState,
    }
})

export const { create, reset } = powerConsumptionSlice.actions;
export default powerConsumptionSlice.reducer;