import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  // Rutas relativas: sirve en GitHub Pages sea cual sea el nombre del repo.
  base: mode === "github-pages" ? "./" : "/",
  plugins: [react()]
}));
