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
}

export interface UploadSongResponse {
    message: string;
    song_uuid: string;
    title: string;
}

// Player state
export interface PlayerState {
    currentSong: Song | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    volume: number;
}
