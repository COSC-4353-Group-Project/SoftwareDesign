import {db} from '../data/db.js'

//Vince: I more or less copied the layout from `serviceLogice.js`
//Took a while until I looked deeper into the schema instead of just `db.js`

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

export function listHistory(){
  const rows = db.prepare(`${SELECT_HISTORY} queue_history ORDER BY id`).all()
  return rows.map(toHistory)
}

export function getHistoryById(id){
  const row = db.prepare(`${SELECT_HISTORY} WHERE id = ?`).get(id)
  if(!row){
    return undefined
  }
  return toHistory(row)
}

function historyFields(body) {
  return {
    service: body.service.trim(),
    date: body.date,
    bribe: body.bribe,
    status: body.status,
  }
}

// Adds a new service and returns it. The new id is one higher than the biggest id so far, tldr iterative so no dup.s 
export function createHistory(body) {
  const fields = historyFields(body)
  const result = db.prepare(`
    INSERT into queue_entries (service, date, bribe, status) VALUES (?, ?, ? ?)  
  `).run(fields.service, fields.date, fields.bribe, fields.status)

  return getHistoryById(result.lastInsertRowid)
}

// Replaces the fields of an existing service and returns it,
// or undefined if there is no service with that id.
// fields = the new info = sercice = old info.
export function updateHistory(id, body) {
  const fields = historyFields(body)
  const result = db.prepare(`
    UPDATE queue_entries
    SET service = ?, date = ?, bribe = ?, status = ? WHERE id = ?  
  `).run(fields.service, fields.date, fields.bribe, fields.status, id)

    if(result.changes === 0){
      return undefined
    }
    return getHistoryById(id)
}

export function deleteHistory(id){
  const result = db.prepare('DELETE FROM queue_history WHERE id = ?').run(id)
  return result.changes > 0
}