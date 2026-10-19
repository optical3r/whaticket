import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ["@mui/material", "@emotion/react", "@emotion/styled", "tss-react"],
        },
      },
    },
  },
  envPrefix: "VITE_",
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
    include: [
      "mic-recorder-to-mp3",
      "@mui/material",
      "@mui/icons-material",
      "tss-react/mui",
      // use-sound loads howler dynamically; prebundling gives it named exports.
      "howler",
    ],
    exclude: [],
  },
});
