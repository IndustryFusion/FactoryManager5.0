import { createSlice } from '@reduxjs/toolkit';

interface MachineState {
    id: string;
    weeks: any; 
    months: any; 
}

const initialState: MachineState = {
    id: '',
    weeks: {},
    months: {}
}

const machineStateSlice = createSlice({
    name: "machineState",
    initialState,
    reducers: {
        create: (state, action) => {
            const { id, weeks, months } = action.payload;
            return {
                ...state,
                id,
                weeks,
                months
            };
        },
        reset: () => initialState,
    }
})

export const { create, reset } = machineStateSlice.actions;
export default machineStateSlice.reducer;