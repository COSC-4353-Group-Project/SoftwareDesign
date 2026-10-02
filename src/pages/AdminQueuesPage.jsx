import "./AdminQueuesPage.css";
import React, {useState} from 'react';

/* Mock data for search filters in queues and whatnot */
const MOCK_DATA = [
  {id: 1, guest: "Thu", service: "Dine-in", status: "Completed"},
  {id: 2, guest: "Anaya", service: "Dine-in", status: "Completed"},
  {id: 3, guest: "Justin", service: "Dine-in", status: "Canceled"},
  {id: 4, guest: "Vincent", service: "Bar Seating", status: "Done"},
  {id: 5, guest: "Gnome", service: "Patio", status: "Completed"}
];

const ALL_QUEUES = ["All", "Dine-in", "Bar Seating", "Patio"];
const ALL_STATUS = ["All", "Completed", "Done", "Canceled"];

function AdminQueuesPage() {
  const [selectedQueue, setSelectedQueue] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchGuest, setSearchGuest] = useState("");

  /* Attempted to make a dropdown. This doesn't work but maybe could be helpful? */
  function dropdown(parameters, type) {
    return (
    <label>
      {type}
        <select value = {choice} onChange = {(e) => setChoice(e.target.value)}>
          <option value = {parameters[0]}>{parameters[0]}</option>
          <option value = {parameters[1]}>{parameters[1]}</option>
          <option value = {parameters[2]}>{parameters[2]}</option>
          <option value = {parameters[3]}>{parameters[3]}</option>
        </select>
    </label>
    );
  }

  return (
    <div className="admin-queues-page">
      {/* placeholder, will change queues and statuses to filters */}
      <div className="admin-queues-header">
        <div>
          <h1>Guest Queue</h1>
          <p>Manage waiting parties and seating</p>
        </div>
        <div className="admin-queues-filters">
          <div className="admin-queues-filter">
            {/* Search guest name */}
            Search Guest Name...
          </div>
          <div className="admin-queues-filter">
            All Queues
            {/* Attempted to call on function `dropdown` to make the dropdown menu, failed. */}
            {/* {dropdown(ALL_QUEUES, "All Queues")} */}
          </div>
          <div className="admin-queues-filter">
            All statuses
          </div>
        </div>
      </div>

      {/* summary cards at top*/}
      <div className="admin-queues-summaries">
        <section className="admin-queues-summary">
          <h2>Dine-in</h2>
          <div className = "admin-box-desc">
            <h2>{MOCK_DATA[0].guest} - {MOCK_DATA[0].status}</h2>
            <h2>{MOCK_DATA[1].guest} - {MOCK_DATA[1].status}</h2>
            <h2>{MOCK_DATA[2].guest} - {MOCK_DATA[2].status}</h2>
          </div>
        </section>
        <section className="admin-queues-summary">
          <h2>Bar Seating</h2>
          <div className = "admin-box-desc">
            <h2>{MOCK_DATA[3].guest} - {MOCK_DATA[3].status}</h2>
          </div>
        </section>
        <section className="admin-queues-summary">
          <h2>Patio</h2>
          <div className = "admin-box-desc">
            <h2>{MOCK_DATA[4].guest} - {MOCK_DATA[4].status}</h2>
          </div>
        </section>
        <section className="admin-queues-summary">
          <h2>Average time waiting</h2>
          <div className = "admin-box-desc">
            {/* I don't know how to implement an average time thing like Justin has done. - Vince */}
            <h2>About 40ish minutes? Maybe. I'm guessing with this hard coded mock data.</h2>
          </div>
        </section>
      </div>

      {/* queue list and party details */}
      <div className="admin-queues-layout">
        <section className="admin-queues-table-card">
          <h2>Queue List</h2>
          <div className="admin-queues-table-scroll"></div>
        </section>

        <aside className="admin-queues-details">
          <h2>Party Details</h2>
          <div className="admin-queues-details-body"></div>
        </aside>
      </div>
    </div>
  );
}

export default AdminQueuesPage;