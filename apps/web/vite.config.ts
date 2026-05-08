import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes(`${String.raw`node_modules/react/`}`) ||
            id.includes(`${String.raw`node_modules/react-dom/`}`) ||
            id.includes(`${String.raw`node_modules/scheduler/`}`)
          ) {
            return 'react-core';
          }

          if (
            id.includes(`${String.raw`node_modules/react-router/`}`) ||
            id.includes(`${String.raw`node_modules/react-router-dom/`}`) ||
            id.includes(`${String.raw`node_modules/@remix-run/router/`}`)
          ) {
            return 'router';
          }

          if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'state-query';
          }

          if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('rehype-sanitize')) {
            return 'markdown';
          }

          if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('sonner')) {
            return 'ui-vendor';
          }

          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('/zod/')) {
            return 'forms';
          }

          if (id.includes('socket.io-client')) {
            return 'socket';
          }

          return 'vendor';
        },
      },
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
});
