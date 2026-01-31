import api from './api';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type { ApiResponse, UploadSongResponse, Song } from '../types';

export const musicService = {
    async getSongs(): Promise<ApiResponse<Song[]>> {
        const response = await api.get<ApiResponse<Song[]>>(ENDPOINTS.GET_SONGS);
        return response.data;
    },

    async uploadSong(file: File): Promise<ApiResponse<UploadSongResponse>> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<ApiResponse<UploadSongResponse>>(
            ENDPOINTS.UPLOAD_SONG,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    getStreamUrl(songUuid: string): string {
        return `${API_BASE_URL}${ENDPOINTS.STREAM_SONG}${songUuid}/`;
    },
};

export default musicService;
