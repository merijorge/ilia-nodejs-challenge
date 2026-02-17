import axios, { type AxiosInstance } from "axios";

export const userApi = axios.create({
  baseURL: import.meta.env.VITE_USER_SERVICE_URL ?? "http://localhost:3002",
  headers: { "Content-Type": "application/json" },
});

export const walletApi = axios.create({
  baseURL: import.meta.env.VITE_WALLET_SERVICE_URL ?? "http://localhost:3001",
  headers: { "Content-Type": "application/json" },
});

const attachAuthInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use(config => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    },
  );
};

attachAuthInterceptor(userApi);
attachAuthInterceptor(walletApi);
