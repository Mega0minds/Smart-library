import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        addBook: resolve(__dirname, 'add-book.html'),
        authors: resolve(__dirname, 'authors.html'),
        highlights: resolve(__dirname, 'highlights.html'),
        wishlist: resolve(__dirname, 'wishlist.html'),
        genres: resolve(__dirname, 'genres.html'),
      },
    },
  },
});
