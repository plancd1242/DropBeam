import { describe, expect, it, vi } from 'vitest';
import worker, { limitedJson, type Env } from '../cloud/src/index';
import { reserve } from '../cloud/src/limits';
import { encodeEmail, sendEmail } from '../cloud/src/email';
const emailEnv = {
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-secret',
  GOOGLE_REFRESH_TOKEN: 'test-refresh',
  EMAIL_FROM_ADDRESS: 'sender@example.org',
};
const request = (value: unknown, headers: Record<string, string> = {}) =>
  new Request('https://cloud.example/v1/premium-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(value),
  });
const input = () => ({ name: 'Caleb', requestId: crypto.randomUUID() });
const env = {} as Env;
describe('Premium endpoint', () => {
  it('is unavailable without credentials, never returns fake success', async () =>
    expect((await worker.fetch(request(input()), env)).status).toBe(503));
  it('rejects arbitrary recipients and injected headers', async () => {
    expect((await worker.fetch(request({ ...input(), to: 'evil@example.org' }), env)).status).toBe(
      400,
    );
    expect(
      (await worker.fetch(request({ ...input(), name: 'Caleb\r\nBcc:evil' }), env)).status,
    ).toBe(400);
  });
  it('rejects browser origins', async () =>
    expect(
      (await worker.fetch(request(input(), { Origin: 'https://evil.example' }), env)).status,
    ).toBe(403));
  it('rejects oversized chunked input without relying on Content-Length', async () => {
    await expect(
      limitedJson(new Request('https://test', { method: 'POST', body: 'a'.repeat(1025) })),
    ).rejects.toThrow('too large');
  });
  it('rejects unsupported verbs and routes', async () => {
    expect(
      (await worker.fetch(new Request('https://cloud.example/v1/premium-requests'), env)).status,
    ).toBe(405);
    expect((await worker.fetch(new Request('https://cloud.example/nope'), env)).status).toBe(404);
    expect((await worker.fetch(new Request('https://cloud.example/v1/gifs'), env)).status).toBe(
      501,
    );
  });
  it('blocks sending when reservation is denied', async () => {
    const provider = vi.fn();
    vi.stubGlobal('fetch', provider);
    const gatedEnv = {
      ...emailEnv,
      REQUEST_GATE: {
        idFromName: () => 'id',
        get: () => ({ fetch: async () => new Response(null, { status: 429 }) }),
      },
    } as unknown as Env;
    expect((await worker.fetch(request(input()), gatedEnv)).status).toBe(429);
    expect(provider).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('only reports sent after provider acceptance', async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'test-token' }))
      .mockResolvedValueOnce(Response.json({ id: 'provider-id' }));
    vi.stubGlobal('fetch', provider);
    const gatedEnv = {
      ...emailEnv,
      REQUEST_GATE: {
        idFromName: () => 'id',
        get: () => ({ fetch: async () => new Response(null, { status: 200 }) }),
      },
    } as unknown as Env;
    expect((await worker.fetch(request(input()), gatedEnv)).status).toBe(201);
    expect(provider).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
describe('persistent reservation policy', () => {
  const now = Date.UTC(2026, 9, 2, 12);
  it('prevents replay and duplicate names', () => {
    const value = { ip: 'ip', requestId: 'id', nameHash: 'name' };
    const first = reserve(undefined, value, now);
    expect(first.status).toBe(200);
    expect(reserve(first.state, value, now + 1).status).toBe(409);
    expect(reserve(first.state, { ...value, requestId: 'new' }, now + 1).status).toBe(409);
  });
  it('limits each source to 3 attempts per UTC day', () => {
    let state;
    for (let i = 0; i < 3; i++) {
      const result = reserve(state, { ip: 'same', requestId: `id${i}`, nameHash: `n${i}` }, now);
      expect(result.status).toBe(200);
      state = result.state;
    }
    expect(reserve(state, { ip: 'same', requestId: 'four', nameHash: 'four' }, now).status).toBe(
      429,
    );
    expect(
      reserve(state, { ip: 'same', requestId: 'four', nameHash: 'four' }, now + 86400000).status,
    ).toBe(200);
  });
  it('caps global attempts at 100 even with changing IPs', () => {
    let state;
    for (let i = 0; i < 100; i++)
      state = reserve(state, { ip: `${i}`, requestId: `${i}`, nameHash: `${i}` }, now).state;
    expect(reserve(state, { ip: 'new', requestId: 'new', nameHash: 'new' }, now).status).toBe(429);
  });
});
describe('server-side Gmail', () => {
  it('encodes UTF-8 content with fixed destination', () => {
    const decoded = Buffer.from(encodeEmail('María', 'sender@example.org'), 'base64url').toString(
      'utf8',
    );
    expect(decoded).toContain('To: dropbeam1242@gmail.com\r\n');
    expect(decoded).toContain('Dear María,');
    expect(() => encodeEmail('Caleb', 'x\r\nBcc:evil')).toThrow();
  });
  it('rejects OAuth failure without attempting Gmail send', async () => {
    const provider = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    await expect(sendEmail(emailEnv, 'Caleb', provider)).rejects.toThrow('unavailable');
    expect(provider).toHaveBeenCalledTimes(1);
  });
});
