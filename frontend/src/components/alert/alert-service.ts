import axios, { AxiosResponse } from 'axios';

export const getAlerts = async () => {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    try {
        let url = API_URL + '/alerts';
        const response = await axios.get(url);
        console.log('response from frontend ',response.data);
        return response.data;
    } catch (err) {
        console.log('error ',err);
    }
    
}