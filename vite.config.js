import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  // basicSsl gives the dev server HTTPS, which phones require before they allow camera access
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    // host: true exposes the dev server on your local network so your phone can open it
    host: true,
  },
  optimizeDeps: {
    // Transformers.js ships its own WASM files and breaks if Vite tries to pre-bundle it
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    format: 'es',
  },
})
