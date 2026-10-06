import type { ReactNode } from 'react';
import { File, FilePlus2, FolderPlus, ShieldCheck, Zap } from 'lucide-react';
export function HomePage({
  busy,
  choose,
  nearby,
}: {
  busy: boolean;
  choose(kind: 'files' | 'folder'): Promise<void>;
  nearby: ReactNode;
}) {
  return (
    <>
      <div className="page-heading home-heading">
        <span className="eyebrow">
          <span /> LITTLE EFFORT. SHORT DISTANCE.
        </span>
        <h1>Your files. Somewhere new.</h1>
        <p>Pick it. Pick a computer. Beam it.</p>
      </div>
      <section className="send-hero">
        <div className="hero-copy">
          <span className="pill">
            <Zap size={13} /> MADE FOR YOUR LOCAL NETWORK
          </span>
          <h2>
            Less getting files there.
            <br />
            More getting things done.
          </h2>
          <p>
            Start with the files you want to move.
            <br />
            No accounts. No detours.
          </p>
          <div className="button-row">
            <button className="primary" disabled={busy} onClick={() => void choose('files')}>
              <FilePlus2 size={17} /> Send files
            </button>
            <button className="secondary" disabled={busy} onClick={() => void choose('folder')}>
              <FolderPlus size={17} /> Send folder
            </button>
          </div>
          <small className="honest-note">
            File preparation works now. LAN delivery is in development.
          </small>
        </div>
        <div className="beam-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-file file-back">
            <File size={48} />
          </div>
          <div className="art-file file-front">
            <Zap size={47} fill="currentColor" />
          </div>
          <span className="art-spark spark-one">✦</span>
          <span className="art-spark spark-two">✧</span>
          <span className="art-dot" />
        </div>
      </section>
      {nearby}
      <div className="bottom-note">
        <ShieldCheck size={19} />
        <span>
          <strong>Local by design.</strong> File contents stay on this computer in this build.
          Discovery never grants access.
        </span>
      </div>
    </>
  );
}
