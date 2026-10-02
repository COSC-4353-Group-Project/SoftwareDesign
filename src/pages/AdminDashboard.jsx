import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ListOrdered, Pencil, Power, Users } from 'lucide-react'
import './AdminDashboard.css'

// legit just copied from the admin service page.
const MOCK_SERVICES = [
    { id: 1, name: 'Dine-in · Party of 1–2', description: 'Standard table seating for dates.', duration: 6, waiting: 9, guests: 16, isOpen: true },
    { id: 2, name: 'Dine-in · Party of 3–6', description: 'Larger tables and booths. Longer Wait-Time.', duration: 9, waiting: 14, guests: 56, isOpen: true },
    { id: 3, name: 'Bar Seating', description: 'First-come bar stools. Bartender Service', duration: 4, waiting: 5, guests: 8, isOpen: true },
    { id: 4, name: 'Patio', description: 'Outdoor tables. Closed when it rains.', duration: 5, waiting: 0, guests: 0, isOpen: false },
]

// Turns minutes into human(XD) text: 0 to "Now", 45 to "45 min", 135 to "2 hr 15 min".
// Same helper as QueueStatusPage, copied so i dont have to write more code.
function formatMinutes(min) {
    if (min <= 0) return 'Now'
    if (min < 60) return `${Math.round(min)} min`
    const h = Math.floor(min / 60)
    const m = Math.round(min % 60)
    return m ? `${h} hr ${m} min` : `${h} hr`
}

function AdminDashboard(){
    // services live in state so the Open/Close button can change them
    const [services, setServices] = useState(MOCK_SERVICES)

    /* ===== Funny little button work ===== */
    // Open/Close button: flips isOpen on the one service that was clicked, leaves the rest alone
    function toggleOpen(id) {
        setServices(services.map((service) =>
            service.id === id ? { ...service, isOpen: !service.isOpen } : service
        ))
    }
    /* ===== end Funny little button work ===== */

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
                    <p className="admin-stats-text">Parties Waiting</p>
                    <h2>28</h2>
                    <p className="admin-stats-text">79 guests total</p>
                </div>
                <div className="admin-stats-box">
                    <p className="admin-stats-text">Open Services</p>
                    <h2>3 of 4</h2>
                    <p className="admin-stats-text">Accepting new guests</p>
                </div>
                <div className="admin-stats-box">
                    <p className="admin-stats-text">Seated today</p>
                    <h2>67</h2>
                    <p className="admin-stats-text">Across All Services</p>
                </div>
                <div className="admin-skip-box">
                    <p className="admin-skip-text">Skip Revenue Today</p>
                    <h2>$69</h2>
                    <p className="admin-skip-text">7 guests paid to skip</p>
                </div>
            </div>
            <div>
                <h1 className="admin-service-header">Services</h1>
                {/* one card per service, closed services get faded out a bit */}
                {services.map((service) => (
                    <div
                        key={service.id}
                        className={service.isOpen ? 'admin-service-container' : 'admin-service-container closed'}
                    >
                        {/* left side of the card, buttons are on the right */}
                        <div className="admin-service-info">
                            {/* name + open/closed pill on the same line */}
                            <div className="admin-service-top">
                                <p className="admin-service-name">{service.name}</p>
                                {service.isOpen ? (
                                    <span className="admin-service-pill open">Open</span>
                                ) : (
                                    <span className="admin-service-pill closed">Closed</span>
                                )}
                            </div>

                            <p className="admin-service-desc">{service.description}</p>

                            <div className="admin-service-stats">
                                <span className="admin-service-stat">
                                    <Users size={14} /> {service.waiting} {service.waiting === 1 ? 'party' : 'parties'} waiting ({service.guests} guests)
                                </span>
                                {/* a new guest joins behind everyone, so their wait is (waiting + 1) × minutes per party */}
                                <span className="admin-service-stat">
                                    <Clock size={14} />
                                    {service.isOpen
                                        ? ` ~${formatMinutes((service.waiting + 1) * service.duration)} for new guests`
                                        : ' Not taking new guests'}
                                </span>
                            </div>
                        </div>

                        {/* ===== Funny little button work ===== */}
                        <div className="admin-service-buttons">
                            {/* filled purple "Open" when closed so it stands out, outlined "Close" when open */}
                            <button
                                type="button"
                                className={service.isOpen ? 'admin-service-button outline' : 'admin-service-button primary'}
                                onClick={() => toggleOpen(service.id)}
                            >
                                <Power size={14} /> {service.isOpen ? 'Close' : 'Open'}
                            </button>
                            {/* Link instead of button because these go to another page */}
                            <Link to="/admin-queues" className="admin-service-button outline">
                                <ListOrdered size={14} /> Queue
                            </Link>
                            <Link to="/admin-services" className="admin-service-button ghost">
                                <Pencil size={14} /> Edit
                            </Link>
                        </div>
                        {/* ===== end Funny little button work ===== */}
                    </div>
                ))}
            </div>
        </div>
    </div>
    )
}

export default AdminDashboard