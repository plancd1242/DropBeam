import { build } from 'esbuild';
await build({
  entryPoints: ['desktop/main.ts', 'desktop/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outdir: 'dist-electron',
  outExtension: { '.js': '.cjs' },
  external: ['electron'],
  sourcemap: true,
});
