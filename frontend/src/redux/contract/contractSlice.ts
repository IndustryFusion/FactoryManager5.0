import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    contracts: []
  };

const contractsSlice = createSlice({
  name: "contracts",
  initialState,
  reducers: {
    updateContracts: (state, action) => {
      state.contracts = action.payload;
    }
  }
});

export const { updateContracts } = contractsSlice.actions;
export default contractsSlice.reducer;
