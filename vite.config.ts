import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  // ./ = caminhos RELATIVOS (ideal para hospedagem compartilhada / subdomínios
  // onde a raiz do DOMÍNIO pode não coincidir 1:1 com a raiz do documento).
  // Evita tela branca por 404 em /assets/... quando o path não bate exato.
  base: './',

  plugins: [react()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2019',
    // Garante que o index.html seja criado (modo SPA)
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Mantém nomes determinísticos, facilita debug do deploy
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          if (/\.(woff2?|ttf|eot|otf)$/.test(name)) return 'assets/fonts/[name]-[hash][extname]';
          if (/\.(css)$/.test(name)) return 'assets/css/[name]-[hash][extname]';
          if (/\.(png|jpe?g|webp|gif|svg|ico)$/.test(name)) return 'assets/img/[name]-[hash][extname]';
          return 'assets/misc/[name]-[hash][extname]';
        },
      },
    },
  },

  server: {
    // History API fallback para SPA no dev server
    historyApiFallback: true,
  },

  preview: {
    historyApiFallback: true,
  },
});
