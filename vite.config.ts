import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PROXY = {
  '/ollama': {
    target: 'http://localhost:11434',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ollama/, ''),
  },
  // LLM proxy — keeps the OpenRouter key server-side.
  // The `/agent/sessions/:id/stream` endpoint is SSE; Vite's proxy
  // handles that correctly as long as we disable buffering on the
  // server side (see backend/server.py). Trailing slash is required
  // so the prefix doesn't catch frontend routes like /agentic-rounds.
  '^/agent/': {
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
  },
  // Real-time voice — backend mints LiveKit tokens.
  '^/voice/': {
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // `npm run app` sets MEDKIT_NO_OPEN=1 and opens the browser itself with a
    // detached stdout — otherwise the browser inherits the log pipe and keeps
    // the dev-runner's helper processes alive after shutdown.
    open: !process.env.MEDKIT_NO_OPEN,
    proxy: PROXY,
  },
  preview: {
    port: 5173,
    proxy: PROXY,
  },
});
