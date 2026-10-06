import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [
    react(),
    {
      name: 'dropbeam-development-csp',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          // Vite's React refresh preamble needs a nonce. Production permits only external scripts.
          return command === 'serve'
            ? html
                .replace("script-src 'self'", "script-src 'self' 'nonce-dropbeam-development'")
                .replace("connect-src 'self'", "connect-src 'self' ws://127.0.0.1:*")
            : html;
        },
      },
    },
  ],
  html: command === 'serve' ? { cspNonce: 'dropbeam-development' } : undefined,
  server: { host: '127.0.0.1', strictPort: false },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubGlobals: true,
  },
}));
