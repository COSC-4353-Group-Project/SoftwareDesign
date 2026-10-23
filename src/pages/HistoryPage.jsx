import "./HistoryPage.css";
import { useState, useEffect } from "react";

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   fetch('/api/history')
  //   .then((res) => res.json())
  //   .then((data => {
  //     setHistoryItems(data)
  //     setLoading(false)
  //   }))
  //   .catch((err) => {
  //     console.error('Failed to fetch history:', err)
  //     setLoading(false)
  //   })
  // }, [])

  // THU: only requesting logged-in customer's record since we added auth
  useEffect(() => {
    fetch("/api/history/mine", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch history");
        }
        return res.json();
      })
      .then((data) => {
        setHistoryItems(data);
      })
      .catch((err) => {
        console.error("Failed to fetch history:", err);
        setHistoryItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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

          {loading ? (
            <p>Loading history...</p>
          ) : historyItems.length === 0 ? (
            <p>There are no previous queues.</p>
          ) : (
            historyItems.map((item) => (
              <div className="history-box" key={item.id}>
                <h2>{item.serviceName || item.service}</h2>
                <h2>{item.date}</h2>
                <h2>${item.bribe}</h2>
                <h2>{item.status}</h2>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
