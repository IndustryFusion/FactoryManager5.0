import axios, { AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import dotenv from 'dotenv';

dotenv.config();

//interface for token

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  sessionId: string
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
        console.log('response ',response);
        if (response.data) 
        {
            // Securely store tokens in cookies
            Cookies.set('login_flag', "true", { expires: 86400 });
        }
        return response.data;
    } catch (error: any) {
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
            console.error('Error', error.message);
        }
        throw error;
    }
};


//remove the token on log out
const logout = async () => {
    const logoutUrl = API_URL + '/auth/logout';
    const response = await axios.delete(logoutUrl as string);
    console.log('response ',response);
    // Clear tokens and other data from cookies
    Cookies.remove('access_token', { secure: true, httpOnly: true, sameSite: 'Strict' });
    Cookies.remove('refresh_token', { secure: true, httpOnly: true, sameSite: 'Strict' });
};

export default {
    login,
    logout
};
