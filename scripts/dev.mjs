import { spawn } from 'node:child_process';
import { createServer, loadEnv } from 'vite';
import electron from 'electron';
import { startCloud } from './local-runtime.mjs';

const uiOnly = process.argv.includes('--ui-only');
const withCloud = process.argv.includes('--with-cloud');
const desktopEnv = { ...process.env };
// VS Code may export this for its own subprocesses; DropBeam needs GUI mode.
delete desktopEnv.ELECTRON_RUN_AS_NODE;
const publicEnv = loadEnv('development', process.cwd(), 'DROPBEAM_');
let server;
let desktop;
let cloud;
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  desktop?.kill();
  cloud?.child.kill();
  await server?.close();
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
try {
  if (withCloud) cloud = await startCloud();
  if (!uiOnly) await import('./build-desktop.mjs');
  server = await createServer({ server: { host: '127.0.0.1', port: 5173, strictPort: false } });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  console.log(`DropBeam frontend: ${url}`);
  console.log(
    uiOnly
      ? 'Browser preview only. Native file selection and discovery require npm run dev.'
      : 'Opening the DropBeam native desktop window.',
  );
  if (!uiOnly) {
    desktop = spawn(electron, ['.'], {
      stdio: 'inherit',
      env: {
        ...desktopEnv,
        DROPBEAM_DEV_URL: url,
        DROPBEAM_ENV: 'development',
        DROPBEAM_API_URL:
          process.env.DROPBEAM_API_URL || publicEnv.DROPBEAM_API_URL || cloud?.url || '',
      },
    });
    desktop.on('error', async (error) => {
      console.error(error.message);
      await stop();
      process.exitCode = 1;
    });
    desktop.on('exit', (code) => {
      if (!closing)
        console.log(
          `Desktop window closed (exit ${code ?? 0}). Frontend and Cloud remain running; press Ctrl+C to stop them.`,
        );
    });
  }
  cloud?.child.on('exit', async (code) => {
    if (!closing) {
      console.error('DropBeam Cloud exited.');
      await stop();
      process.exitCode = code || 1;
    }
  });
} catch (error) {
  await stop();
  throw error;
}
