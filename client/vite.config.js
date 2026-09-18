import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const htmlBypass = (req) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return '/index.html';
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://localhost:5000',
      '/optimize-energy': {
        target: 'http://localhost:5000',
        bypass: htmlBypass,
      },
      '/scenarios': {
        target: 'http://localhost:5000',
        bypass: htmlBypass,
      },
      '/history': {
        target: 'http://localhost:5000',
        bypass: htmlBypass,
      },
      '/analytics': {
        target: 'http://localhost:5000',
        bypass: htmlBypass,
      },
      '/auth': {
        target: 'http://localhost:5000',
        bypass: htmlBypass,
      },
    },
  },
});
