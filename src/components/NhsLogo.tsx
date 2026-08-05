/**
 * The NHS logo.
 *
 * This is the official artwork, not a reproduction. The path data is taken
 * verbatim from `nhsuk-frontend` (the NHS digital service manual's own
 * component library, MIT licensed), so the letterforms are exactly the ones
 * NHS.UK ships and they render identically on every device. An earlier version
 * of this file drew the letters with a web font, which meant the logo changed
 * shape depending on what was installed. That is precisely the sort of thing
 * that makes a practice site look counterfeit.
 *
 * The letters are knocked out of the path rather than drawn on top of it, so
 * the "N", "H" and "S" are holes. On the default variant a white plate sits
 * behind them. On the reverse variant there is no plate, so the logo can sit on
 * an NHS Blue background and the letters take the background colour.
 *
 * Usage rules, from the NHS Identity Guidelines:
 *   - Never recolour, stretch, rotate, outline or add effects to it
 *   - Keep clear space around it of at least half its height
 *   - Never place it on a busy background or a mid-tone colour
 *   - Only organisations providing NHS services may display it
 *
 * NHS England's website guidance asks practice sites to carry NHS branding
 * because patients use it to tell a real NHS service from a private clinic.
 * Practices can still switch it off in Advanced settings.
 */

/** Official NHS logo geometry. The rectangle is drawn with the letters as holes. */
const NHS_PATH =
  'M200 0v80H0V0h200Zm-27.5 5.5c-14.5 0-29 5-29 22 0 10.2 7.7 13.5 14.7 16.3l.7.3c5.4 2 10.1 3.9 10.1 8.4 0 6.5-8.5 7.5-14 7.5s-12.5-1.5-16-3.5L135 70c5.5 2 13.5 3.5 20 3.5 15.5 0 32-4.5 32-22.5 0-19.5-25.5-16.5-25.5-25.5 0-5.5 5.5-6.5 12.5-6.5a35 35 0 0 1 14.5 3l4-13.5c-4.5-2-12-3-20-3Zm-131 2h-22l-14 65H22l9-45h.5l13.5 45h21.5l14-65H64l-9 45h-.5l-13-45Zm63 0h-18l-13 65h17l6-28H117l-5.5 28H129l13.5-65H125L119.5 32h-20l5-24.5Z'

const NHS_BLUE = '#005EB8'

export function NhsLogo({
  className = '',
  height = 24,
  title = 'NHS',
  variant = 'default',
}: {
  className?: string
  /** Rendered height in pixels. Width is always 2.5x, the official ratio. */
  height?: number
  title?: string
  /** 'default' for light backgrounds, 'reverse' for placing on NHS Blue. */
  variant?: 'default' | 'reverse'
}) {
  return (
    <svg
      className={className}
      width={height * 2.5}
      height={height}
      viewBox="0 0 200 80"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      {/* The plate the knocked-out letters show through. */}
      {variant === 'default' && <path fill="#FFFFFF" d="M0 0h200v80H0z" />}
      <path fill={variant === 'reverse' ? '#FFFFFF' : NHS_BLUE} d={NHS_PATH} />
    </svg>
  )
}
