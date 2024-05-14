// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

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