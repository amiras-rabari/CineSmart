import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Framework code in its own long-cached chunks; everything else follows the lazy routes. */
const VENDOR_CHUNKS: Record<string, RegExp> = {
  react: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
  router: /[\\/]node_modules[\\/]react-router[\\/]/,
  query: /[\\/]node_modules[\\/]@tanstack[\\/](query-core|react-query)[\\/]/,
};

function vendorChunk(id: string): string | undefined {
  return Object.keys(VENDOR_CHUNKS).find((name) => VENDOR_CHUNKS[name]!.test(id));
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Port must match the backend's CORS default (contract [CONV-1]).
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  build: { rollupOptions: { output: { manualChunks: vendorChunk } } },
});
