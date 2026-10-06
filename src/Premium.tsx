import { Celebration } from './Celebration';
import { Sparkles } from './SparkleMark';
import { useEffect, useRef, useState } from 'react';
import { Check, X, ArrowRight, LockKeyhole } from 'lucide-react';
import { features, CONTACT_EMAIL } from '../shared/config';
import { nameSchema, premiumMessage } from '../shared/validation';
import { desktop } from './api';

export function Premium({ onRequest }: { onRequest(): void }) {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">A LITTLE EXTRA POSSIBILITY</span>
        <h1>Two editions. Zero price tags.</h1>
        <p>Local sharing for everyone. More possibilities as DropBeam grows.</p>
      </div>
      <div className="plans">
        {(['free', 'premium'] as const).map((tier) => (
          <section className={`plan ${tier}`} key={tier}>
            <span className="plan-icon">{tier === 'premium' ? <Sparkles /> : <Check />}</span>
            <h2>{tier === 'premium' ? 'DropBeam Premium' : 'DropBeam Free'}</h2>
            <div className="price">
              $0.00 <span>Forever</span>
            </div>
            <p>
              {tier === 'premium'
                ? 'For the computers beyond your Wi-Fi.'
                : 'Your files. Your network. No account.'}
            </p>
            <ul>
              {features.map((feature) => {
                const included = tier === 'premium' || feature.free;
                return (
                  <li key={feature.name}>
                    {included ? (
                      <Check className="check" size={16} aria-label="Included" />
                    ) : (
                      <X className="cross" size={16} aria-label="Not included" />
                    )}
                    <span>
                      {feature.name}
                      {included && feature.status !== 'working' && (
                        <small>
                          {feature.status === 'development' ? 'In development' : 'Coming soon'}
                        </small>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {tier === 'free' ? (
              <div className="owned">
                <Check size={16} /> You already own Free
              </div>
            ) : (
              <button className="primary" onClick={onRequest}>
                <Sparkles size={17} /> Upgrade to Premium <ArrowRight size={16} />
              </button>
            )}
          </section>
        ))}
      </div>
      <p className="footnote">
        Premium is a free edition, never a subscription. Requests do not activate Premium; approval
        and entitlement delivery are coming soon. The 100 GB worldwide limit is a design target, not
        a supported transfer size.
      </p>
    </>
  );
}

export function PremiumDialog({ close, celebrate = true }: { close(): void; celebrate?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [stage, setStage] = useState<'name' | 'preview' | 'sent'>('name');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    void desktop
      ?.premiumStatus()
      .then((s) => setConfigured(s.configured))
      .catch(() => setError('Could not check cloud configuration.'));
    return () => dialog.close();
  }, []);
  async function send() {
    if (!desktop || !configured) return;
    setBusy(true);
    setError('');
    try {
      const result = await desktop.requestPremium(name, requestId);
      if (result.status === 'duplicate')
        setError(
          'A matching request was already attempted today. Delivery is not confirmed; please wait until tomorrow before retrying.',
        );
      else setStage('sent');
    } catch {
      setError(
        'Delivery could not be confirmed. The service may be unavailable or rate limited. Avoid resubmitting today.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="premium-dialog"
      aria-labelledby="premium-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else close();
      }}
    >
      <button
        className="icon-button close"
        aria-label="Close Premium request"
        onClick={close}
        disabled={busy}
      >
        <X />
      </button>
      <div className="dialog-spark">
        <Sparkles size={28} />
      </div>
      {stage === 'name' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const result = nameSchema.safeParse(name);
            if (!result.success) setError(result.error.issues[0].message);
            else {
              setName(result.data);
              setError('');
              setStage('preview');
            }
          }}
        >
          <h2 id="premium-title">What should we call you?</h2>
          <p>A little introduction for your free Premium request.</p>
          <label htmlFor="premium-name">Your name</label>
          <input
            id="premium-name"
            value={name}
            maxLength={60}
            autoComplete="given-name"
            onChange={(e) => setName(e.target.value)}
            placeholder="Caleb"
            aria-describedby="name-note"
          />
          <small id="name-note">
            Letters, spaces, apostrophes, and hyphens. Up to 60 characters.
          </small>
          <button className="primary wide" type="submit">
            Preview my request <ArrowRight size={16} />
          </button>
        </form>
      ) : stage === 'preview' ? (
        <>
          <h2 id="premium-title">A small hello. A big possibility.</h2>
          <p>To: {CONTACT_EMAIL}</p>
          <pre className="email-preview">{premiumMessage(name)}</pre>
          <p className="privacy-line">
            <LockKeyhole size={15} /> Only your name and a request ID are sent. No files.
          </p>
          {!configured && (
            <div className="notice">
              Cloud sending is not configured in this build. No email will be sent.
            </div>
          )}
          <div className="button-row">
            <button className="secondary" disabled={busy} onClick={() => setStage('name')}>
              Edit name
            </button>
            <button className="primary" disabled={!configured || busy} onClick={() => void send()}>
              <Sparkles size={16} />
              {busy ? 'Sending request…' : 'Request Premium'}
            </button>
          </div>
        </>
      ) : (
        <>
          <Celebration active={celebrate} />
          <h2 id="premium-title">Premium Request Sent!</h2>
          <p>
            The email provider accepted your request to {CONTACT_EMAIL}. This does not activate
            Premium yet.
          </p>
          <p>Account linking and approval delivery are still in development.</p>
          <button className="primary wide" onClick={close}>
            All done <Check size={16} />
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </dialog>
  );
}
