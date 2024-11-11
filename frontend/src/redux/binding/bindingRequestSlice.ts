import { createSlice } from "@reduxjs/toolkit";


const initialState = {
    contracts: []
  };

const bindingRequestSlice = createSlice({
  name: "bindingRequest",
  initialState,
  reducers: {
    updateBindingRequestContracts: (state, action) => {
        state.contracts = action.payload;
      },
  }
});

export const { updateBindingRequestContracts } = bindingRequestSlice.actions;
export default bindingRequestSlice.reducer;
