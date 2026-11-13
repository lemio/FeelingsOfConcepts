import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works on GitHub Pages (served from /<repo>/) and from any folder.
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
  },
});
