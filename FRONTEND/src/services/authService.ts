import api from './api';
import { ENDPOINTS } from '../config/api';
import type {
    ApiResponse,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
    User,
} from '../types';

export const authService = {
    async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await api.post<ApiResponse<AuthResponse>>(ENDPOINTS.REGISTER, data);
        return response.data;
    },

    async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await api.post<ApiResponse<AuthResponse>>(ENDPOINTS.LOGIN, data);
        return response.data;
    },

    async refreshToken(): Promise<{ access: string }> {
        // Backend reads refresh token from cookie and sets new access token cookie
        const response = await api.post(ENDPOINTS.refresh, {}, { withCredentials: true });
        return response.data;
    },

    async getProfile(): Promise<ApiResponse<User>> {
        const response = await api.get<ApiResponse<User>>(ENDPOINTS.PROFILE, { withCredentials: true });
        return response.data;
    },

    async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>> {
        const response = await api.patch<ApiResponse<User>>(ENDPOINTS.PROFILE, data, { withCredentials: true });
        return response.data;
    },

    async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<{ success: string }>> {
        const response = await api.post<ApiResponse<{ success: string }>>(
            ENDPOINTS.CHANGE_PASSWORD,
            data,
            { withCredentials: true }
        );
        return response.data;
    },
};

export default authService;
