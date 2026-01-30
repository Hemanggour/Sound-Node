import axios from 'axios';
import type { AxiosError } from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

// Create axios instance with credentials for cookie-based auth
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Send cookies with every request
});

// Flag to prevent concurrent refresh attempts
let isRefreshing = false;

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as typeof error.config & { _retry?: boolean };

        // Don't try to refresh if:
        // - Not a 401 error
        // - Already retried this request
        // - The failed request was an auth endpoint (login, register, refresh)
        // - Already refreshing
        // - On login or register page
        const requestUrl = originalRequest?.url || '';
        const isAuthEndpoint =
            requestUrl.includes(ENDPOINTS.refresh) ||
            requestUrl.includes(ENDPOINTS.LOGIN) ||
            requestUrl.includes(ENDPOINTS.REGISTER);
        const isOnAuthPage =
            window.location.pathname === '/login' ||
            window.location.pathname === '/register';

        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isAuthEndpoint &&
            !isRefreshing &&
            !isOnAuthPage
        ) {
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Backend will read refresh token from cookie and set new access token cookie
                await axios.post(
                    `${ENDPOINTS.refresh}`,
                    {},
                    { withCredentials: true }
                );

                isRefreshing = false;
                // Retry the original request (cookies will be sent automatically)
                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                // Refresh failed - redirect to login only if not already there
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

