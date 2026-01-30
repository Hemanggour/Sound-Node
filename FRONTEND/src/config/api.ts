// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
  STREAM_SONG: '/song/stream/',
};
