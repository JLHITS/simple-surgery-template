import type { SiteConfig } from '@/lib/config/types'
import { markdownToPlainText } from '@/lib/markdown'

export interface SearchDoc {
  title: string
  href: string
  section: string
  summary: string
  /** Lowercased haystack of title, summary and body. */
  text: string
}

/**
 * Builds the search index from the config at request time.
 *
 * No index file to keep in sync and no search service to pay for. A practice
 * site is a few dozen documents, so a linear scan is instant and always
 * reflects whatever was saved a second ago in the admin panel.
 */
export function buildSearchIndex(config: SiteConfig): SearchDoc[] {
  const docs: SearchDoc[] = [
    {
      title: 'Appointments',
      href: '/appointments',
      section: 'Appointments',
      summary: config.content.appointmentsIntro,
      text: markdownToPlainText(config.content.appointmentsBody, 4000),
    },
    {
      title: 'Prescriptions',
      href: '/prescriptions',
      section: 'Prescriptions',
      summary: config.content.prescriptionsIntro,
      text: markdownToPlainText(config.content.prescriptionsBody, 4000),
    },
    {
      title: 'Contact us',
      href: '/contact',
      section: 'Contact',
      summary: config.content.contactIntro,
      text: [
        config.practice.phone,
        config.practice.email,
        config.practice.addressLine1,
        config.practice.town,
        config.practice.postcode,
        config.practice.parkingInfo,
        config.practice.accessInfo,
        config.practice.publicTransportInfo,
        config.hours.outOfHoursInfo,
        'opening hours where to find us directions parking',
      ]
        .filter(Boolean)
        .join(' '),
    },
    {
      title: 'About the surgery',
      href: '/about',
      section: 'About',
      summary: config.content.aboutIntro,
      text: `${config.compliance.cqcRating} ${config.compliance.pcnName} ${config.compliance.icbName} our team staff doctors nurses`,
    },
    {
      title: 'News',
      href: '/news',
      section: 'News',
      summary: 'Practice updates and national NHS news.',
      text: config.news.practiceNews.map((n) => `${n.title} ${n.body}`).join(' '),
    },
  ]

  for (const service of config.services) {
    docs.push({
      title: service.title,
      href: `/services/${service.slug}`,
      section: 'Services',
      summary: service.summary,
      text: markdownToPlainText(service.body, 4000),
    })
  }

  for (const page of config.pages) {
    docs.push({
      title: page.title,
      href: `/about/${page.slug}`,
      section: 'About',
      summary: page.summary,
      text: markdownToPlainText(page.body, 4000),
    })
  }

  return docs.map((doc) => ({
    ...doc,
    text: `${doc.title} ${doc.summary} ${doc.text}`.toLowerCase(),
  }))
}

export interface SearchResult extends SearchDoc {
  score: number
}

/**
 * Scores each document against the query.
 *
 * A title match outranks a summary match, which outranks a body match, and
 * every word of a multi-word query has to appear somewhere. Patients search in
 * their own words ("sick note", "get my results"), so partial word matching is
 * on by default.
 */
export function search(docs: SearchDoc[], query: string): SearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 1)

  if (!terms.length) return []

  const results: SearchResult[] = []

  for (const doc of docs) {
    let score = 0
    let matchedAll = true

    for (const term of terms) {
      const inTitle = doc.title.toLowerCase().includes(term)
      const inSummary = doc.summary.toLowerCase().includes(term)
      const inText = doc.text.includes(term)

      if (!inTitle && !inSummary && !inText) {
        matchedAll = false
        break
      }

      if (inTitle) score += 12
      if (inSummary) score += 5
      if (inText) score += 1
    }

    if (matchedAll) results.push({ ...doc, score })
  }

  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
}
