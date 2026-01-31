// API Configuration
const isDev = import.meta.env.MODE === "development";

export const API_BASE_URL = isDev
  ? "http://127.0.0.1:8000/api"
  : "/api";

console.log(`API_BASE_URL: ${API_BASE_URL}`);

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
