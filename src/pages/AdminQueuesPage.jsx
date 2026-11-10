import "./AdminQueuesPage.css";
import { useEffect, useState } from "react";
import { Bell, Zap } from "lucide-react"; // icons for the pill tags

const QUEUES = [
  { id: "small", label: "Dine-in · Party of 1–2" },
  { id: "large", label: "Dine-in ·  Party of 3–6" },
  { id: "bar", label: "Bar Seating" },
  { id: "patio", label: "Patio" },
];

// mapping backend service IDs to frontend queue IDs
const SERVICE_QUEUES = {
  1: "small",
  2: "large",
  3: "bar",
  4: "patio",
};

// JUSTIN (A4+): how often to reload the queues, so new joins, skips and leaves show up
// without the admin refreshing the page
const REFRESH_EVERY_MS = 5000;

const STATUS_LABELS = {
  waiting: "Waiting",
  done: "Done",
  cancelled: "Cancelled",
};

const EMPTY_DATA = {
  parties: [],
  order: {
    small: [],
    large: [],
    bar: [],
    patio: [],
  },
};

// convert backend queue entry to same format as AdminQueuesPage
function formatQueueEntry(entry) {
  return {
    id: String(entry.id),
    name: entry.guestName,
    size: entry.partySize,
    queue: SERVICE_QUEUES[entry.serviceId],
    joined: new Date(entry.joinedAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    wait: `${entry.estimatedWaitMinutes}m`,
    status: entry.status === "served" ? "done" : entry.status,
    paid: (entry.skips ?? []).reduce((total, skip) => total + skip.price, 0),
    passedBy: entry.passedBy ?? 0, // JUSTIN: real count from the passed_by notifications now
    position: entry.position,
  };
}

function AdminQueuesPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Calculate summary cards from the actual backend queue.
  const waitingParties = data.parties.filter(
    (party) => party.status === "waiting",
  );

  const countQueue = (...queueIds) =>
    waitingParties.filter((party) => queueIds.includes(party.queue)).length;

  const averageWait = waitingParties.length
    ? Math.round(
        waitingParties.reduce(
          (total, party) => total + parseInt(party.wait, 10),
          0,
        ) / waitingParties.length,
      )
    : 0;

  const SUMMARIES = [
    {
      label: "Dine-in",
      value: countQueue("small", "large"),
      hint: "parties waiting",
    },
    {
      label: "Bar Seating",
      value: countQueue("bar"),
      hint: "parties waiting",
    },
    {
      label: "Patio",
      value: countQueue("patio"),
      hint: "parties waiting",
    },
    {
      label: "Average estimated wait",
      value: `${averageWait}m`,
      hint: "across active parties",
    },
  ];

  // get current queue entries from the backend
  async function fetchQueues() {
    const response = await fetch("/api/queues/admin/all", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to retrieve queues.");
    }

    const parties = result
      .filter((entry) => SERVICE_QUEUES[entry.serviceId])
      .map(formatQueueEntry);

    // make frontend order
    const order = Object.fromEntries(
      QUEUES.map((queue) => [
        queue.id,
        parties
          .filter(
            (party) => party.queue === queue.id && party.status === "waiting",
          )
          .sort((a, b) => a.position - b.position)
          .map((party) => party.id),
      ]),
    );

    setData({ parties, order });
  }

  useEffect(() => {
    fetchQueues()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // JUSTIN (A4+): then reload every REFRESH_EVERY_MS. Search, filters and the selected
    // party are their own state, so they stay put when the list reloads.
    const timer = setInterval(() => {
      // tab is in the background: skip it, the next check after they come back catches up
      if (document.hidden) {
        return;
      }
      fetchQueues().catch(() => {
        // a missed reload isn't worth an error message, keep showing the last list
      });
    }, REFRESH_EVERY_MS);

    // stop reloading when the admin leaves this page
    return () => clearInterval(timer);
  }, []);

  // Queue filters work now, pretty much all states
  // "all" means that filter is off
  const [queueFilter, setQueueFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // End queue filters

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

  // search by name, then check the queue and status filters
  function matches(party) {
    const nameMatches = party.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    //  Queue filters
    const queueMatches = queueFilter === "all" || party.queue === queueFilter;
    const statusMatches =
      statusFilter === "all" || party.status === statusFilter;
    //  End queue filters

    return nameMatches && queueMatches && statusMatches;
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

  // puts the already marked done queue to the bottom of the table
  async function changeStatus(id) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/queues/admin/${id}/serve`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to serve party.");
      }

      await fetchQueues();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // moving queue up and down
  // this only works when it's the same seating preference, doesn't really make sense to bump if one is asking for patio and the other for table inside
  async function moveParty(id, direction) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/queues/admin/${id}/move`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ direction }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to reorder queue.");
      }

      await fetchQueues();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // popup confirmation when you try to cancel a queue
  async function cancelParty(party) {
    if (busy) return;

    const confirmed = window.confirm(
      `Cancel this entry?\n${party.name} will be removed from the active queue. This can't be undone.`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/queues/admin/${party.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to cancel party.");
      }

      await fetchQueues();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // serving next, targets top row
  async function serveNext() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/queues/admin/serve-next", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to serve next party.");
      }

      setSelectedId(String(result.id));
      await fetchQueues();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function createRow(party, completed = false) {
    const index = activeOrders[party.queue].indexOf(party.id);
    const queueLength = activeOrders[party.queue].length;

    return (
      <tr
        key={party.id}
        className={[
          selectedId === party.id ? "selected" : "",
          completed ? "completed" : "",
          !completed && party.paid > 0 ? "paid" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setSelectedId(party.id)}
      >
        <td>{completed ? "—" : `#${positions[party.id]}`}</td>
        <td>
          {/* ===== Guest cell: name, pill tags, and a small info line ===== */}
          <div className="admin-queues-name-row">
            <button
              type="button"
              className="admin-queues-guest"
              onClick={() => setSelectedId(party.id)}
              aria-label={`View details for ${party.name}`}
              aria-pressed={selectedId === party.id}
            >
              {party.name}
            </button>

            {/* replaces the old Paid priority column */}
            {party.paid > 0 && (
              <span className="admin-queues-pill paid">
                <Zap size={12} /> Paid ${party.paid.toFixed(2)}
              </span>
            )}

            {party.passedBy > 0 && (
              <span
                className="admin-queues-pill"
                title="This guest got an in-app notice each time a paid skipper moved ahead of them"
              >
                <Bell size={12} /> Passed by {party.passedBy} skipper
                {party.passedBy === 1 ? "" : "s"} · notified
              </span>
            )}
          </div>

          {/* replaces the old Party size, Joined, and Est. wait columns, way more condensed. */}
          <p className="admin-queues-meta">
            Party of {party.size} · joined {party.joined} · est. wait{" "}
            {party.wait}
          </p>
          {/* End guest cell  */}
        </td>
        <td>{QUEUES.find((queue) => queue.id === party.queue).label}</td>
        <td>
          {/* status pill, color comes from the status class, should inherit. */}
          <span className={`admin-queues-pill ${party.status}`}>
            {STATUS_LABELS[party.status]}
          </span>
        </td>
        <td onClick={(event) => event.stopPropagation()}>
          {!completed && (
            <div className="admin-queues-actions">
              <button
                type="button"
                className="admin-queues-arrow"
                aria-label={`Move ${party.name} up`}
                disabled={busy || index <= 0}
                onClick={() => moveParty(party.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-queues-arrow"
                aria-label={`Move ${party.name} down`}
                disabled={busy || index >= queueLength - 1}
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

  return (
    <div className="admin-queues-page">
      {/* page title, search, and queue/status filters */}
      {loading && <p role="status">Loading queues...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="admin-queues-header">
        <div>
          <p className="admin-queues-brand">BribeSmart</p>
          <h1>Guest Queue</h1>
          <p className="admin-queues-subtitle">
            Manage waiting parties and seating
          </p>
        </div>

        <div className="admin-queues-filters">
          <input
            type="search"
            aria-label="Search guest name"
            placeholder="Search guest name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {/* ===== Queue filters ===== */}
          <select
            aria-label="Filter by queue"
            value={queueFilter}
            onChange={(event) => setQueueFilter(event.target.value)}
          >
            <option value="all">All queues</option>
            {QUEUES.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="waiting">Waiting</option>
            <option value="cancelled">Cancelled</option>
            <option value="done">Done</option>
          </select>
          {/*  End queue filters  */}
        </div>
      </div>

      {/* summary cards at top*/}
      <div className="admin-queues-summaries">
        {SUMMARIES.map((summary) => (
          <section className="admin-queues-summary" key={summary.label}>
            <h2>{summary.label}</h2>
            <strong>{summary.value}</strong>
            <p>{summary.hint}</p>
          </section>
        ))}
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
              disabled={
                busy ||
                !data.parties.some((party) => party.status === "waiting")
              }
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
                  <th scope="col">Guest</th>
                  <th scope="col">Seating Preference</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((party) => createRow(party))}
                {completedRows.map((party) => createRow(party, true))}

                {/* message when the filters hide every party, needed with filters or its just empty */}
                {activeRows.length === 0 && completedRows.length === 0 && (
                  <tr>
                    <td colSpan="5" className="admin-queues-empty">
                      No parties match these filters.
                    </td>
                  </tr>
                )}
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
                  <div>
                    <dt>Passed by</dt>
                    <dd>
                      {selected.passedBy > 0
                        ? `${selected.passedBy} paid skipper${selected.passedBy === 1 ? "" : "s"}`
                        : "—"}
                    </dd>
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
                    onClick={() => changeStatus(selected.id)}
                    disabled={busy}
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
