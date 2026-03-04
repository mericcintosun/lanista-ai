// Centralized API base URL (includes /api prefix)
// In production, set VITE_API_URL to your deployed backend URL (e.g., https://your-app.up.railway.app/api)
// In development, defaults to localhost:3001/api
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
