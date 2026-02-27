import api from './api';
import { ENDPOINTS } from '../config/api';
import type { ApiResponse, Artist, PaginatedResponse } from '../types';

export const artistService = {
    async getArtists(page: number = 1): Promise<PaginatedResponse<Artist>> {
        const response = await api.get<PaginatedResponse<Artist>>(
            `${ENDPOINTS.GET_ARTISTS}?page=${page}`,
            { withCredentials: true }
        );
        return response.data;
    },

    async getArtist(artistUuid: string, page: number = 1): Promise<ApiResponse<Artist>> {
        const response = await api.get<ApiResponse<Artist>>(
            `${ENDPOINTS.GET_ARTIST}${artistUuid}/?page=${page}`,
            { withCredentials: true }
        );
        return response.data;
    }
};

export default artistService;
