import type { Settings } from './validation';
export interface Device {
  id: string;
  name: string;
  platform: string;
  lastSeen: number;
}
export interface ManifestFile {
  name: string;
  size: number;
  sha256: string;
}
export interface Selection {
  id: string;
  name: string;
  kind: 'files' | 'folder';
  files: ManifestFile[];
  totalBytes: number;
}
export interface DiscoveryState {
  enabled: boolean;
  devices: Device[];
  error?: string;
}
export interface DesktopBridge {
  settings: { get(): Promise<Settings>; save(value: Settings): Promise<Settings> };
  select(kind: 'files' | 'folder'): Promise<Selection | null>;
  discovery(): Promise<DiscoveryState>;
  premiumStatus(): Promise<{ configured: boolean }>;
  requestPremium(name: string, requestId: string): Promise<{ status: 'sent' | 'duplicate' }>;
}
declare global {
  interface Window {
    dropbeam?: DesktopBridge;
  }
}
