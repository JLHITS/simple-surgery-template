/**
 * The Simple Surgery mark, for the credit in the practice footer.
 *
 * Small and in `currentColor`, so it sits at the same weight as the grey text
 * beside it rather than competing with the practice's own branding. The whole
 * credit, mark included, is switched off by "Show the built with Simple
 * Surgery credit" in Advanced settings.
 *
 * Inlined rather than loaded from /mark.svg so it costs no request and cannot
 * break if a practice clears out their public folder.
 */
export function SimpleSurgeryMark({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={Math.round((size * 520) / 497)}
      height={size}
      viewBox="0 0 520 497"
      aria-hidden="true"
      focusable="false"
      className="inline-block shrink-0 align-[-0.15em]"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/*
          Only the silhouette. At this size the chevrons, heartbeat and cursor
          would be sub-pixel noise, and a heavier stroke keeps the outline
          readable next to 13px text.
        */}
        <path d="M320 9 H191 V170 H9 V328 H191 V488 H329 V328 H484 A27 27 0 0 0 511 301 V36 A27 27 0 0 0 484 9 H340 V170" />
      </g>
    </svg>
  )
}
