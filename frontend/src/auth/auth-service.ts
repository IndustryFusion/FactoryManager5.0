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
import Cookies from 'js-cookie';
import dotenv from 'dotenv';

dotenv.config();

//interface for token

interface LoginResponse {
  success: string;
  status: string;
  message: string;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

//on sucessfull login , we store access_token and refresh_token in cookies
const login = async (username: string, password: string): Promise<LoginResponse> => {

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    const data = {
        'username': username,
        'password': password,
    };
    
    const loginUrl = API_URL + '/auth/login';
    try {
        const response: AxiosResponse<LoginResponse> = await axios.post(loginUrl as string, data, { headers });
        if (response.data.success) 
        {
            //Testing for 15 seconds
            // const expires = new Date(new Date().getTime() + 15 * 1000); 
            // Cookies.set('login_flag', "true", { expires });


            //for 24 hours
            const expires = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); 
            Cookies.set('login_flag', "true", { expires });
        }
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.error(error.response.data);
                console.error(error.response.status);
                console.error(error.response.headers);
            } else if (error.request) {
                console.error(error.request);
            } else {
                console.error('Error', error.message);
            }
        } else {
            console.error('Error', error);
        }
        throw error;
    }
};


//remove the token on log out
const logout = async () => {
    const logoutUrl = API_URL + '/auth/logout';
    const response = await axios.delete(logoutUrl as string);
    // Clear tokens and other data from cookies
    Cookies.set('login_flag', "false");
};

export default {
    login,
    logout
};
