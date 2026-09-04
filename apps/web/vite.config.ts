import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@katacraft/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    // Bind all interfaces, not just localhost — required for the dev
    // server to be reachable through GitHub Codespaces' / any container's
    // port-forwarding proxy, which connects from outside the loopback
    // interface. Without this you get a 502 from the forwarded URL even
    // though `npm run dev` looks like it started fine.
    host: true,
    strictPort: true,
  },
});
