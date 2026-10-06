import { premiumSchema } from '../shared/validation';
export function cloudUrl(value: string | undefined): URL | null {
  if (!value) return null;
  const url = new URL(value);
  if (
    url.protocol !== 'https:' &&
    !(
      process.env.DROPBEAM_ENV === 'development' &&
      url.protocol === 'http:' &&
      url.hostname === '127.0.0.1'
    )
  )
    throw new Error('DropBeam Cloud requires HTTPS.');
  if (url.username || url.password || url.search || url.hash)
    throw new Error('Invalid cloud configuration.');
  return url;
}
export async function sendPremium(
  base: URL | null,
  input: unknown,
): Promise<{ status: 'sent' | 'duplicate' }> {
  if (!base)
    throw new Error(
      'Premium requests are not connected yet. The project maintainer must configure DropBeam Cloud.',
    );
  const payload = premiumSchema.parse(input);
  const result = await fetch(new URL('/v1/premium-requests', base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
    redirect: 'error',
  });
  if (result.status === 429) throw new Error('Too many requests. Please try again later.');
  if (result.status === 409) return { status: 'duplicate' };
  if (result.status !== 201)
    throw new Error('Your request could not be confirmed. Please try again later.');
  return { status: 'sent' };
}
