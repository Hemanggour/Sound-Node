import api from './api';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type { ApiResponse, UploadSongResponse, Song, PaginatedResponse } from '../types';

export const musicService = {
    async getSongs(params?: { q?: string; artist_uuid?: string; album_uuid?: string; page?: number }): Promise<PaginatedResponse<Song>> {
        const response = await api.get<PaginatedResponse<Song>>(ENDPOINTS.GET_SONGS, {
            params,
            withCredentials: true
        });
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
                withCredentials: true,
            }
        );
        return response.data;
    },

    async deleteSong(songUuid: string): Promise<ApiResponse<null>> {
        const response = await api.delete<ApiResponse<null>>(`${ENDPOINTS.DELETE_SONG}${songUuid}/`, { withCredentials: true });
        return response.data;
    },

    getStreamUrl(songUuid: string): string {
        return `${API_BASE_URL}${ENDPOINTS.STREAM_SONG}${songUuid}/`;
    },
    async getPlaybackQueue(params: { artist_uuid?: string; album_uuid?: string; playlist_uuid?: string; q?: string; shuffle?: boolean; start_song_uuid?: string }): Promise<{ queue: string[] }> {
        const response = await api.get<{ data: { queue: string[] } }>(ENDPOINTS.GET_PLAYBACK_QUEUE, {
            params,
            withCredentials: true
        });
        return response.data.data;
    },

    async getSong(songUuid: string): Promise<Song> {
        const response = await api.get<{ data: Song }>(`${ENDPOINTS.GET_SONG}${songUuid}/`, {
            withCredentials: true
        });
        return response.data.data;
    },
};

export default musicService;
