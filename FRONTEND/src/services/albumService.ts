import api from './api';
import { ENDPOINTS } from '../config/api';
import type { ApiResponse, Album, PaginatedResponse } from '../types';

export const albumService = {
    async getAlbums(page: number = 1): Promise<PaginatedResponse<Album>> {
        const response = await api.get<PaginatedResponse<Album>>(
            `${ENDPOINTS.GET_ALBUMS}?page=${page}`,
            { withCredentials: true }
        );
        return response.data;
    },

    async getAlbum(albumUuid: string, page: number = 1): Promise<ApiResponse<Album>> {
        const response = await api.get<ApiResponse<Album>>(
            `${ENDPOINTS.GET_ALBUM}${albumUuid}/?page=${page}`,
            { withCredentials: true }
        );
        return response.data;
    }
};

export default albumService;
