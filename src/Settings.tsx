import { Celebration } from './Celebration';
import { Sparkles } from './SparkleMark';
import { Monitor, Palette, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { Settings as Preferences } from '../shared/validation';
interface Props {
  value: Preferences;
  save(value: Preferences): Promise<void>;
  premium(): void;
}
export function Settings({ value, save, premium }: Props) {
  const [deviceName, setName] = useState(value.deviceName);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(0);
  async function update(next: Preferences) {
    setSaving(true);
    try {
      await save(next);
    } finally {
      setSaving(false);
    }
  }
  function toggle(key: keyof Preferences, title: string, description: string) {
    return (
      <label className="setting-row" key={key}>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={!!value[key]}
          disabled={saving}
          onChange={(e) => void update({ ...value, [key]: e.target.checked })}
        />
      </label>
    );
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>Your DropBeam, your way.</h1>
        <p>Useful by default. A little more you, if you like.</p>
      </div>
      <section className="settings-section">
        <h2>
          <Palette size={19} /> Appearance
        </h2>
        <label className="setting-row">
          <span>
            <strong>Color mode</strong>
            <small>Follow your computer, or choose a side.</small>
          </span>
          <select
            aria-label="Color mode"
            value={value.theme}
            disabled={saving}
            onChange={(e) =>
              void update({ ...value, theme: e.target.value as Preferences['theme'] })
            }
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        {toggle('bigText', 'Big text', 'A little more breathing room for your eyes.')}
        {toggle('reducedMotion', 'Reduced motion', 'Keep transitions and animations to a minimum.')}
        {toggle('compact', 'Compact mode', 'A closer fit for smaller screens.')}
      </section>
      <section className="settings-section">
        <h2>
          <Sparkles size={19} /> A little personality
        </h2>
        {toggle(
          'comic',
          'Comic Sans MS Bold Mode',
          'Serious file preparation. Unserious typography. Uses a fallback if unavailable.',
        )}
        {toggle('sparkles', 'Sparkle mode', 'A gentle shimmer on the Premium invitation.')}
        {toggle(
          'serious',
          'Super Serious Business Mode',
          'Suppress playful fonts, sparkles, and celebrations.',
        )}
        {toggle(
          'celebration',
          'Local celebrations',
          'A small offline animation for successful Premium requests; transfer celebrations are planned.',
        )}
        <div className="celebration-preview">
          <button
            className="secondary"
            disabled={!value.celebration || value.serious}
            onClick={() => setPreview((n) => n + 1)}
          >
            Preview celebration
          </button>
          {preview > 0 && (
            <Celebration key={preview} active={value.celebration && !value.serious} />
          )}
        </div>
        <p className="footnote">
          Rainbow transfer progress, completion sounds, and optional GIFs: coming soon, alongside
          transfers.
        </p>
      </section>
      <section className="settings-section">
        <h2>
          <Monitor size={19} /> This computer
        </h2>
        <form
          className="device-name-form"
          onSubmit={(e) => {
            e.preventDefault();
            void update({ ...value, deviceName });
          }}
        >
          <label htmlFor="device-name">DropBeam device name</label>
          <div className="button-row">
            <input
              id="device-name"
              maxLength={60}
              value={deviceName}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button disabled={saving} className="secondary">
              Save name
            </button>
          </div>
          <small>This name is visible to nearby DropBeam instances when discovery is on.</small>
        </form>
        {toggle(
          'discoverable',
          'Nearby discovery',
          'Advertise this computer and look for DropBeam on your local network.',
        )}
        <p className="footnote">Device avatars and native notifications are coming soon.</p>
      </section>
      <section className="settings-section">
        <h2>
          <ShieldCheck size={19} /> Receiving & transfers
        </h2>
        <p>
          Receiver approval, destination selection, no-overwrite writes, and live transfer progress
          are in development. This build does not accept incoming files.
        </p>
        <div className="policy">
          <SlidersHorizontal size={18} />
          <span>Planned defaults: ask every time · preserve filenames · never overwrite</span>
        </div>
      </section>
      <section className="settings-section">
        <h2>
          <Sparkles size={19} /> Your edition
        </h2>
        <div className="setting-row">
          <span>
            <strong>DropBeam Free</strong>
            <small>$0.00 forever. No account needed.</small>
          </span>
          <button className="secondary" onClick={premium}>
            Explore Premium
          </button>
        </div>
      </section>
    </>
  );
}
