import './HistoryPage.css'

const MOCK_DATA = [
  {id: 1, service: 'Peasant Dinner', date: '9-17-2026', bribe: '$0.00', status: 'Entered'},
  {id: 2, service: 'Richy McGee', date: '9-19-2026', bribe: '$150.00', status: 'Entered'},
  {id: 3, service: 'Bar', date: '9-27-2026', bribe: '$0.00', status: 'Canceled'}
];
/* Pretty sure the name of this const is self explanatory */

export default function HistoryPage(){
    return (
      <div className="history-page">
        {/* header: title & service name on the left, status badge on the right */}
        <div className="history-header">
          <h1>Queue History</h1>
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
              {/* Inputting mock data; each <div> is a new segment for data */}
              <div className = "history-box">
                    <h2>{MOCK_DATA[0].service}</h2>
                    <h2>{MOCK_DATA[0].date}</h2>
                    <h2>{MOCK_DATA[0].bribe}</h2>
                    <h2>{MOCK_DATA[0].status}</h2>
                  </div>
              <div className = "history-box">
                    <h2>{MOCK_DATA[1].service}</h2>
                    <h2>{MOCK_DATA[1].date}</h2>
                    <h2>{MOCK_DATA[1].bribe}</h2>
                    <h2>{MOCK_DATA[1].status}</h2>  
                  </div>
              <div className = "history-box">
                    <h2>{MOCK_DATA[2].service}</h2>
                    <h2>{MOCK_DATA[2].date}</h2>
                    <h2>{MOCK_DATA[2].bribe}</h2>
                    <h2>{MOCK_DATA[2].status}</h2>
                  </div>
          </div>
        </div>
      </div>
      )
}