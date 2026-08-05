/**
 * The NHS logo.
 *
 * NHS England's guidance is explicit that practice websites should carry NHS
 * branding, because patients use it to tell a real NHS service from a private
 * one. It appears in the header lockup and again in the footer.
 *
 * Rendered inline rather than as an <img> so it stays crisp, needs no network
 * request, and inherits sizing from the layout. The official vector files are
 * available from the NHS Identity Guidelines if you would rather swap in the
 * exact artwork: replace public/nhs-logo.svg and this component together.
 *
 * The logo must never be recoloured, stretched, rotated or placed on a busy
 * background, and it must keep clear space around it equal to half its height.
 */
export function NhsLogo({
  className = '',
  height = 24,
  title = 'NHS',
}: {
  className?: string
  height?: number
  title?: string
}) {
  const width = height * 2.5

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 200 80"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      <rect width="200" height="80" fill="#005EB8" />
      <text
        x="100"
        y="58"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Frutiger W01, Arial, Helvetica, sans-serif"
        fontSize="52"
        fontWeight="700"
        letterSpacing="-1"
      >
        NHS
      </text>
    </svg>
  )
}
