import { startCloud } from './local-runtime.mjs';
const { child } = await startCloud();
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
child.on('exit', (code) => process.exit(code ?? 0));
