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

/** A capital S: Liberation Sans Bold, normalised to a cap height of 1000. */
const S =
  'M846.2 706.2Q846.2 849 740.3 924.5Q634.5 1000 429.7 1000Q242.8 1000 136.6 933.8Q30.3 867.6 0 733.1L196.6 700.7Q216.6 777.9 274.5 812.8Q332.4 847.6 435.2 847.6Q648.3 847.6 648.3 717.9Q648.3 676.6 623.8 649.7Q599.3 622.8 554.8 604.8Q510.3 586.9 384.1 561.4Q275.2 535.9 232.4 520.3Q189.7 504.8 155.2 483.8Q120.7 462.8 96.6 433.1Q72.4 403.4 59 363.4Q45.5 323.4 45.5 271.7Q45.5 140 144.5 70Q243.4 0 432.4 0Q613.1 0 703.8 56.6Q794.5 113.1 820.7 243.4L623.4 270.3Q608.3 207.6 561.7 175.9Q515.2 144.1 428.3 144.1Q243.4 144.1 243.4 260Q243.4 297.9 263.1 322.1Q282.8 346.2 321.4 363.1Q360 380 477.9 405.5Q617.9 435.2 678.3 460.3Q738.6 485.5 773.8 519Q809 552.4 827.6 599Q846.2 645.5 846.2 706.2Z'

export function SimpleSurgeryMark({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={Math.round((size * 3608.4) / 1342.9)}
      height={size}
      viewBox="0 0 3608.4 1342.9"
      aria-hidden="true"
      focusable="false"
      className="inline-block shrink-0 align-[-0.15em]"
    >
      {/*
        The whole mark, brackets included. The letters are solid outlines rather
        than line art, so unlike the old mark this one survives beside 13px text
        without needing a simplified version.
      */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="168"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      >
        <path d="M778.3 61.5L123.3 671.5L778.3 1281.5" />
        <path d="M2830.1 61.5L3485.1 671.5L2830.1 1281.5" />
      </g>
      <g fill="currentColor">
        <path d={S} transform="translate(945.5 171.5)" />
        <path d={S} transform="translate(1816.7 171.5)" />
      </g>
    </svg>
  )
}
