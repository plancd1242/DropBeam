import { Bonjour, type Service, type Browser } from 'bonjour-service';
import { createServer, type Server } from 'node:net';
import { randomUUID } from 'node:crypto';
import { SERVICE_TYPE, PROTOCOL_VERSION } from '../shared/config';
import { settingsSchema } from '../shared/validation';
import type { Device, DiscoveryState } from '../shared/types';

export function parseDevice(service: Pick<Service, 'txt'>, selfId: string): Device | null {
  const txt = service.txt;
  if (
    !txt ||
    txt.v !== PROTOCOL_VERSION ||
    typeof txt.id !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(txt.id) ||
    txt.id === selfId
  )
    return null;
  const parsedName = settingsSchema.shape.deviceName.safeParse(txt.name ?? '');
  const name = parsedName.success ? parsedName.data : 'Unknown Device';
  const platform = ['darwin', 'win32', 'linux'].includes(txt.platform)
    ? ({ darwin: 'macOS', win32: 'Windows', linux: 'Linux' } as Record<string, string>)[
        txt.platform
      ]
    : 'Unknown platform';
  return { id: txt.id, name, platform, lastSeen: Date.now() };
}

export class Discovery {
  private id = randomUUID();
  private bonjour?: Bonjour;
  private browser?: Browser;
  private server?: Server;
  private devices = new Map<string, Device>();
  private error?: string;
  private generation = 0;
  private enabled = false;
  private refreshTimer?: NodeJS.Timeout;
  async start(name: string) {
    this.stop();
    const generation = this.generation;
    this.enabled = true;
    try {
      // Presence-only port. No requests, file access, or transfer API are exposed.
      const server = createServer((socket) => socket.destroy());
      server.maxConnections = 16;
      this.server = server;
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '0.0.0.0', resolve);
      });
      if (generation !== this.generation) {
        server.close();
        return;
      }
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('No discovery port');
      const fail = () => {
        this.error = 'Local discovery is unavailable. Check your network and firewall.';
      };
      server.on('error', fail);
      this.bonjour = new Bonjour({}, fail);
      const service = this.bonjour.publish({
        name: `DropBeam-${this.id}`,
        type: SERVICE_TYPE,
        protocol: 'tcp',
        port: address.port,
        txt: {
          v: PROTOCOL_VERSION,
          id: this.id,
          name,
          platform: process.platform,
          capability: 'presence-only',
        },
      });
      service.on('error', fail);
      const browse = () => {
        this.browser?.stop();
        this.browser = this.bonjour!.find({ type: SERVICE_TYPE, protocol: 'tcp' }, (service) => {
          const device = parseDevice(service, this.id);
          if (device && (this.devices.has(device.id) || this.devices.size < 100))
            this.devices.set(device.id, device);
          // Bound the library's cache as well as the user-visible list.
          if (this.browser && this.browser.services.length >= 200) this.browser.stop();
        });
        this.browser.on('down', (service) => {
          const device = parseDevice(service, this.id);
          if (device) this.devices.delete(device.id);
        });
        this.browser.on('txt-update', (service) => {
          const device = parseDevice(service, this.id);
          if (device && this.devices.has(device.id)) this.devices.set(device.id, device);
        });
      };
      browse();
      // Re-query with a fresh bounded browser; ungraceful disconnects expire after 90 seconds.
      this.refreshTimer = setInterval(browse, 30_000);
      this.refreshTimer.unref();
    } catch {
      this.stop();
      this.error = 'Could not start nearby discovery. Check network permissions.';
    }
  }
  snapshot(): DiscoveryState {
    for (const [id, device] of this.devices)
      if (Date.now() - device.lastSeen > 90_000) this.devices.delete(id);
    return { enabled: this.enabled, devices: [...this.devices.values()], error: this.error };
  }
  stop() {
    this.generation++;
    clearInterval(this.refreshTimer);
    this.browser?.stop();
    const bonjour = this.bonjour;
    if (bonjour) bonjour.unpublishAll(() => bonjour.destroy());
    this.server?.close();
    this.browser = undefined;
    this.bonjour = undefined;
    this.server = undefined;
    this.devices.clear();
    this.enabled = false;
    this.error = undefined;
  }
}
