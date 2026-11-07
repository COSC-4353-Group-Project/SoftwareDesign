import {db} from '../data/db.js'

//Vince: I more or less copied the layout from `serviceLogice.js`
//Took a while until I looked deeper into the schema instead of just `db.js`

// BUG FIX (Justin, 11-06): createHistory and updateHistory are gone. They tried to INSERT/UPDATE
// columns queue_entries doesn't have (service, date, bribe), so they always crashed.
// queue_history is a view over queue_entries + queue_skips, so history is read-only: every join,
// serve, cancel and bribe already shows up in it by itself (same reason deleteHistory was removed).

function toHistory(row){
  return {
    id: row.id,
    userId: row.user_id,
    service: row.service,
    date: row.date,
    bribe: row.bribe,
    status : row.status
  }
}

const SELECT_HISTORY = `SELECT * FROM queue_history`

// Everyone's history (staff only, see routes/history.js)
export function listHistory(){
  const rows = db.prepare(`${SELECT_HISTORY} ORDER BY id`).all()
  return rows.map(toHistory)
}

// One guest's history, newest first. The WHERE does the filtering in SQL
// instead of loading every guest's rows and filtering them in JavaScript.
export function listHistoryForUser(userId){
  const rows = db.prepare(`${SELECT_HISTORY} WHERE user_id = ? ORDER BY id DESC`).all(userId)
  return rows.map(toHistory)
}

export function getHistoryById(id){
  const row = db.prepare(`${SELECT_HISTORY} WHERE id = ?`).get(id)
  if(!row){
    return undefined
  }
  return toHistory(row)
}
