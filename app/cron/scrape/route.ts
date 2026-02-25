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
      const cellsHtml = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
      if (cellsHtml.length < 5) return null

      const rank = parseInt(stripTags(cellsHtml[0]))

      // Extract model name from <a title="..."> in the name cell
      const modelMatch = cellsHtml[2].match(/<a[^>]*\stitle="([^"]+)"/)
      const model = modelMatch ? modelMatch[1] : ''

      // Extract org and license from the subtitle span
      const subtitleMatch = cellsHtml[2].match(/<span[^>]*text-text-secondary[^>]*>([\s\S]*?)<\/span>/)
      const subtitle = subtitleMatch ? stripTags(subtitleMatch[1]) : ''
      const subtitleParts = subtitle.split('·').map((s) => s.trim())
      const organization = subtitleParts[0] || ''
      const license = subtitleParts[1] || ''

      // Score: "1505 ±8" or "1561 +14/-14"
      const scoreText = stripTags(cellsHtml[3])
      const scoreMatch = scoreText.match(/^(\d+)\s+(.+)$/)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : parseInt(scoreText)
      const ci = scoreMatch ? scoreMatch[2] : ''

      const votes = parseInt(stripTags(cellsHtml[4]).replace(/,/g, ''))

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
  const categories = [
    'text',
    'code',
    'vision',
    'text-to-image',
    'image-edit',
    'search',
    'text-to-video',
    'image-to-video',
  ]
  const results = await Promise.all(categories.map(fetchAndParseScores))

  const allScores = results.flat()
  const day = allScores[0]?.day ?? new Date().toISOString().slice(0, 10)
  await deleteScoresByDay(day)
  const inserted = await insertScores(
    allScores.map((s) => ({ day: s.day, category: s.category, model: s.model, score: s.score })),
  )

  return Response.json({
    inserted: inserted,
    counts: Object.fromEntries(categories.map((c, i) => [c, results[i].length])),
  })
}
