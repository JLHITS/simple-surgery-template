import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultConfig } from '../src/lib/config/defaults'
import { sanitiseConfig } from '../src/lib/config/sanitise'
import { NHS_COLOURS, paletteFor, THEMES, themeOf, themeStyle } from '../src/lib/theme'

/** WCAG 2 contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b2)
  }
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

test('every scheme keeps its text readable, to WCAG AA', () => {
  for (const { key } of THEMES) {
    const p = paletteFor(key, '#00703C')
    const pairs: [string, string, string][] = [
      ['header text', p.headerText, p.headerBg],
      ['menu text', p.navText, p.headerBg],
      ['header button', p.headerCtaText, p.headerCta],
      ['header button hovered', p.headerCtaText, p.headerCtaHover],
      ['button', '#FFFFFF', p.button],
      ['button hovered', '#FFFFFF', p.buttonHover],
      ['link', p.link, '#FFFFFF'],
      ['link hovered', p.link, '#FFFFFF'],
      ['link on grey', p.link, NHS_COLOURS.grey5],
      ['link hovered on grey', p.linkHover, NHS_COLOURS.grey5],
    ]
    for (const [what, fg, bg] of pairs) {
      assert.ok(contrast(fg, bg) >= 4.5, `${key}: ${what} is ${contrast(fg, bg).toFixed(2)} to 1`)
    }
  }
})

test('the NHS logo is only reversed out of solid NHS Blue', () => {
  for (const theme of THEMES) {
    const p = paletteFor(theme.key, '#00703C')
    if (theme.header === 'blue') assert.equal(p.headerBg, NHS_COLOURS.blue, theme.key)
    else assert.equal(p.headerBg, '#FFFFFF', theme.key)
  }
})

test('schemes use only NHS identity colours, apart from a practice choosing its own', () => {
  const allowed = new Set(Object.values(NHS_COLOURS).map((c) => c.toUpperCase()))
  for (const { key } of THEMES.filter((t) => t.key !== 'custom')) {
    const css = Object.values(themeStyle(paletteFor(key))).join(' ')
    for (const hex of css.match(/#[0-9a-f]{6}/gi) ?? []) {
      assert.ok(allowed.has(hex.toUpperCase()), `${key} uses ${hex}`)
    }
  }
})

test('a site that chose its own colour before schemes existed keeps it', () => {
  assert.equal(themeOf({ theme: 'nhs', colourMode: 'custom' }), 'custom')
  assert.equal(themeOf({ theme: 'nightingale', colourMode: 'nhs' }), 'nightingale')
  // An unknown value never breaks the site.
  assert.equal(themeOf({ theme: 'neon' as never, colourMode: 'nhs' }), 'nhs')

  const saved = JSON.parse(JSON.stringify(defaultConfig))
  saved.practice.name = 'Orchard Surgery'
  delete saved.advanced.theme
  saved.advanced.colourMode = 'custom'
  assert.equal(sanitiseConfig(saved, defaultConfig).advanced.theme, 'custom')

  saved.advanced.theme = 'nhs-purple'
  const chosen = sanitiseConfig(saved, defaultConfig).advanced
  assert.equal(chosen.theme, 'nhs-purple')
  assert.equal(chosen.colourMode, 'nhs')
})

test('a custom colour is only ever a colour', () => {
  const css = themeStyle(paletteFor('custom', 'red; background: url(x)'))
  assert.equal(css['--accent'], NHS_COLOURS.blue)
})
