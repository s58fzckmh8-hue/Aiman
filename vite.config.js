import { defineConfig } from "vite";
const proxy = {
  "/api": { target: "http://127.0.0.1:3001", changeOrigin: false },
  "/ws": { target: "ws://127.0.0.1:3001", ws: true, changeOrigin: false },
};
export default defineConfig({
  base: "./",
  server: { port: 5173, strictPort: true, proxy },
  preview: { proxy },
  build: {
    rollupOptions: { input: { main: "index.html", practice: "practice.html" } },
  },
});
