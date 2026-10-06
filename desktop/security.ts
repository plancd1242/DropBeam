/** Development may load only an explicitly supplied loopback origin. Packaged apps ignore it. */
export function developmentEntry(value: string | undefined, packaged: boolean): string | null {
  if (packaged || !value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'http:' ||
      url.hostname !== '127.0.0.1' ||
      !url.port ||
      Number(url.port) < 1024 ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
