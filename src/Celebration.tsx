import { Sparkles } from './SparkleMark';
/** Local-only fallback. Never fetches third-party media or implies a completed transfer. */
export function Celebration({ active }: { active: boolean }) {
  return (
    <span className={`local-celebration ${active ? 'celebrating' : ''}`} aria-hidden="true">
      <Sparkles size={30} />
      <span>✦</span>
      <span>✧</span>
    </span>
  );
}
