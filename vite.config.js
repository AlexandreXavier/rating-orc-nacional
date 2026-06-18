import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// SPA Svelte 4. provas.json é gerado por scripts/build-provas.mjs (ver ADR 0001):
// o cruzamento nome→certificado é pré-calculado em build, nunca em runtime.
export default defineConfig({
  plugins: [svelte()],
});
