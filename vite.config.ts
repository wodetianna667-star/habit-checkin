import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" 使构建产物使用相对路径，可部署到任意 GitHub Pages 子路径
export default defineConfig({
  plugins: [react()],
  base: "./",
});
