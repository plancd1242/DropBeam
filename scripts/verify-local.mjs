import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const [frontend, cloud] = process.argv.slice(2);
for (const value of [frontend, cloud]) {
  const url = new URL(value);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.protocol, 'http:');
}
const ui = await fetch(frontend);
assert.equal(ui.status, 200);
assert.ok((await ui.text()).includes('<title>DropBeam</title>'));
console.log(`PASS frontend HTTP 200: ${frontend}`);
const health = await fetch(`${cloud}/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).service, 'DropBeam Cloud');
console.log(`PASS Cloud health HTTP 200: ${cloud}/health`);
for (const [label, body, headers, status] of [
  [
    'invalid recipient',
    { name: 'Caleb', requestId: randomUUID(), to: 'not-allowed@example.org' },
    {},
    400,
  ],
  [
    'browser origin',
    { name: 'Caleb', requestId: randomUUID() },
    { Origin: 'https://example.org' },
    403,
  ],
  ['oversized body', { name: 'x'.repeat(2000) }, {}, 413],
]) {
  const response = await fetch(`${cloud}/v1/premium-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, status);
  console.log(`PASS ${label}: HTTP ${status}`);
}
console.log('SKIP valid email submission: repeated probes must never send real email.');
assert.equal((await fetch(`${cloud}/v1/gifs`)).status, 501);
console.log('PASS planned GIPHY: HTTP 501');
