import type { DurableObjectNamespace, DurableObjectState } from '@cloudflare/workers-types';
import { premiumSchema } from '../../shared/validation';
import { sendEmail, emailConfigured, type EmailEnv } from './email';
import { reserve, type GateState } from './limits';
export interface Env extends EmailEnv {
  REQUEST_GATE: DurableObjectNamespace;
}
const json = (status: number, value: object) =>
  Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
export async function limitedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1024) {
        await reader.cancel();
        throw new Error('Body too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
}
export async function digest(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET')
      return json(200, { service: 'DropBeam Cloud', version: 1 });
    if (url.pathname === '/v1/gifs') return json(501, { error: 'GIF search is coming soon.' });
    if (url.pathname !== '/v1/premium-requests') return json(404, { error: 'Not found.' });
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
    // Desktop main process only. No browser origins or permissive CORS; origin is not authentication.
    if (request.headers.has('Origin'))
      return json(403, { error: 'Browser requests are not supported.' });
    if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')
      return json(415, { error: 'Use application/json.' });
    if (Number(request.headers.get('Content-Length')) > 1024)
      return json(413, { error: 'Request too large.' });
    let payload;
    try {
      payload = premiumSchema.parse(await limitedJson(request));
    } catch {
      return json(400, { error: 'Invalid request.' });
    }
    if (!emailConfigured(env))
      return json(503, { error: 'Premium requests are not configured yet.' });
    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'local';
      const day = new Date().toISOString().slice(0, 10);
      const gate = env.REQUEST_GATE.get(env.REQUEST_GATE.idFromName('premium-global'));
      const result = await gate.fetch('https://internal/reserve', {
        method: 'POST',
        body: JSON.stringify({
          ip: await digest(`${day}:${ip}`),
          requestId: payload.requestId,
          nameHash: await digest(`${day}:${payload.name.toLocaleLowerCase('en-US')}`),
        }),
      });
      if (result.status === 409)
        return json(409, { error: 'This request was already submitted or attempted today.' });
      if (result.status === 429) return json(429, { error: 'Please try again tomorrow.' });
      if (result.status !== 200) return json(503, { error: 'Request service unavailable.' });
      // Reserve before contacting Gmail: ambiguous provider failures are not automatically resent.
      await sendEmail(env, payload.name);
      return json(201, { status: 'sent' });
    } catch {
      return json(503, { error: 'Delivery could not be confirmed. Avoid resubmitting today.' });
    }
  },
};
export class RequestGate {
  constructor(private ctx: DurableObjectState) {}
  async fetch(request: Request) {
    const input = (await request.json()) as { ip: string; requestId: string; nameHash: string };
    const status = await this.ctx.storage.transaction(async (txn) => {
      const previous = await txn.get<GateState>('limits');
      const next = reserve(previous, input, Date.now());
      await txn.put('limits', next.state);
      return next.status;
    });
    await this.ctx.storage.setAlarm(Date.now() + 48 * 60 * 60 * 1000);
    return new Response(null, { status });
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
