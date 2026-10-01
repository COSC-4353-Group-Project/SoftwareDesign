import './AdminServicesPage.css'

// Service management: staff create and edit the services guests can queue for.
// Right now this is just the layout, every box is empty and gets filled in later.
function AdminServicesPage() {
  return (
    <div className="services-page">
      <div className="services-header">
        <h1>Service Management</h1>
      </div>

      <div className="services-layout">
        {/* left column: one box per service (name, open/closed, description, duration, waiting count go here later) */}
        <section className="services-list">
          <div className="service-box"></div>
          <div className="service-box"></div>
          <div className="service-box"></div>
        </section>

        {/* right column: the create / edit service form goes in here later */}
        <aside className="services-form-box"></aside>
      </div>
    </div>
  )
}

export default AdminServicesPage
