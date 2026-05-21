/**
 * Stylized "R" — small SVG so the marketing site has a real brand mark
 * without needing an image asset.
 */
export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#brandGrad)" />
      <path
        d="M13 28V12h9.2c3.3 0 5.4 1.9 5.4 4.8 0 2.2-1.2 3.8-3.2 4.5L28 28h-3.7l-3.2-6.1h-4.4V28H13zm3.7-9h5.3c1.6 0 2.6-.8 2.6-2.2s-1-2.1-2.6-2.1h-5.3V19z"
        fill="white"
      />
    </svg>
  );
}
