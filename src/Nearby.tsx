import { ChevronRight, Laptop, Radio } from 'lucide-react';
import type { DiscoveryState } from '../shared/types';
export function Nearby({
  discovery,
  showSettings,
  canEnable,
  openDetails,
  enable,
}: {
  discovery: DiscoveryState;
  showSettings: boolean;
  canEnable: boolean;
  openDetails(): void;
  enable(): void;
}) {
  return (
    <section className="nearby">
      <p className="discovery-note">
        Experimental discovery · multicast and two-computer validation still pending.
      </p>
      <div className="section-heading">
        <h2>
          Nearby computers <span className="count">{discovery.devices.length}</span>
        </h2>
        <button className="text-button" onClick={openDetails}>
          {showSettings ? 'Discovery settings' : 'View devices'}
          <ChevronRight size={15} />
        </button>
      </div>
      {discovery.error && (
        <div role="alert" className="notice">
          {discovery.error}
        </div>
      )}
      {discovery.devices.length ? (
        <div className="device-grid">
          {discovery.devices.map((device) => (
            <article key={device.id} className="device-card">
              <div className="device-icon">
                <Laptop size={31} />
              </div>
              <h3>{device.name}</h3>
              <p>{device.platform}</p>
              <span className="device-status">
                <Radio size={13} /> Nearby · unverified
              </span>
              <small>Presence only · transfers coming soon</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty nearby-empty">
          <div className="radar">
            <Radio size={29} />
          </div>
          <h3>
            {discovery.enabled ? 'Looking for your other computers' : 'Good things are nearby.'}
          </h3>
          <p>
            {discovery.enabled
              ? 'Open DropBeam and enable discovery on another computer connected to the same network.'
              : 'Turn on discovery to find DropBeam computers on your local network.'}
          </p>
          {!discovery.enabled && (
            <button className="secondary" disabled={!canEnable} onClick={enable}>
              <Radio size={16} /> Enable nearby discovery
            </button>
          )}
          <small>
            {discovery.enabled
              ? 'Discovery does not grant trust or file access.'
              : 'Your device name will be visible on your network.'}
          </small>
        </div>
      )}
    </section>
  );
}
