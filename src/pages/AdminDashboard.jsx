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

    // Anaya: replacing the hardcoded frontend info with server stuff (similar to how the user dashboard worked for making sure the info that's presented is from the server)
    const [adminDashItems, setadminDashItems] = useState([])
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        // JUSTIN: the stats are staff-only now, so send the login token (same as the admin queue page)
        fetch('/api/adminDash', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        .then((res) => res.json())
        .then((data => {
            // JUSTIN: if the login ran out the server sends { error: ... } instead of a list,
            // and .map() below would crash the page, so only keep it when it's a list
            if (Array.isArray(data)) {
                setadminDashItems(data)
            }
            setLoading(false)
        }))
        .catch((err) => {
            console.error('Failed to fetch admin items:', err)
            setLoading(false)
        })
    }, [])


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
                {loading ? (
                        <p>Loading admin statistics...</p>
                    ) : adminDashItems.length === 0 ? (
                        <p>No admin statistics to show.</p>
                    ) : (
                        adminDashItems.map((item) => {
                            const isSkip = item.isSkip // Anaya: it's a bit scuffed but it basically stylies a box based on whether or not it falls under the "skip" category of summaries (not live yet)
                            return ( // returns allow for the creation of variables (isSkip)
                            <div className={isSkip ? "admin-skip-box" : "admin-stats-box"} key = {item.id}>
                                <p className={isSkip ? "admin-skip-text" : "admin-stats-text"}>{item.name}</p>
                                <h2>{isSkip ? `$${item.statistic}` : item.statistic}</h2>
                                <p className={isSkip ? "admin-skip-text" : "admin-stats-text"}>{item.descript_stat}{item.description}</p>
                            </div>
                            )
                        })
                    )}
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