import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        '__SMOKE_TEST__': JSON.stringify(mode === 'smoke'),
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          // Multi-page build: the warm-up (/) and the follow-up page stay
          // free of activity code. Only practical-task.html loads the game.
          input: {
            main: path.resolve(__dirname, 'index.html'),
            classroom: path.resolve(__dirname, 'classroom-activity.html'),
            practical: path.resolve(__dirname, 'practical-task.html'),
          },
        },
      }
    };
});