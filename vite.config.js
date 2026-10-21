import { defineConfig } from "vite";
const proxy = {
  "/api": {
    target: `http://127.0.0.1:${process.env.PORT ?? 3001}`,
    changeOrigin: false,
  },
  "/ws": {
    target: `ws://127.0.0.1:${process.env.PORT ?? 3001}`,
    ws: true,
    changeOrigin: false,
  },
};
export default defineConfig({
  base: "./",
  server: {
    port: Number(process.env.VITE_PORT ?? 5173),
    strictPort: true,
    proxy,
  },
  preview: { proxy },
  build: {
    rollupOptions: { input: { main: "index.html", practice: "practice.html" } },
  },
});
