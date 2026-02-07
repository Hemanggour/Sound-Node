// API Configuration
const isDev = import.meta.env.MODE === "development";

export const API_BASE_URL = isDev
  ? "http://localhost:8000/api"
  : "/api";

export const IMAGE_BASE_URL = isDev
  ? "http://localhost:8000"
  : "";

// Endpoints
export const ENDPOINTS = {
  // Auth
  REGISTER: '/account/register/',
  LOGIN: '/account/login/',
  refresh: '/account/token/refresh/',
  CHANGE_PASSWORD: '/account/change-password/',
  PROFILE: '/account/profile/',

  // Music
  GET_SONGS: '/songs/',
  UPLOAD_SONG: '/song/upload/',
  DELETE_SONG: '/song/delete/',
  STREAM_SONG: '/song/stream/',

  // Playlists
  GET_PLAYLISTS: '/playlists/',
  CREATE_PLAYLIST: '/playlists/',
  UPDATE_PLAYLIST: '/playlist/',
  DELETE_PLAYLIST: '/playlist/',
  GET_PLAYLIST_SONGS: '/playlist/song/add/',
  ADD_SONG_TO_PLAYLIST: '/playlist/song/add/',
  REMOVE_SONG_FROM_PLAYLIST: '/playlist/song/remove/',

  // Artists
  GET_ARTISTS: '/artists/',
  GET_ARTIST: '/artist/',

  // Albums
  GET_ALBUMS: '/albums/',
  GET_ALBUM: '/album/',
};
