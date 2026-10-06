import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
await mkdir('.wrangler/logs', { recursive: true });
const child = spawn(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'deploy',
    '--dry-run',
    '--config',
    'cloud/wrangler.jsonc',
    '--outdir',
    path.resolve('dist/cloud'),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: path.resolve('.wrangler/logs'),
    },
  },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
