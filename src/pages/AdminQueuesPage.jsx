import "./AdminQueuesPage.css";

function AdminQueuesPage() {
  return (
    <div className="admin-queues-page">
      {/* placeholder, will change queues and statuses to filters */}
      <div className="admin-queues-header">
        <div>
          <h1>Guest Queue</h1>
          <p>Manage waiting parties and seating</p>
        </div>

        <div className="admin-queues-filters">
          <div className="admin-queues-filter">Search guest name</div>
          <div className="admin-queues-filter">All queues</div>
          <div className="admin-queues-filter">All statuses</div>
        </div>
      </div>

      {/* summary cards at top*/}
      <div className="admin-queues-summaries">
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