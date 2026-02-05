import api from './api';
import { ENDPOINTS } from '../config/api';
import type { ApiResponse, Artist, ArtistDetail } from '../types';

export const artistService = {
    async getArtists(): Promise<ApiResponse<Artist[]>> {
        const response = await api.get<ApiResponse<Artist[]>>(
            ENDPOINTS.GET_ARTISTS,
            { withCredentials: true }
        );
        return response.data;
    },

    async getArtist(artistUuid: string): Promise<ApiResponse<ArtistDetail>> {
        const response = await api.get<ApiResponse<ArtistDetail>>(
            `${ENDPOINTS.GET_ARTIST}${artistUuid}/`,
            { withCredentials: true }
        );
        return response.data;
    }
};

export default artistService;
