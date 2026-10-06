/** Original DropBeam Premium mark: an offset beam-star, satellite star, and dot. */
export function Sparkles({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="m9 2 2.2 6.8L18 11l-6.8 2.2L9 21l-2.2-7.8L1 11l5.8-2.2L9 2Z" fill="currentColor" />
      <path
        d="m19 1 1.1 3.9L24 6l-3.9 1.1L19 11l-1.1-3.9L14 6l3.9-1.1L19 1Z"
        fill="currentColor"
        opacity=".65"
      />
      <circle cx="20" cy="18" r="1.7" fill="currentColor" />
    </svg>
  );
}
