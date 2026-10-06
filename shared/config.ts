export const CONTACT_EMAIL = 'dropbeam1242@gmail.com';
export const APP_VERSION = '0.1.0-beta.1';
export const SERVICE_TYPE = 'dropbeam';
export const PROTOCOL_VERSION = '1';
export const MAX_FILES = 10_000;
export const features = [
  { name: 'LAN files & folders', free: true, status: 'development' },
  { name: 'Nearby device discovery', free: true, status: 'development' },
  { name: 'SHA-256 file manifests', free: true, status: 'working' },
  { name: 'Incoming transfer approval', free: true, status: 'planned' },
  { name: 'Text & link sharing', free: true, status: 'planned' },
  { name: 'Worldwide transfers', free: false, status: 'planned' },
  { name: '100 GB worldwide target', free: false, status: 'planned' },
  { name: 'Favorites & trusted remote devices', free: false, status: 'planned' },
  { name: 'Transfer history & queues', free: false, status: 'planned' },
  { name: 'Quick Send & Transfer Rooms', free: false, status: 'planned' },
  { name: 'Shared clipboard & Premium themes', free: false, status: 'planned' },
  { name: 'Resume & chunk recovery', free: false, status: 'planned' },
] as const;
export type Tier = 'free' | 'premium';
export function featureAvailable(name: string, tier: Tier) {
  const feature = features.find((f) => f.name === name);
  return !!feature && feature.status === 'working' && (feature.free || tier === 'premium');
}
