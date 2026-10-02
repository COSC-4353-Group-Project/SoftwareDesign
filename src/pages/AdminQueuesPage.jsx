import "./AdminQueuesPage.css";
<<<<<<< Updated upstream

function AdminQueuesPage() {
=======
import { useState } from "react";

// just a bunch of mock data
const QUEUES = [
  { id: "small", label: "Dine-in · Party of 1–2" },
  { id: "large", label: "Dine-in ·  Party of 3–6" },
  { id: "bar", label: "Bar Seating" },
  { id: "patio", label: "Patio" },
];

const STATUS_LABELS = {
  waiting: "Waiting",
  done: "Done",
  cancelled: "Cancelled",
};

const MOCK_DATA = {
  parties: [
    {
      id: "1",
      name: "Justin",
      size: 2,
      queue: "small",
      joined: "2:15 PM",
      wait: "10m",
      status: "waiting",
      paid: 0,
    },
    {
      id: "2",
      name: "Anaya",
      size: 2,
      queue: "small",
      joined: "2:21 PM",
      wait: "3m",
      status: "waiting",
      paid: 15,
    },
    {
      id: "3",
      name: "Vincent",
      size: 1,
      queue: "large",
      joined: "2:28 PM",
      wait: "3m",
      status: "waiting",
      paid: 0,
    },
    {
      id: "4",
      name: "Thu",
      size: 4,
      queue: "bar",
      joined: "2:08 PM",
      wait: "3m",
      status: "waiting",
      paid: 0,
    },
  ],
  order: {
    small: ["2", "1"],
    large: ["3"],
    bar: ["4"],
    patio: [],
  },
};

const SUMMARIES = [
  { label: "Dine-in", value: 3, hint: "parties waiting" },
  { label: "Bar Seating", value: 1, hint: "parties waiting" },
  { label: "Patio", value: 0, hint: "parties waiting" },
  {
    label: "Average time waiting",
    value: "21m",
    hint: "since active parties joined",
  },
];

function AdminQueuesPage() {
  const [data, setData] = useState(MOCK_DATA);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("2");

  // guest information and waiting parties in a queue
  const byId = Object.fromEntries(
    data.parties.map((party) => [party.id, party]),
  );

  const activeOrders = Object.fromEntries(
    QUEUES.map((queue) => [
      queue.id,
      data.order[queue.id].filter((id) => byId[id].status === "waiting"),
    ]),
  );

  // reorder when a queue is changed
  const positions = {};

  QUEUES.forEach((queue) => {
    activeOrders[queue.id].forEach((id, index) => {
      positions[id] = index + 1;
    });
  });

  // search by name
  function matches(party) {
    return party.name.toLowerCase().includes(search.trim().toLowerCase());
  }

  const activeRows = QUEUES.flatMap((queue) =>
    activeOrders[queue.id].map((id) => byId[id]),
  ).filter(matches);

  // show queue by position
  activeRows.sort(
    (a, b) =>
      positions[a.id] - positions[b.id] ||
      QUEUES.findIndex((queue) => queue.id === a.queue) -
        QUEUES.findIndex((queue) => queue.id === b.queue),
  );
  
  const completedRows = data.parties.filter(
    (party) => party.status !== "waiting" && matches(party),
  );
  const selected = byId[selectedId];
  const serveTarget = activeRows[0];

  // puts the already marked done queue to the bottom of the table
  function changeStatus(id, status) {
    setData((current) => ({
      ...current,
      parties: current.parties.map((party) =>
        party.id === id ? { ...party, status } : party,
      ),
    }));
  }

  // moving queue up and down
  // this only works when it's the same seating preference, doesn't really make sense to bump if one is asking for patio and the other for table inside 
  function moveParty(id, direction) {
    setData((current) => {
      const party = current.parties.find((entry) => entry.id === id);
      if (!party || party.status !== "waiting") return current;

      const activeIds = current.order[party.queue].filter((entryId) =>
        current.parties.some(
          (entry) => entry.id === entryId && entry.status === "waiting",
        ),
      );

      const from = activeIds.indexOf(id);
      const to = from + direction;

      if (from < 0 || to < 0 || to >= activeIds.length) return current;

      const updatedOrder = [...current.order[party.queue]];
      const firstIndex = updatedOrder.indexOf(id);
      const secondIndex = updatedOrder.indexOf(activeIds[to]);

      [updatedOrder[firstIndex], updatedOrder[secondIndex]] = [
        updatedOrder[secondIndex],
        updatedOrder[firstIndex],
      ];

      return {
        ...current,
        order: { ...current.order, [party.queue]: updatedOrder },
      };
    });
  }

  // popup confirmation when you try to cancel a queue
  function cancelParty(party) {
    if (
      window.confirm(
        `Cancel this entry?\n${party.name} will be removed from the active queue. This can't be undone.`,
      )
    ) {
      changeStatus(party.id, "cancelled");
    }
  }

  // serving next, targets top row
  function serveNext() {
    if (!serveTarget) return;
    changeStatus(serveTarget.id, "done");
    setSelectedId(serveTarget.id);
  }

  function createRow(party, completed = false) {
    const index = activeOrders[party.queue].indexOf(party.id);

    return (
      <tr
        key={party.id}
        className={[
          selectedId === party.id ? "selected" : "",
          completed ? "completed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setSelectedId(party.id)}
      >
        <td>{completed ? "—" : `#${positions[party.id]}`}</td>
        <td>
          <button
            type="button"
            className="admin-queues-guest"
            onClick={() => setSelectedId(party.id)}
            aria-label={`View details for ${party.name}`}
            aria-pressed={selectedId === party.id}
          >
            {party.name}
          </button>
        </td>
        <td>{party.size}</td>
        <td>{QUEUES.find((queue) => queue.id === party.queue).label}</td>
        <td>{party.joined}</td>
        <td>{party.wait}</td>
        <td>
          {party.paid > 0 ? (
            <span className="admin-queues-priority">
              ${party.paid.toFixed(2)}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td>{STATUS_LABELS[party.status]}</td>
        <td onClick={(event) => event.stopPropagation()}>
          {!completed && (
            <div className="admin-queues-actions">
              <button
                type="button"
                className="admin-queues-arrow"
                aria-label={`Move ${party.name} up`}
                disabled={index <= 0}
                onClick={() => moveParty(party.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-queues-arrow"
                aria-label={`Move ${party.name} down`}
                disabled={index >= activeOrders[party.queue].length - 1}
                onClick={() => moveParty(party.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="admin-queues-cancel"
                onClick={() => cancelParty(party)}
              >
                Cancel
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  }

>>>>>>> Stashed changes
  return (
    <div className="admin-queues-page">
      {/* placeholder, will change queues and statuses to filters */}
      <div className="admin-queues-header">
        <div>
          <p className="admin-queues-brand">BribeSmart</p>
          <h1>Guest Queue</h1>
          <p className="admin-queues-subtitle">
            Manage waiting parties and seating
          </p>
        </div>

        <div className="admin-queues-filters">
<<<<<<< Updated upstream
          <div className="admin-queues-filter">Search guest name</div>
          <div className="admin-queues-filter">All queues</div>
          <div className="admin-queues-filter">All statuses</div>
=======
          <input
            type="search"
            aria-label="Search guest name"
            placeholder="Search guest name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select aria-label="Filter by queue" defaultValue="all">
            <option value="all">All queues</option>
            {QUEUES.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.label}
              </option>
            ))}
          </select>

          <select aria-label="Filter by status" defaultValue="all">
            <option value="all">All statuses</option>
            <option value="waiting">Waiting</option>
            <option value="cancelled">Cancelled</option>
            <option value="done">Done</option>
          </select>
>>>>>>> Stashed changes
        </div>
      </div>

      {/* summary cards at top*/}
      <div className="admin-queues-summaries">
<<<<<<< Updated upstream
        <section className="admin-queues-summary">
          <h2>Dine-in</h2>
        </section>
        <section className="admin-queues-summary">
          <h2>Bar Seating</h2>
        </section>
        <section className="admin-queues-summary">
          <h2>Patio</h2>
        </section>
        <section className="admin-queues-summary">
          <h2>Average time waiting</h2>
        </section>
=======
        {SUMMARIES.map((summary) => (
          <section className="admin-queues-summary" key={summary.label}>
            <h2>{summary.label}</h2>
            <strong>{summary.value}</strong>
            <p>{summary.hint}</p>
          </section>
        ))}
>>>>>>> Stashed changes
      </div>

      {/* queue list and party details */}
      <div className="admin-queues-layout">
        <section className="admin-queues-table-card">
          <div className="admin-queues-table-header">
            <div>
              <h2>Queue List</h2>
              <p>
                {activeRows.length} active · {completedRows.length} completed
              </p>
            </div>
            <button
              type="button"
              className="admin-queues-primary"
              disabled={!serveTarget}
              onClick={serveNext}
            >
              Serve next
            </button>
          </div>

          <div className="admin-queues-table-scroll">
            <table className="admin-queues-table">
              <thead>
                <tr>
                  <th scope="col">Position</th>
                  <th scope="col">Guest name</th>
                  <th scope="col">Party size</th>
                  <th scope="col">Seating Preference</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Est. wait</th>
                  <th scope="col">Paid priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((party) => createRow(party))}
                {completedRows.map((party) => createRow(party, true))}
              </tbody>
            </table>
          </div>
        </section>

        {/* show selected queue info */}
        <aside className="admin-queues-details">
          {selected && (
            <>
              <div className="admin-queues-details-header">
                <h2>Party Details</h2>
                <p>
                  {QUEUES.find((queue) => queue.id === selected.queue).label}
                </p>
              </div>

              <div className="admin-queues-details-body">
                <div className="admin-queues-person">
                  <span className="admin-queues-avatar">
                    {selected.name[0]}
                  </span>
                  <h3>{selected.name}</h3>
                </div>

                <dl className="admin-queues-details-list">
                  <div>
                    <dt>Party size</dt>
                    <dd>{selected.size}</dd>
                  </div>
                  <div>
                    <dt>Position</dt>
                    <dd>
                      {positions[selected.id]
                        ? `#${positions[selected.id]}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>{selected.joined}</dd>
                  </div>
                  <div>
                    <dt>Est. wait</dt>
                    <dd>{selected.wait}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{STATUS_LABELS[selected.status]}</dd>
                  </div>
                </dl>

                {/* shows if a guest paid the bribe */}
                <div
                  className={`admin-queues-purchase${selected.paid > 0 ? " paid" : ""}`}
                >
                  <h3>Purchased priority</h3>
                  <p>
                    {selected.paid > 0 ? (
                      <>
                        Paid <strong>${selected.paid.toFixed(2)}</strong> to
                        advance
                      </>
                    ) : (
                      "None purchased"
                    )}
                  </p>
                </div>

                {selected.status === "waiting" && (
                  <button
                    type="button"
                    className="admin-queues-primary"
                    onClick={() => changeStatus(selected.id, "done")}
                  >
                    Mark Done
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default AdminQueuesPage;
