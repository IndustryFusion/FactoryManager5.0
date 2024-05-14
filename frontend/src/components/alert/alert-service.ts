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

import axios, { AxiosResponse } from 'axios';

export const getAlerts = async () => {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    try {
        let url = API_URL + '/alerts';
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        // console.log('error ',err);
    }

}