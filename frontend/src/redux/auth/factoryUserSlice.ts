// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//   http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import {createSlice } from '@reduxjs/toolkit';
 
const initialState = {
    user_name: "",
    company_id: "",
    company_name: "",
    user_image: ""
}

const factoryUserSlice = createSlice({
    name: 'factory-user',
    initialState,
    reducers: {
        updateCompanyName: (state, action) => {
          state.company_name = action.payload;
        },
        updateUserName: (state, action) => {
            state.company_name = action.payload;
        },
        updateCompanyId: (state, action) => {
            state.company_id = action.payload;
        },
        updateUserImage: (state, action) => {
            state.user_image = action.payload;
        },
    }
});

export const {updateCompanyName , updateUserName, updateCompanyId, updateUserImage} = factoryUserSlice.actions;

export default factoryUserSlice.reducer;
