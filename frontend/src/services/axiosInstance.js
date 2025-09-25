import axios from 'axios';
export const BASE_URL = 'http://192.168.2.32:5001/';

const axiosInstance = axios.create({
    baseURL: 'http://192.168.2.32:5001/api',
    
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


export default axiosInstance;
