import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:mobile` enables a self-signed HTTPS cert so camera (getUserMedia)
// works on a real phone over the LAN. Desktop localhost can use plain `npm run dev`.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'mobile' ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 5173
  }
}));
