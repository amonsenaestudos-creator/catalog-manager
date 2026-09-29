import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // Caminhos relativos: o build funciona na raiz do domínio **e** numa
  // subpasta (GitHub Pages publica em /catalog-manager/). Como o aplicativo é
  // um arquivo só, não há motivo para amarrar nada a "/".
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    // O build single-file não precisa disparar recarregamentos durante o desenvolvimento.
    watch: { ignored: ["**/dist/**"] },
  },
});
