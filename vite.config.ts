import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: './', // Ensure paths are relative for the extension
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'), // Path to popup HTML
        background: resolve(__dirname, 'src/background.ts'), // Path to background script
      },
      output: {
        // Output all files to assets folder and remove nested src/popup structure
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js',
        manualChunks: undefined, // Avoid chunking into different directories
        preserveModules: false, // Flatten the output structure
      },
    },
  },
  publicDir: 'public', // Static files like manifest.json and icons
});
