export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="112" fill="var(--card)" stroke="var(--border)" strokeWidth="8" />
      <clipPath id="logo-glass">
        <path d="M150 112h212l-26 282a28 28 0 0 1-28 25H204a28 28 0 0 1-28-25z" />
      </clipPath>
      <g clipPath="url(#logo-glass)">
        <path d="M120 262c34-18 68-18 102 0s68 18 102 0 68-18 102 0V440H120z" fill="var(--primary)" />
      </g>
      <path
        d="M150 112h212l-26 282a28 28 0 0 1-28 25H204a28 28 0 0 1-28-25z"
        fill="none"
        stroke="var(--fg)"
        strokeWidth="22"
        strokeLinejoin="round"
      />
    </svg>
  );
}
