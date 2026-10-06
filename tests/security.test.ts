import { describe, expect, it, vi } from 'vitest';
import { developmentEntry } from '../desktop/security';
import { cloudUrl, sendPremium } from '../desktop/cloud';
describe('native URL boundary', () => {
  it('allows the actual loopback development port only', () => {
    expect(developmentEntry('http://127.0.0.1:5174', false)).toBe('http://127.0.0.1:5174/');
    for (const url of [
      'https://evil.test',
      'http://127.0.0.1:5173/evil',
      'http://user@127.0.0.1:5173',
      'file:///tmp/app.html',
      'http://127.0.0.1:5173/#evil',
      'http://127.0.0.1:80',
    ])
      expect(developmentEntry(url, false)).toBeNull();
    expect(developmentEntry('http://127.0.0.1:5173', true)).toBeNull();
  });
  it('requires HTTPS except explicit local development', () => {
    vi.stubEnv('DROPBEAM_ENV', 'production');
    expect(() => cloudUrl('http://example.org')).toThrow('HTTPS');
    expect(() => cloudUrl('http://127.0.0.1:8787')).toThrow('HTTPS');
    expect(() => cloudUrl('https://user:password@example.org')).toThrow('Invalid');
    vi.stubEnv('DROPBEAM_ENV', 'development');
    expect(cloudUrl('http://127.0.0.1:8788')?.port).toBe('8788');
    vi.unstubAllEnvs();
  });
  it('never treats a redirect, failure, or unexpected success code as a sent email', async () => {
    const payload = { name: 'Caleb', requestId: crypto.randomUUID() };
    for (const status of [200, 202, 302, 400, 503]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
      await expect(sendPremium(new URL('https://cloud.example'), payload)).rejects.toThrow(
        'could not be confirmed',
      );
    }
  });
  it('distinguishes duplicate attempts from confirmed sends', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 409 })));
    await expect(
      sendPremium(new URL('https://cloud.example'), {
        name: 'Caleb',
        requestId: crypto.randomUUID(),
      }),
    ).resolves.toEqual({ status: 'duplicate' });
  });
});
