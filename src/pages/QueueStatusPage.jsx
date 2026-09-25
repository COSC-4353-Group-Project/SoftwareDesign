import './QueueStatusPage.css'

// Layout only. 
export default function QueueStatusPage() {
  return (
    <div className="queue-page">
      {/* header: title & service name on the left, status badge on the right */}
      <div className="queue-header">
        <div>
          <div className="queue-box queue-box-title">Title</div>
          <div className="queue-box queue-box-subtitle">Service name</div>
        </div>
        <div className="queue-box queue-box-badge">Badge</div>
      </div>

      <div className="queue-layout">
        {/* main column */}
        <div className="queue-main">
          <div className="queue-box queue-box-position">Position card</div>
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
