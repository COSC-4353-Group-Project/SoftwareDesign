import "./UserDashboard.css";
import { Clock, Users } from "lucide-react"; // icons for the live wait time cards
import { useNavigate } from "react-router-dom"; // Thu: button click

// layout shenanigans

function UserDashboard() {
  const navigate = useNavigate();
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
      <div className="dashboard-table-header">
        {" "}
        {/** next header for "get a table" section */}
        <div>
          <h3>~Get a table~</h3>
        </div>
      </div>

      <div className="dashboard-layout">
        {" "}
        {/** these should be just regular boxes for now */}

        {/* Thu: Removed Reservation, Join Waitlist is the only button */}
        <div
          className="dashboard-general-box dashboard-waitlist"
          role="link"
          tabIndex={0}
          onClick={() => navigate("/join-queues")}
          onKeyDown={(event) => {
            if (event.key === "Enter") navigate("/join-queues");
          }}
          style={{ cursor: "pointer" }}
        >
          <h3>Join Waitlist</h3>
        </div>
      </div>

      <p></p>

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
          <p></p>
          <p></p>
          <div className="dashboard-notif-box dashboard-notif-title">
            <h4>Recent notifications</h4>
          </div>
          <div className="dashboard-general-box dashboard-notifs"></div>
        </aside>
      </div>
    </div>
  );
}

export default UserDashboard;
