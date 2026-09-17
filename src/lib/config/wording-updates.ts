import { defaultConfig } from './defaults'
import type { InfoPage, ServiceItem, SiteConfig } from './types'

/**
 * Recommended wording that has changed since a practice last looked.
 *
 * Code updates reach every practice by themselves. Wording does not. The first
 * time a practice presses Save, every page is stored as it stood that day, and
 * from then on their stored copy wins over the defaults. That is right for text
 * they wrote, and wrong for a complaints page that still names NHS England a
 * year after guidance moved complaints to the ICBs.
 *
 * So when default wording changes because guidance changed, add an entry here.
 * The admin panel shows it to every practice whose wording differs from the new
 * recommendation, with the difference, and lets them take it or keep their own.
 * Nothing is ever replaced without somebody pressing a button.
 *
 * Only add an entry for a change a practice should actually review. A typo fix
 * in a default is not worth interrupting a few hundred practice managers for:
 * change the default and leave this list alone.
 *
 * Rules for entries:
 *   - `id` is permanent. Practices store it once they have reviewed the update,
 *     so reusing or renaming one makes it disappear or reappear for everybody.
 *   - Change the wording in defaults.ts in the same commit. The recommended
 *     text shown to practices is always the current default, not a copy here.
 *   - A page or service a practice does not have is offered as a new page.
 *
 * Example:
 *
 *   {
 *     id: '2026-10-complaints-icb',
 *     date: '2026-10-01',
 *     title: 'Complaints now go to your ICB, not NHS England',
 *     reason: 'Since July 2023 patients who do not want to complain to the practice contact their Integrated Care Board.',
 *     targets: [{ kind: 'page', id: 'pg-complaints' }],
 *   },
 */
export const WORDING_UPDATES: WordingUpdate[] = []

export interface WordingUpdate {
  id: string
  /** ISO date the update was published. */
  date: string
  /** One line, in the practice's terms. */
  title: string
  /** Why it changed. Shown above the difference. */
  reason: string
  targets: WordingTarget[]
}

export type WordingTarget =
  | { kind: 'page'; id: string }
  | { kind: 'service'; id: string }
  | { kind: 'content'; key: keyof SiteConfig['content'] }
  | { kind: 'urgent'; key: keyof SiteConfig['urgent'] }

const CONTENT_LABELS: Record<keyof SiteConfig['content'], string> = {
  appointmentsIntro: 'Appointments page, opening line',
  appointmentsBody: 'Appointments page',
  prescriptionsIntro: 'Prescriptions page, opening line',
  prescriptionsOrderNote: 'Prescriptions page, how to order',
  prescriptionsBody: 'Prescriptions page',
  aboutIntro: 'About page, opening line',
  aboutBody: 'About page',
  contactIntro: 'Contact page, opening line',
}

const URGENT_LABELS: Record<keyof SiteConfig['urgent'], string> = {
  emergencyText: 'Urgent care, 999 message',
  lifeThreateningText: 'Urgent care, signs of an emergency',
  nhs111Text: 'Urgent care, 111 message',
  pharmacyText: 'Urgent care, pharmacy message',
}

export interface TargetState {
  label: string
  /** The practice's wording, or null when they do not have this page at all. */
  current: string | null
  recommended: string
}

/** Pages and services are compared as one block, so a new title counts too. */
function itemText(item: Pick<InfoPage | ServiceItem, 'title' | 'summary' | 'body'>): string {
  return [item.title, item.summary, item.body].filter(Boolean).join('\n\n')
}

function same(a: string, b: string): boolean {
  const tidy = (s: string) => s.replace(/\r\n/g, '\n').trimEnd()
  return tidy(a) === tidy(b)
}

/**
 * Where one target stands for this practice.
 *
 * Null when the template no longer has a default for it, which only happens if
 * an entry outlives the page it refers to. Such a target is ignored rather
 * than offering the practice something that does not exist.
 */
export function targetState(config: SiteConfig, target: WordingTarget): TargetState | null {
  switch (target.kind) {
    case 'page': {
      const recommended = defaultConfig.pages.find((p) => p.id === target.id)
      if (!recommended) return null
      const mine = config.pages.find((p) => p.id === target.id)
      return {
        label: `${recommended.title} page`,
        current: mine ? itemText(mine) : null,
        recommended: itemText(recommended),
      }
    }
    case 'service': {
      const recommended = defaultConfig.services.find((s) => s.id === target.id)
      if (!recommended) return null
      const mine = config.services.find((s) => s.id === target.id)
      return {
        label: `${recommended.title} service`,
        current: mine ? itemText(mine) : null,
        recommended: itemText(recommended),
      }
    }
    case 'content':
      if (!(target.key in defaultConfig.content)) return null
      return {
        label: CONTENT_LABELS[target.key],
        current: config.content[target.key],
        recommended: defaultConfig.content[target.key],
      }
    case 'urgent':
      if (!(target.key in defaultConfig.urgent)) return null
      return {
        label: URGENT_LABELS[target.key],
        current: config.urgent[target.key],
        recommended: defaultConfig.urgent[target.key],
      }
  }
}

function differs(state: TargetState | null): state is TargetState {
  return state !== null && (state.current === null || !same(state.current, state.recommended))
}

/**
 * Updates this practice has not reviewed and whose wording they do not already
 * have. A practice that never changed a page, or already took the new wording
 * by hand, is not asked about it.
 */
export function pendingWordingUpdates(config: SiteConfig): WordingUpdate[] {
  const reviewed = new Set(config.reviewedUpdates)
  return WORDING_UPDATES.filter(
    (update) =>
      !reviewed.has(update.id) && update.targets.some((t) => differs(targetState(config, t))),
  )
}

/** The targets of an update worth showing: the ones where wording differs. */
export function changedTargets(
  config: SiteConfig,
  update: WordingUpdate,
): Array<{ target: WordingTarget; state: TargetState }> {
  return update.targets
    .map((target) => ({ target, state: targetState(config, target) }))
    .filter((t): t is { target: WordingTarget; state: TargetState } => differs(t.state))
}

function markReviewed(config: SiteConfig, updateId: string): string[] {
  return config.reviewedUpdates.includes(updateId)
    ? config.reviewedUpdates
    : [...config.reviewedUpdates, updateId]
}

/**
 * Takes the recommended wording for every target of an update.
 *
 * Only the words change. A page keeps its web address, its place in the footer
 * and its order, because those are the practice's choices, not guidance.
 */
export function acceptWordingUpdate(config: SiteConfig, update: WordingUpdate): SiteConfig {
  let next: SiteConfig = { ...config }

  for (const target of update.targets) {
    switch (target.kind) {
      case 'page': {
        const recommended = defaultConfig.pages.find((p) => p.id === target.id)
        if (!recommended) break
        const exists = next.pages.some((p) => p.id === target.id)
        next = {
          ...next,
          pages: exists
            ? next.pages.map((p) =>
                p.id === target.id
                  ? { ...p, title: recommended.title, summary: recommended.summary, body: recommended.body }
                  : p,
              )
            : [...next.pages, recommended],
        }
        break
      }
      case 'service': {
        const recommended = defaultConfig.services.find((s) => s.id === target.id)
        if (!recommended) break
        const exists = next.services.some((s) => s.id === target.id)
        next = {
          ...next,
          services: exists
            ? next.services.map((s) =>
                s.id === target.id
                  ? { ...s, title: recommended.title, summary: recommended.summary, body: recommended.body }
                  : s,
              )
            : [...next.services, recommended],
        }
        break
      }
      case 'content':
        if (!(target.key in defaultConfig.content)) break
        next = {
          ...next,
          content: { ...next.content, [target.key]: defaultConfig.content[target.key] },
        }
        break
      case 'urgent':
        if (!(target.key in defaultConfig.urgent)) break
        next = {
          ...next,
          urgent: { ...next.urgent, [target.key]: defaultConfig.urgent[target.key] },
        }
        break
    }
  }

  return { ...next, reviewedUpdates: markReviewed(next, update.id) }
}

/** Keeps the practice's own wording and stops asking. */
export function keepOwnWording(config: SiteConfig, updateId: string): SiteConfig {
  return { ...config, reviewedUpdates: markReviewed(config, updateId) }
}

/**
 * Marks as reviewed any update the practice could not have missed.
 *
 * Runs on save, against what was stored before the save. If a target was not
 * in storage, the practice was reading the live default for it, which already
 * carried the update, so whatever they are saving now was written on top of
 * the new wording. Without this, a practice's very first save would raise
 * every update ever published against wording they never had.
 */
export function settleUnseenUpdates(previouslyStored: unknown, config: SiteConfig): SiteConfig {
  const stored =
    typeof previouslyStored === 'object' && previouslyStored !== null
      ? (previouslyStored as Record<string, unknown>)
      : {}

  const held = (target: WordingTarget): boolean => {
    switch (target.kind) {
      case 'page':
        return Array.isArray(stored.pages)
      case 'service':
        return Array.isArray(stored.services)
      case 'content':
      case 'urgent': {
        const group = stored[target.kind]
        return (
          typeof group === 'object' &&
          group !== null &&
          (group as Record<string, unknown>)[target.key] !== undefined
        )
      }
    }
  }

  let reviewed = config.reviewedUpdates
  for (const update of WORDING_UPDATES) {
    if (reviewed.includes(update.id)) continue
    if (!update.targets.some(held)) reviewed = [...reviewed, update.id]
  }

  return reviewed === config.reviewedUpdates ? config : { ...config, reviewedUpdates: reviewed }
}
