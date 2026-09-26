import './HistoryPage.css'

export default function HistoryPage(){
    return (
    <div className="history-page">
      {/* header: title & service name on the left, status badge on the right */}
      <div className="history-header">
      </div>

      <div className="history-layout">
        {/* main column */}
        <div className="history-main">
            <div className="history-box-labels history-box-position">
                <span>Service</span>
                <span>Date</span>
                <span>Bribe Amount</span>
                <span>Queue Status</span>
            </div>
            <div className="history-box history-box-position">History box</div>
        </div>
      </div>
    </div>
    )
}