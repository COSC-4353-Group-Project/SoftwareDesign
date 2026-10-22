import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ListOrdered, Pencil, Power, Users, Zap } from 'lucide-react'
import './AdminDashboard.css'

// JUSTIN BACKEND STOOF: MOCK_SERVICES is gone, the services come from GET /api/services now.
// The server doesn't send waiting / guests / skipRevenue / skippersWaiting yet, so those show 0

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
    const [services, setServices] = useState([])

    // JUSTIN BACKEND STOOF: load the services from the server once, when the page opens
    useEffect(() => {
        async function loadServices() {
            const res = await fetch('/api/services')
            if (res.ok) {
                setServices(await res.json())
            }
        }
        loadServices()
    }, [])

    /* ===== Funny little button work ===== */
    // JUSTIN BACKEND STOOF: Open/Close saves to the server (PUT /api/services/:id, staff only),
    // so guests actually see the service open or close. The server sends back the saved service.
    async function toggleOpen(service) {
        const res = await fetch(`/api/services/${service.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                name: service.name,
                description: service.description,
                duration: service.duration,
                priority: service.priority,
                isOpen: !service.isOpen,
            }),
        })
        if (res.ok) {
            const saved = await res.json()
            // swap in the saved version, leave the rest alone
            setServices(services.map((s) => (s.id === saved.id ? saved : s)))
        }
    }
    /* ===== end Funny little button work ===== */

    // JUSTIN BACKEND STOOF: "Open Services" box worked out from the real list
    const openCount = services.filter((service) => service.isOpen).length

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
                    {/* JUSTIN BACKEND STOOF: real count. The other 3 boxes are still typed in, waiting on Anaya's endpoint */}
                    <h2>{openCount} of {services.length}</h2>
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
                                {/* JUSTIN BACKEND STOOF: ?? 0 because the server doesn't send these counts yet */}
                                <span className="admin-service-stat">
                                    <Users size={14} /> {service.waiting ?? 0} {service.waiting === 1 ? 'party' : 'parties'} waiting ({service.guests ?? 0} guests)
                                </span>
                                {/* a new guest joins behind everyone, so their wait is (waiting + 1) × minutes per party */}
                                <span className="admin-service-stat">
                                    <Clock size={14} />
                                    {service.isOpen
                                        ? ` ~${formatMinutes(((service.waiting ?? 0) + 1) * service.duration)} for new guests`
                                        : ' Not taking new guests'}
                                </span>
                            </div>

                            {/* orange skip revenue line, only shows up if someone paid to skip in this service today (when backend works) */}
                            {service.skipRevenue > 0 && (
                                <p className="admin-service-skip">
                                    <Zap size={14} /> ${service.skipRevenue} skip revenue today
                                    {service.skippersWaiting > 0 &&
                                        ` · ${service.skippersWaiting} paid skipper${service.skippersWaiting === 1 ? '' : 's'} in line`}
                                </p>
                            )}
                        </div>

                        {/* ===== Funny little button work ===== */}
                        <div className="admin-service-buttons">
                            {/* filled purple "Open" when closed so it stands out, outlined "Close" when open */}
                            <button
                                type="button"
                                className={service.isOpen ? 'admin-service-button outline' : 'admin-service-button primary'}
                                onClick={() => toggleOpen(service)}
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