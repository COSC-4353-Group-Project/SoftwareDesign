import { Clock, Users } from 'lucide-react'
import './QueueStatusPage.css'

// Fake data until the backend exists. 
const MOCK_ENTRY = {
  serviceName: 'Dinner seating',
  partySize: 4,
  position: 3,
  initialPosition: 8,
  minutesPerParty: 6,
}

const ALMOST_READY_AT = 3 // positions 1-3 count as "almost ready"

//  Helpers for the minutes format and waittime. 

function estimateWait(position, minutesPerParty) {
  return Math.max(0, position) * minutesPerParty
}

function formatMinutes(min) {
  if (min <= 0) return 'Now'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h} hr ${m} min` : `${h} hr`
}

//  Position card

function PositionCard({ entry }) {
  const wait = estimateWait(entry.position, entry.minutesPerParty)
  const almostReady = entry.position <= ALMOST_READY_AT
  // how far through the line they are, 0-100
  const progress = entry.initialPosition > 0
    ? Math.round(((entry.initialPosition - entry.position) / entry.initialPosition) * 100)
    : 0

  return (
    <section className={almostReady ? 'position-card almost-ready' : 'position-card'}>
      <p className="position-label">Your position</p>
      <p className="position-number" aria-live="polite">#{entry.position}</p>

      <div className="position-meta">
        <span><Clock size={16} aria-hidden /> ~{formatMinutes(wait)}</span>
        <span><Users size={16} aria-hidden /> Party of {entry.partySize}</span>
      </div>

      {almostReady && (
        <p className="position-alert">Almost your turn. go bother the host stand.</p>
      )}

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress through queue"
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="queue-box queue-box-stepper">Gonna make this better soon</div>
    </section>
  )
}

//  Page

export default function QueueStatusPage() {
  const entry = MOCK_ENTRY

  return (
    <div className="queue-page">
      {/* header: title & service name on the left, status badge on the right */}
      <div className="queue-header">
        <div>
          <h1 className="queue-title">Queue status</h1>
          <p className="queue-subtitle">{entry.serviceName}</p>
        </div>
        <div className="queue-box queue-box-badge">Badge</div>
      </div>

      <div className="queue-layout">
        {/* main column */}
        <div className="queue-main">
          <PositionCard entry={entry} />
          <div className="queue-box queue-box-skip">Skip / move up panel</div>
        </div>

        {/* sidebar, should expand with more info if needed (downwards) */}
        <aside className="queue-sidebar">
          <div className="queue-box queue-box-details">Details</div>
          <div className="queue-box queue-box-cancel">Leave queue</div>
          <div className="queue-box queue-box-link">Back link</div>
        </aside>
      </div>
    </div>
  )
}
