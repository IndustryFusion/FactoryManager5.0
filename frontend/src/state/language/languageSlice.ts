import { createSlice } from '@reduxjs/toolkit';

const initialState  = {
    name: '',
    code: ''
};

const languageSlice = createSlice({
    name: "entityId",
    initialState,
    reducers: {
        create: (state, action) => {
            state.name = action.payload.name;
            state.code = action.payload.code;
        },
        reset: () => initialState,
    }
})

export const { create, reset } = languageSlice.actions;
export default languageSlice.reducer;