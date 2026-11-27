import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('shoprite-catalog-data') || id.includes('shoprite-stores-sa')) {
            return 'shoprite-offline-catalog';
          }
          if (id.includes('node_modules/jsbarcode') || id.includes('node_modules/qrcode') || id.includes('node_modules/@zxing')) {
            return 'vendor-pos-barcode';
          }
          if (id.includes('node_modules/tesseract')) {
            return 'vendor-local-ocr';
          }
        }
      }
    }
  }
});
