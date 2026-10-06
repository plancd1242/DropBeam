import { CONTACT_EMAIL } from '../../shared/config';
import { premiumMessage } from '../../shared/validation';
export interface EmailEnv {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  EMAIL_FROM_ADDRESS?: string;
}
export function emailConfigured(env: EmailEnv) {
  return !!(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_REFRESH_TOKEN &&
    env.EMAIL_FROM_ADDRESS &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/.test(env.EMAIL_FROM_ADDRESS)
  );
}
function base64url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function encodeEmail(name: string, from: string) {
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/.test(from))
    throw new Error('Invalid sender configuration');
  return base64url(
    `From: ${from}\r\nTo: ${CONTACT_EMAIL}\r\nSubject: DropBeam Premium request\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${premiumMessage(name).replace(/\n/g, '\r\n')}`,
  );
}
export async function sendEmail(env: EmailEnv, name: string, request: typeof fetch = fetch) {
  if (!emailConfigured(env)) throw new Error('Email not configured');
  const tokenResponse = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(8000),
    redirect: 'error',
  });
  if (!tokenResponse.ok) throw new Error('Email provider unavailable');
  const token = (await tokenResponse.json()) as { access_token?: unknown };
  if (typeof token.access_token !== 'string') throw new Error('Email provider unavailable');
  const response = await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encodeEmail(name, env.EMAIL_FROM_ADDRESS!) }),
    signal: AbortSignal.timeout(8000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error('Email provider unavailable');
}
