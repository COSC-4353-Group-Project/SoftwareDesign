import "./UserDashboard.css";
import { Clock, ListPlus, Users } from "lucide-react"; // icons for the join card + live wait time cards
import { Link } from "react-router-dom";

// layout shenanigans

// Fake notifications until the backend exists, newest first.
const MOCK_NOTIFICATIONS = [
  { id: 3, title: "You're #3 in line", body: "Head back to the host stand soon.", time: "7:18 PM" },
  { id: 2, title: "Moved up to #5", body: "Skip 3 spots · $9", time: "7:02 PM" },
  { id: 1, title: "You joined the waitlist", body: "Dine-in · Party of 1–2 · you're #8", time: "6:51 PM" },
];

function UserDashboard() {
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
            <span className="dashboard-entry-desc">Here now? Get in line and we'll notify you.</span>
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
            <div className="wait-grid">
              <div className="wait-card">
                <div className="wait-card-top">
                  <p className="wait-card-name">Dine-in · Party of 1–2</p>
                  <span className="wait-badge-open">Open</span>
                </div>
                <p className="wait-card-desc">
                  Standard table seating for dates.
                </p>
                <div className="wait-card-stats">
                  <span className="wait-stat">
                    <Users size={14} /> 9 in line
                  </span>
                  <span className="wait-stat">
                    <Clock size={14} /> ~1 hr
                  </span>
                </div>
              </div>

              <div className="wait-card">
                <div className="wait-card-top">
                  <p className="wait-card-name">Dine-in · Party of 3–6</p>
                  <span className="wait-badge-open">Open</span>
                </div>
                <p className="wait-card-desc">
                  Larger tables and booths. Longer Wait-Time.
                </p>
                <div className="wait-card-stats">
                  <span className="wait-stat">
                    <Users size={14} /> 14 in line
                  </span>
                  <span className="wait-stat">
                    <Clock size={14} /> ~2 hr 15 min
                  </span>
                </div>
              </div>

              <div className="wait-card">
                <div className="wait-card-top">
                  <p className="wait-card-name">Bar Seating</p>
                  <span className="wait-badge-open">Open</span>
                </div>
                <p className="wait-card-desc">
                  First-come bar stools. Bartender Service
                </p>
                <div className="wait-card-stats">
                  <span className="wait-stat">
                    <Users size={14} /> 5 in line
                  </span>
                  <span className="wait-stat">
                    <Clock size={14} /> ~24 min
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <aside className="dashboard-sidebar">
          {/* title lives inside the box now, top of the box lines up with "Live wait times" */}
          <div className="dashboard-notifs">
            <h4 className="dashboard-notifs-title">Recent notifications</h4>
            {MOCK_NOTIFICATIONS.length === 0 ? (
              <p className="dashboard-notifs-empty">Nothing yet. Updates about your spot show up here.</p>
            ) : (
              <ul className="dashboard-notifs-list">
                {/* only the 4 newest, same as the test site */}
                {MOCK_NOTIFICATIONS.slice(0, 4).map((notif) => (
                  <li key={notif.id}>
                    <p className="dashboard-notif-name">{notif.title}</p>
                    <p className="dashboard-notif-detail">{notif.body} · {notif.time}</p>
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

export default UserDashboard;
