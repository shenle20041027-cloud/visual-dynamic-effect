import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, __dirname, '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 4302,
      strictPort: true,
      hmr: false,
      proxy: {
        '/api': {
          target: 'http://localhost:4300',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
  };
});
