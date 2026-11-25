import { db } from '../data/db.js'

export function generateAdminReport({ startDate, endDate } = {}) {
  const conditions = []
  const params = []

  if (startDate) {
    conditions.push("date(queue_entries.joined_at, 'localtime') >= date(?)")
    params.push(startDate)
  }
  if (endDate) {
    conditions.push("date(queue_entries.joined_at, 'localtime') <= date(?)")
    params.push(endDate)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const serviceJoinDateClause =
    conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

  const summary = db
    .prepare(
      `
      SELECT
        COUNT(DISTINCT queue_entries.id) AS totalParties,
        COALESCE(SUM(CASE WHEN queue_entries.status = 'served' THEN 1 ELSE 0 END), 0) AS servedCount,
        COALESCE(SUM(CASE WHEN queue_entries.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelledCount,
        COALESCE(SUM(CASE WHEN queue_entries.status = 'waiting' THEN 1 ELSE 0 END), 0) AS waitingCount,
        ROUND(AVG(
          CASE
            WHEN queue_entries.status = 'served' AND queue_entries.served_at IS NOT NULL
            THEN (julianday(queue_entries.served_at) - julianday(queue_entries.joined_at)) * 1440
          END
        ), 1) AS avgWaitMinutes,
        COALESCE(SUM(queue_skips.price), 0) AS totalBribeRevenue
      FROM queue_entries
      LEFT JOIN queue_skips ON queue_skips.queue_entry_id = queue_entries.id
      ${whereClause}
    `,
    )
    .get(...params)

  const byService = db
    .prepare(
      `
      SELECT
        services.id AS serviceId,
        services.name AS serviceName,
        COUNT(DISTINCT queue_entries.id) AS totalParties,
        COALESCE(SUM(CASE WHEN queue_entries.status = 'served' THEN 1 ELSE 0 END), 0) AS servedCount,
        COALESCE(SUM(CASE WHEN queue_entries.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelledCount,
        ROUND(AVG(
          CASE
            WHEN queue_entries.status = 'served' AND queue_entries.served_at IS NOT NULL
            THEN (julianday(queue_entries.served_at) - julianday(queue_entries.joined_at)) * 1440
          END
        ), 1) AS avgWaitMinutes,
        COALESCE(SUM(queue_skips.price), 0) AS bribeRevenue
      FROM services
      LEFT JOIN queue_entries
        ON queue_entries.service_id = services.id
        ${serviceJoinDateClause}
      LEFT JOIN queue_skips
        ON queue_skips.queue_entry_id = queue_entries.id
      GROUP BY services.id
      ORDER BY services.id ASC
    `,
    )
    .all(...params)

  return {
    generatedAt: new Date().toISOString(),
    filters: { startDate: startDate || null, endDate: endDate || null },
    summary,
    byService,
  }
}