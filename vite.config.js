import { defineConfig } from 'vite';
import { copyFile } from 'node:fs/promises';
export default defineConfig({
  plugins: [{ name: 'go72-shell', async closeBundle() {
    for (const file of ['manifest.webmanifest', 'sw.js', 'offline.html']) await copyFile(file, 'dist/' + file);
  } }],
  server: { host: '0.0.0.0' }, preview: { host: '0.0.0.0' }, build: { target: 'es2022' }
});
