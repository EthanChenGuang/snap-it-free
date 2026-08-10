'use client';

/** Classic red map pin for select-location (anchor bottom). */
export function SelectLocationRedPin({ animate }: { animate?: boolean }) {
  return (
    <div
      className={animate ? 'animate-[pin-drop_0.35s_ease-out]' : undefined}
      style={{ transformOrigin: 'bottom center' }}
    >
      <svg
        width="32"
        height="40"
        viewBox="0 0 32 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M16 0C9.373 0 4 5.373 4 12c0 8.25 12 28 12 28s12-19.75 12-28C28 5.373 22.627 0 16 0z"
          fill="#EA4335"
        />
        <circle cx="16" cy="12" r="5" fill="white" />
      </svg>
    </div>
  );
}
