import { build } from 'esbuild';
await build({
  entryPoints: ['tests/discovery.smoke.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: '.artifacts/discovery-smoke.mjs',
  packages: 'external',
});
await import('../.artifacts/discovery-smoke.mjs');
