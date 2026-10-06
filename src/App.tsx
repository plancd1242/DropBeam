import { Nearby } from './Nearby';
import { SendPage } from './SendPage';
import { HomePage } from './HomePage';
import { Sparkles } from './SparkleMark';
import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  FolderPlus,
  House,
  Laptop,
  List,
  Monitor,
  Send,
  Settings2,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import type { DiscoveryState, Selection } from '../shared/types';
import { defaultSettings, type Settings as Preferences } from '../shared/validation';
import { APP_VERSION } from '../shared/config';
import { desktop, settingsApi } from './api';
import { Settings } from './Settings';
import { Premium, PremiumDialog } from './Premium';
type Page = 'Home' | 'Send' | 'Receive' | 'Devices' | 'Transfers' | 'Settings' | 'Premium';
const navigation = [
  { name: 'Home', icon: House },
  { name: 'Send', icon: Send },
  { name: 'Receive', icon: ArrowDownToLine },
  { name: 'Devices', icon: Monitor },
  { name: 'Transfers', icon: List },
  { name: 'Settings', icon: Settings2 },
] as const;

export default function App() {
  const [page, setPage] = useState<Page>('Home');
  const [settings, setSettings] = useState<Preferences>(defaultSettings);
  const [ready, setReady] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryState>({ enabled: false, devices: [] });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  useEffect(() => {
    void settingsApi
      .get()
      .then((value) => {
        setSettings(value);
        setReady(true);
      })
      .catch(() =>
        setError('Your saved settings could not be loaded. No settings have been overwritten.'),
      );
  }, []);
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (desktop)
        void desktop
          .discovery()
          .then((value) => {
            if (mounted) setDiscovery(value);
          })
          .catch(() => {
            if (mounted) setError('Could not read nearby devices.');
          });
    };
    refresh();
    const timer = setInterval(refresh, 2500);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.classList.toggle('big-text', settings.bigText);
    root.classList.toggle('reduce-motion', settings.reducedMotion);
    root.classList.toggle('compact', settings.compact);
    root.classList.toggle('comic', settings.comic && !settings.serious);
    root.classList.toggle('sparkle-mode', settings.sparkles && !settings.serious);
    root.classList.toggle('serious-mode', settings.serious);
  }, [settings]);
  async function save(value: Preferences) {
    try {
      setSettings(await settingsApi.save(value));
      setError('');
    } catch {
      setError(
        'Settings could not be saved. Use a device name with letters, numbers, spaces, or basic punctuation.',
      );
    }
  }
  async function choose(kind: 'files' | 'folder') {
    setPage('Send');
    if (!desktop) {
      setError('File selection is available in the desktop app. Run npm run dev to open it.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await desktop.select(kind);
      if (result) setSelection(result);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message.replace(/^Error invoking remote method '[^']+': Error: /, '')
          : 'The selection could not be prepared.',
      );
    } finally {
      setBusy(false);
    }
  }
  const nearby = (
    <Nearby
      discovery={discovery}
      showSettings={page === 'Devices'}
      canEnable={!!desktop && ready}
      openDetails={() => setPage(page === 'Devices' ? 'Settings' : 'Devices')}
      enable={() => void save({ ...settings, discoverable: true })}
    />
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage('Home');
          }}
        >
          <span className="brand-mark">
            <Zap size={23} fill="currentColor" />
          </span>
          DropBeam<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-label={name}
              className={`nav-item ${page === name ? 'active' : ''}`}
              onClick={() => setPage(name)}
              aria-current={page === name ? 'page' : undefined}
            >
              <Icon size={19} />
              <span>{name}</span>
              {page === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`premium-invite ${page === 'Premium' ? 'selected' : ''}`}
            onClick={() => setPage('Premium')}
          >
            <Sparkles size={23} />
            <strong>A little more magic</strong>
            <span>Explore Premium. Free forever.</span>
            <span className="invite-link">
              Take a look <ArrowRight size={14} />
            </span>
          </button>
          <div className="local-device">
            <span className="computer-small">
              <Laptop size={20} />
            </span>
            <span>
              <strong>{settings.deviceName}</strong>
              <small>DropBeam Free</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>{page}</span>
          <div className="topbar-right">
            <span className="network-state">
              <span className={`status-dot ${discovery.enabled ? 'on' : ''}`} />
              {discovery.enabled ? 'Discovery on' : 'Discovery off'}
            </span>
            <span className="beta-badge">EARLY BUILD</span>
          </div>
        </header>
        <main id="main-content" key={page}>
          {!desktop && (
            <div className="preview-notice">
              <Monitor size={16} />
              <span>
                Browser preview · open the desktop app for file selection and LAN discovery.
              </span>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError('')}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {page === 'Home' && <HomePage busy={busy} choose={choose} nearby={nearby} />}
          {page === 'Send' && (
            <SendPage
              busy={busy}
              choose={choose}
              selection={selection}
              clear={() => setSelection(null)}
            />
          )}
          {page === 'Devices' && (
            <>
              <div className="page-heading">
                <span className="eyebrow">A FEW COMPUTERS. ONE NEIGHBORHOOD.</span>
                <h1>Meet your nearby computers.</h1>
                <p>
                  Only DropBeam services appear here. Discovered devices are not automatically
                  trusted.
                </p>
              </div>
              {nearby}
              <div className="notice">
                <Sparkles size={20} />
                <span>
                  Favorites, trusted remote devices, and worldwide availability are coming soon with
                  free Premium.
                </span>
              </div>
            </>
          )}
          {page === 'Receive' && (
            <>
              <div className="page-heading">
                <span className="eyebrow">ALWAYS YOUR CALL</span>
                <h1>Your space. Your permission.</h1>
                <p>Incoming files should arrive by invitation.</p>
              </div>
              <section className="empty large-empty">
                <div className="empty-icon">
                  <ArrowDownToLine size={35} />
                </div>
                <span className="pill muted-pill">IN DEVELOPMENT</span>
                <h2>Receiving is being built carefully.</h2>
                <p>
                  This build does not listen for file-transfer requests. Future transfers will
                  require your approval and a destination you choose.
                </p>
                <div className="receiving-steps">
                  <span>
                    <ShieldCheck size={20} /> Approve the sender
                  </span>
                  <span>
                    <FolderPlus size={20} /> Choose a destination
                  </span>
                  <span>
                    <Check size={20} /> Verify the files
                  </span>
                </div>
              </section>
            </>
          )}
          {page === 'Transfers' && (
            <>
              <div className="page-heading">
                <span className="eyebrow">EVERY BYTE ACCOUNTED FOR</span>
                <h1>A clear view of the journey.</h1>
                <p>Real progress belongs here, once the transfer engine is ready.</p>
              </div>
              <section className="empty large-empty">
                <div className="empty-icon">
                  <List size={35} />
                </div>
                <h2>No transfers yet.</h2>
                <p>
                  File delivery is in development. Preparing a selection does not send it, and no
                  transfer history is fabricated.
                </p>
                <button className="secondary" onClick={() => setPage('Send')}>
                  Prepare a selection <ArrowRight size={16} />
                </button>
              </section>
            </>
          )}
          {page === 'Settings' &&
            (ready ? (
              <Settings value={settings} save={save} premium={() => setPage('Premium')} />
            ) : (
              <p>Settings are not available yet.</p>
            ))}
          {page === 'Premium' && <Premium onRequest={() => setRequestOpen(true)} />}
          <footer>
            <span>
              DropBeam <span className="footer-bolt">ϟ</span> {APP_VERSION}
            </span>
            <span>Built for the way files should move.</span>
          </footer>
        </main>
      </div>
      {requestOpen && (
        <PremiumDialog
          celebrate={settings.celebration && !settings.serious}
          close={() => setRequestOpen(false)}
        />
      )}
    </div>
  );
}
