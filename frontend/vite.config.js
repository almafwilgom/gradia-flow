import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function removeOptionalEmotionRequire() {
  const optionalEmotionRequire = /require\(["']@emotion\/is-prop-valid["']\)\.default/g;

  return {
    name: 'remove-optional-emotion-require',
    generateBundle(_options, bundle) {
      Object.values(bundle).forEach((chunk) => {
        if (chunk.type === 'chunk') {
          chunk.code = chunk.code.replace(optionalEmotionRequire, 'undefined');
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), removeOptionalEmotionRequire()],
  optimizeDeps: {
    include: ['use-sync-external-store']
  },
  server: {
    port: 5173,
    host: true
  }
});
