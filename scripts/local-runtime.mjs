import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function availablePort(preferred) {
  for (let port = preferred; port < preferred + 100; port++) {
    const server = createServer();
    const free = await new Promise((resolve, reject) => {
      server.once('error', (error) =>
        error.code === 'EADDRINUSE' ? resolve(false) : reject(error),
      );
      server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
    });
    if (free) return port;
  }
  throw new Error('No available local port in the requested range.');
}
export async function startCloud() {
  const port = await availablePort(8787);
  const inspectorPort = await availablePort(9230);
  await mkdir('.wrangler/logs', { recursive: true });
  const child = spawn(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'dev',
      '--config',
      'cloud/wrangler.jsonc',
      '--local',
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--inspector-port',
      String(inspectorPort),
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
  const url = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null) throw new Error('DropBeam Cloud stopped before it was ready.');
      try {
        const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(700) });
        if (response.ok && (await response.json()).service === 'DropBeam Cloud') {
          console.log(`DropBeam Cloud: ${url} (local only; no deployment)`);
          return { child, url };
        }
      } catch {
        /* Workerd may still be starting. Retry for a bounded time. */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('DropBeam Cloud did not respond within 30 seconds.');
  } catch (error) {
    child.kill();
    throw error;
  }
}
