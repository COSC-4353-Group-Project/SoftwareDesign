import "./UserDashboard.css";
import { Clock, ListPlus, Users } from "lucide-react"; // icons for the join card + live wait time cards
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

// layout shenanigans

function UserDashboard() {
  // THU: for sending notifs and error checking
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState("");

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load notifications.");
        }

        const data = await response.json();
        setNotifications(data);
      } catch (err) {
        setNotificationError(err.message);
      }
    }

    fetchNotifications();
  }, []);

  // Anaya: an attempt at backend thingss i guess???

  const [userDashItems, setuserDashItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/userDash')
      .then((res) => res.json())
      .then((data => {
        setuserDashItems(data)
        setLoading(false)
      }))
      .catch((err) => {
        console.error('Failed to fetch user items:', err)
        setLoading(false)
      })
  }, [])

  // const dineIn = userDashItems.find((item) => item.id === 1) Anaya: was for testing if front and back end connected

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-box-hello dashboard-hi">
            {" "}
            {/** greets the user w address */}
            <h1>Hi, user!</h1>{" "}
            {/**this'll have to be replaced with the actual person's name */}
          </div>
          <div className="dashboard-box-hello dashboard-address">
            <h4>1984 Nowhere Atlantis Suite, Middleof</h4>
          </div>
        </div>
      </div>
      {/* "Get a table" section, same layout as the test site */}
      <section>
        <h4 className="dashboard-section-title">Get a table</h4>

        {/* THU: Removed Reservation, Join Waitlist is the only button.
            The whole card is a Link, so clicking anywhere on it goes to the join page
            (and Enter works on it automatically, since Links are keyboard-friendly by default) */}
        <Link to="/join-queues" className="dashboard-entry">
          <span className="dashboard-entry-icon">
            <ListPlus size={20} />
          </span>
          <span>
            <span className="dashboard-entry-title">Join Waitlist</span>
            <span className="dashboard-entry-desc">
              Here now? Get in line and we'll notify you.
            </span>
          </span>
        </Link>
      </section>

      <div className="dashboard-layout-content">
        <div className="dashboard-main">
          <div className="dashboard-wait-box dashboard-wait-title">
            <h4>Live wait times</h4>
          </div>
          <div className="dashboard-general-box dashboard-waittimes">
            {/** grid of wait time cards**/}
            {/* Anaya: where i have to start the map for new cards, start with the loading */}
            <div className="wait-grid">
              {loading ? (
                <p>Loading wait times...</p>
              ) : userDashItems.length === 0 ? (
                <p>No wait times to show.</p>
              ) : (
                userDashItems.map((item) =>
                <div className="wait-card" key = {item.id}>
                    <div className="wait-card-top"> 
                      <p className="wait-card-name">{item.name}</p>
                      {item.isOpen ? (
                        <span className="wait-badge-open">Open</span>
                      ) : (
                        <span className="wait-badge-closed">Closed</span>
                      )}
                  </div>
                  <p className="wait-card-desc">
                    {item.description}
                  </p>
                 <div className="wait-card-stats">
                   <span className="wait-stat">
                     <Users size={14} /> {item.inLine}
                   </span>
                   <span className="wait-stat">
                     <Clock size={14} /> {item.duration}
                   </span>
                 </div>
                </div>
                  )
                )
              }
            </div>
          </div>
        </div>
        <aside className="dashboard-sidebar">
          {/* title lives inside the box now, top of the box lines up with "Live wait times" */}
          <div className="dashboard-notifs">
            <h4 className="dashboard-notifs-title">Recent notifications</h4>
            {/* THU: replacing mock  */}
            {notificationError ? (
              <p className="dashboard-notifs-empty">{notificationError}</p>
            ) : notifications.length === 0 ? (
              <p className="dashboard-notifs-empty">
                Nothing yet. Updates about your spot show up here.
              </p>
            ) : (
              <ul className="dashboard-notifs-list">
                {notifications.slice(0, 4).map((notif) => (
                  <li key={notif.id}>
                    <p className="dashboard-notif-name">{notif.title}</p>
                    <p className="dashboard-notif-detail">
                      {notif.body} ·{" "}
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

//  <div className="wait-card">
//                 <div className="wait-card-top"> 
//                   <p className="wait-card-name">Dine-in · Party of 1–2</p>
//                   <span className="wait-badge-open">Open</span>
//                 </div>
//                 <p className="wait-card-desc">
//                   Standard table seating for dates.
//                 </p>
//                 <div className="wait-card-stats">
//                   <span className="wait-stat">
//                     <Users size={14} /> 9 in line
//                   </span>
//                   <span className="wait-stat">
//                     <Clock size={14} /> ~1 hr
//                   </span>
//                 </div>
//               </div>

//               <div className="wait-card">
//                 <div className="wait-card-top">
//                   <p className="wait-card-name">Dine-in · Party of 3–6</p>
//                   <span className="wait-badge-open">Open</span>
//                 </div>
//                 <p className="wait-card-desc">
//                   Larger tables and booths. Longer Wait-Time.
//                 </p>
//                 <div className="wait-card-stats">
//                   <span className="wait-stat">
//                     <Users size={14} /> 14 in line
//                   </span>
//                   <span className="wait-stat">
//                     <Clock size={14} /> ~2 hr 15 min
//                   </span>
//                 </div>
//               </div>

//               <div className="wait-card">
//                 <div className="wait-card-top">
//                   <p className="wait-card-name">Bar Seating</p>
//                   <span className="wait-badge-open">Open</span>
//                 </div>
//                 <p className="wait-card-desc">
//                   First-come bar stools. Bartender Service
//                 </p>
//                 <div className="wait-card-stats">
//                   <span className="wait-stat">
//                     <Users size={14} /> 5 in line
//                   </span>
//                   <span className="wait-stat">
//                     <Clock size={14} /> ~24 min
//                   </span>
//                 </div>
//               </div>

export default UserDashboard;
