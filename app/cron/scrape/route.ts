import { deleteScoresByDay, insertScores } from '@/lib/services/db'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseTable(html: string, category: string) {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/)
  if (!tableMatch) return []

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  // Skip header row
  return rows
    .slice(1)
    .map((row) => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]))
      if (cells.length < 5) return null

      const rank = parseInt(cells[0])
      // Cell 2 patterns:
      //   "Anthropic claude-opus-4-6 Anthropic · Proprietary" (org icon + model + org + license)
      //   "grok-4.1 xAI · Proprietary" (model + org + license, no icon)
      const modelParts = cells[2].split('·').map((s) => s.trim())
      const license = modelParts[1] || ''
      const words = modelParts[0].split(/\s+/)
      // Last word before · is always the organization
      const organization = words.length >= 2 ? words[words.length - 1] : ''
      // Model is everything between optional leading org and trailing org
      const middle = words.slice(0, -1)
      const firstLower = middle.length > 0 ? middle[0].toLowerCase() : ''
      const orgLower = organization.toLowerCase()
      const model =
        middle.length > 0 && (firstLower.startsWith(orgLower) || orgLower.startsWith(firstLower))
          ? middle.slice(1).join(' ')
          : middle.join(' ')

      // Score: "1505 ±8" or "1561 +14/-14"
      const scoreMatch = cells[3].match(/^(\d+)\s+(.+)$/)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : parseInt(cells[3])
      const ci = scoreMatch ? scoreMatch[2] : ''

      const votes = parseInt(cells[4].replace(/,/g, ''))

      const day = new Date().toISOString().slice(0, 10)

      return { rank, model, organization, score, ci, votes, license, category, day }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, 20)
}

async function fetchAndParseScores(category: string) {
  const res = await fetch(`https://arena.ai/leaderboard/${category}`, { headers: { 'User-Agent': UA } })
  return parseTable(await res.text(), category)
}

export async function GET() {
  const categories = ['text', 'code']
  const [text, code] = await Promise.all(categories.map(fetchAndParseScores))

  const allScores = [...text, ...code]
  const day = allScores[0]?.day ?? new Date().toISOString().slice(0, 10)
  await deleteScoresByDay(day)
  const inserted = await insertScores(
    allScores.map((s) => ({ day: s.day, category: s.category, model: s.model, score: s.score })),
  )

  return Response.json({
    text,
    code,
    inserted: inserted.length,
  })
}
