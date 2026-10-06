import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { Discovery } from '../desktop/discovery';
const first = new Discovery();
const second = new Discovery();
async function until(predicate: () => boolean, description: string) {
  for (let i = 0; i < 60; i++) {
    if (predicate()) return;
    await delay(200);
  }
  throw new Error(
    `Timed out: ${description}; A=${JSON.stringify({ error: first.snapshot().error, count: first.snapshot().devices.length })}; B=${JSON.stringify({ error: second.snapshot().error, count: second.snapshot().devices.length })}`,
  );
}
try {
  await first.start('DropBeam smoke A');
  await second.start('DropBeam smoke B');
  assert.equal(first.snapshot().error, undefined);
  assert.equal(second.snapshot().error, undefined);
  await until(
    () =>
      first.snapshot().devices.some((d) => d.name === 'DropBeam smoke B') &&
      second.snapshot().devices.some((d) => d.name === 'DropBeam smoke A'),
    'mutual mDNS discovery',
  );
  second.stop();
  await until(
    () => !first.snapshot().devices.some((d) => d.name === 'DropBeam smoke B'),
    'mDNS goodbye removal',
  );
  console.log(
    'PASS: two real mDNS instances discovered each other and processed goodbye removal. No file transfer was attempted.',
  );
} finally {
  first.stop();
  second.stop();
}
