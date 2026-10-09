import { defineConfig } from "vite";

// In development the React app calls "/api/..." and Vite forwards it to the Express server,
// so there are no CORS problems. In production set VITE_API_URL to the deployed API URL.
export default defineConfig({
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: process.env.VITE_PROXY_TARGET || "http://localhost:5000",
                changeOrigin: true
            }
        }
    }
});
