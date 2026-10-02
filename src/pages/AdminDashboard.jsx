import './AdminDashboard.css'

// Fake services until the backend exists. Same services as the Service Management page.
// More fields (waiting, guests, skip revenue) get added as the panel is built out.
const MOCK_SERVICES = [
    { id: 1, name: 'Dine-in · Party of 1–2', isOpen: true },
    { id: 2, name: 'Dine-in · Party of 3–6', isOpen: true },
    { id: 3, name: 'Bar Seating', isOpen: true },
    { id: 4, name: 'Patio', isOpen: false },
]

function AdminDashboard(){
    return(
    <div className="admin-page">
        <div className="admin-header">
            <div>
                <h1>Restaurant Overview :3</h1>
            </div>
            <div>
                <h4>1984 Nowhere Atlantis Suite, Middleof</h4>
            </div>
        </div>
        <div className="admin-new-service admin-general-box">
            New Service
        </div>

        <div className="admin-layout">
            <div className="admin-stats-container">
                <div className="admin-stats-box">
                    Active stats box :3
                </div>
                <div className="admin-stats-box">
                    Active stats box :3
                </div>
                <div className="admin-stats-box">
                    Active stats box :3
                </div>
                <div className="admin-stats-box">
                    Active stats box :3
                </div>
            </div>
            <div>
                <h1 className="admin-service-header">Services</h1>
                {/* one card per service, closed services get faded out a bit */}
                {MOCK_SERVICES.map((service) => (
                    <div
                        key={service.id}
                        className={service.isOpen ? 'admin-service-container' : 'admin-service-container closed'}
                    >
                        {/* name + open/closed pill on the same line */}
                        <div className="admin-service-top">
                            <p className="admin-service-name">{service.name}</p>
                            {service.isOpen ? (
                                <span className="admin-service-pill open">Open</span>
                            ) : (
                                <span className="admin-service-pill closed">Closed</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
    )
}

export default AdminDashboard