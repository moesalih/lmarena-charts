import { desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { int, QueryBuilder, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { dbQuery } from '@/lib/services/cloudflare-d1'
export { dbQuery } from '@/lib/services/cloudflare-d1'

const qb = new QueryBuilder()

//////////

type AnalyticsEvent = { event: string; param?: string; fid?: number; platform?: string }
export async function sendAnalyticsEvent({ event, param, fid, platform }: AnalyticsEvent) {
  return await dbQuery({
    sql: `INSERT INTO analytics_events (event, param, fid, platform) VALUES (?, ?, ?, ?)`,
    params: [event, param ?? null, fid ?? null, platform ?? null],
  })
}

//////////

type LMArenaScore = {
  // id: number
  day: string
  category: string
  model: string
  // organization: string
  score: number
  // ci: string
  // votes: number
  // license: string
}

export async function deleteScoresByDay(day: string) {
  return await dbQuery({ sql: `DELETE FROM lmarena_scores WHERE day = $1`, params: [day] })
}

export async function insertScore({ day, category, model, score }: LMArenaScore) {
  const [scoreRow] = await dbQuery({
    sql: `INSERT INTO lmarena_scores (day, category, model, score) VALUES ($1, $2, $3, $4) RETURNING *`,
    params: [day, category, model, score],
  })
  return scoreRow
}

export async function insertScores(scores: LMArenaScore[]) {
  if (!scores.length) return []
  const BATCH_SIZE = 25 // 4 params per row, stay under D1's 100 param limit
  const results: any = []
  for (let i = 0; i < scores.length; i += BATCH_SIZE) {
    const batch = scores.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(', ')
    const params = batch.flatMap((s) => [s.day, s.category, s.model, s.score])
    const rows = await dbQuery({
      sql: `INSERT INTO lmarena_scores (day, category, model, score) VALUES ${placeholders} RETURNING *`,
      params,
    })
    results.push(...rows)
  }
  return results
}
