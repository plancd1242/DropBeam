import {
  File,
  FilePlus2,
  FolderPlus,
  LoaderCircle,
  LockKeyhole,
  PackageOpen,
  Check,
} from 'lucide-react';
import type { Selection } from '../shared/types';
import { bytes } from './api';
export function SendPage({
  busy,
  choose,
  selection,
  clear,
}: {
  busy: boolean;
  choose(kind: 'files' | 'folder'): Promise<void>;
  selection: Selection | null;
  clear(): void;
}) {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">START WITH SOMETHING WORTH SENDING</span>
        <h1>What’s coming with you?</h1>
        <p>Prepare real files and folders with a streamed SHA-256 integrity manifest.</p>
      </div>
      <section className="selection-panel">
        <div className="selection-icon">
          {busy ? <LoaderCircle className="spin" size={35} /> : <PackageOpen size={38} />}
        </div>
        <h2>
          {busy
            ? 'Reading files & calculating hashes…'
            : selection
              ? selection.name
              : 'A small file. A whole folder.'}
        </h2>
        <p>
          {busy
            ? 'Large selections can take a while. No files are uploaded or copied.'
            : 'Choose directly from your computer using the native file picker.'}
        </p>
        <div className="button-row">
          <button className="primary" disabled={busy} onClick={() => void choose('files')}>
            <FilePlus2 size={17} /> Choose files
          </button>
          <button className="secondary" disabled={busy} onClick={() => void choose('folder')}>
            <FolderPlus size={17} /> Choose folder
          </button>
        </div>
      </section>
      {selection && (
        <section className="manifest">
          <div className="section-heading">
            <h2>Prepared selection</h2>
            <button className="text-button" disabled={busy} onClick={clear}>
              Clear selection
            </button>
          </div>
          <div className="manifest-summary">
            <span>
              <Check size={16} /> SHA-256 calculated
            </span>
            <span>
              {selection.files.length} files · {bytes(selection.totalBytes)}
            </span>
          </div>
          <ul>
            {selection.files.slice(0, 100).map((file) => (
              <li key={file.name}>
                <File size={19} />
                <div>
                  <strong>{file.name}</strong>
                  <code title={file.sha256}>{file.sha256.slice(0, 20)}…</code>
                </div>
                <span>{bytes(file.size)}</span>
              </li>
            ))}
          </ul>
          {selection.files.length > 100 && (
            <p>Showing the first 100 files of {selection.files.length}.</p>
          )}
        </section>
      )}
      <div className="notice">
        <LockKeyhole size={19} />
        <span>
          <strong>LAN delivery is in development.</strong> Destination selection, receiver approval,
          encrypted streaming, and receiver-side verification are coming next. A manifest is not a
          completed transfer.
        </span>
      </div>
    </>
  );
}
