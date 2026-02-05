import api from './api';
import { ENDPOINTS } from '../config/api';
import type { ApiResponse, Album, AlbumDetail } from '../types';

export const albumService = {
    async getAlbums(): Promise<ApiResponse<Album[]>> {
        const response = await api.get<ApiResponse<Album[]>>(
            ENDPOINTS.GET_ALBUMS,
            { withCredentials: true }
        );
        return response.data;
    },

    async getAlbum(albumUuid: string): Promise<ApiResponse<AlbumDetail>> {
        const response = await api.get<ApiResponse<AlbumDetail>>(
            `${ENDPOINTS.GET_ALBUM}${albumUuid}/`,
            { withCredentials: true }
        );
        return response.data;
    }
};

export default albumService;
