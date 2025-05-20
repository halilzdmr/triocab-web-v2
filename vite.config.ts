import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Applying rule: Always add debug logs & comments in the code for easier debug & readability
export default defineConfig({
  base: "./",  
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Configure server to be accessible on local network for mobile testing
  server: {
    host: '0.0.0.0', // Expose to all network interfaces
    port: 5173      // Use the default Vite port
  }
});
