import api from './api';
import { ENDPOINTS } from '../config/api';
import type {
    ApiResponse,
    Playlist,
    PlaylistSong,
    CreatePlaylistRequest,
    UpdatePlaylistRequest,
    AddSongToPlaylistRequest
} from '../types';

export const playlistService = {
    async getPlaylists(): Promise<ApiResponse<Playlist[]>> {
        const response = await api.get<ApiResponse<Playlist[]>>(
            ENDPOINTS.GET_PLAYLISTS,
            { withCredentials: true }
        );
        return response.data;
    },

    async createPlaylist(data: CreatePlaylistRequest): Promise<ApiResponse<Playlist>> {
        const response = await api.post<ApiResponse<Playlist>>(
            ENDPOINTS.CREATE_PLAYLIST,
            data,
            { withCredentials: true }
        );
        return response.data;
    },

    async updatePlaylist(playlistUuid: string, data: UpdatePlaylistRequest): Promise<ApiResponse<Playlist>> {
        const response = await api.patch<ApiResponse<Playlist>>(
            `${ENDPOINTS.UPDATE_PLAYLIST}${playlistUuid}/`,
            data,
            { withCredentials: true }
        );
        return response.data;
    },

    async deletePlaylist(playlistUuid: string): Promise<ApiResponse<null>> {
        const response = await api.delete<ApiResponse<null>>(
            `${ENDPOINTS.DELETE_PLAYLIST}${playlistUuid}/`,
            { withCredentials: true }
        );
        return response.data;
    },

    async getPlaylistSongs(playlistUuid: string): Promise<ApiResponse<PlaylistSong[]>> {
        const response = await api.get<ApiResponse<PlaylistSong[]>>(
            `${ENDPOINTS.GET_PLAYLIST_SONGS}${playlistUuid}/`,
            { withCredentials: true }
        );
        return response.data;
    },

    async addSongToPlaylist(playlistUuid: string, data: AddSongToPlaylistRequest): Promise<ApiResponse<PlaylistSong>> {
        const response = await api.post<ApiResponse<PlaylistSong>>(
            `${ENDPOINTS.ADD_SONG_TO_PLAYLIST}${playlistUuid}/`,
            data,
            { withCredentials: true }
        );
        return response.data;
    },

    async removeSongFromPlaylist(playlistUuid: string, playlistSongUuid: string): Promise<ApiResponse<null>> {
        const response = await api.delete<ApiResponse<null>>(
            `${ENDPOINTS.REMOVE_SONG_FROM_PLAYLIST}${playlistUuid}/`,
            {
                data: { playlist_song_uuid: playlistSongUuid },
                withCredentials: true
            }
        );
        return response.data;
    },
};

export default playlistService;
