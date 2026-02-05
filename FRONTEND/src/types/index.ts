// User types
export interface User {
    user_uuid: string;
    email: string;
    username: string;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface AuthResponse {
    tokens: AuthTokens;
    user: User;
}

// API Response wrapper
export interface ApiResponse<T> {
    data: T;
    message: Record<string, string> | null;
    status: number;
}

// Auth request types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
}

export interface ChangePasswordRequest {
    old_password: string;
    new_password: string;
}

export interface UpdateProfileRequest {
    username?: string;
}

// Music types
export interface Song {
    song_uuid: string;
    title: string;
    artist_name?: string;
    album?: string;
    duration?: number;
    size?: number;
    mime_type?: string;
    uploaded_by?: string;
    thumbnail?: string;
}

export interface UploadSongResponse {
    message: string;
    song_uuid: string;
    title: string;
}

// Playlist types
export interface PlaylistSong {
    playlist_song_uuid: string;
    playlist: string;
    song: Song;
    added_at: string;
    order?: number;
}

export interface Playlist {
    playlist_uuid: string;
    name: string;
    created_at: string;
    songs: PlaylistSong[];
}

export interface CreatePlaylistRequest {
    name: string;
}

export interface UpdatePlaylistRequest {
    name: string;
}

export interface AddSongToPlaylistRequest {
    song_uuid: string;
}

// Artist types
export interface Artist {
    artist_uuid: string;
    name: string;
    created_by: number;
    created_at: string;
}

export interface ArtistDetail extends Artist {
    songs: Song[];
}

// Album types
export interface Album {
    album_uuid: string;
    artist: string; // artist_uuid
    title: string;
    cover_image: string | null;
    release_year: number | null;
    created_by: number;
    created_at: string;
}

export interface AlbumDetail extends Album {
    songs: Song[];
}

// Player state
export interface PlayerState {
    currentSong: Song | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    volume: number;
    currentPlaylist?: Song[];
    currentIndex?: number;
}
