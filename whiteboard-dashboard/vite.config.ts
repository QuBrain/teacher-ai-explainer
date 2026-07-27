/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    css: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@xyflow/react")) return "vendor-reactflow";
          if (id.includes("katex") || id.includes("react-markdown") || id.includes("remark-math") || id.includes("rehype-katex")) return "vendor-math";
        },
      },
    },
  },
})
