import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Backend (Express/FastAPI) runs separately; /api is proxied to it in dev.
const API_TARGET = process.env.API_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    fs: { allow: ['..'] }, // seed data lives in ../data/issues.json
    proxy: { '/api': { target: API_TARGET, changeOrigin: true } },
  },
});
