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

function getLocalTodayDateString() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function validateReportDateRange(startDate, endDate, todayStr) {
    if (!startDate && !endDate) {
        return 'Please select at least one date (start date or end date) before creating a report.'
    }
    if (endDate && endDate > todayStr) {
        return 'End date cannot be after the current date. Please select a different end date.'
    }
    if (startDate && startDate > todayStr) {
        return 'Start date cannot be after the current date. Please select a different start date.'
    }
    if (startDate && endDate && startDate > endDate) {
        return 'Start date cannot be after end date (and end date cannot be before start date). Please choose different dates.'
    }
    return ''
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

    // On-demand report state and handlers
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [report, setReport] = useState(null)
    const [reportLoading, setReportLoading] = useState(false)
    const [reportError, setReportError] = useState('')
    const todayStr = getLocalTodayDateString()

    async function handleCreateReport(e) {
        e.preventDefault()

        const validationMessage = validateReportDateRange(startDate, endDate, todayStr)
        if (validationMessage) {
            setReportError(validationMessage)
            return
        }

        setReportLoading(true)
        setReportError('')

        try {
            const params = new URLSearchParams()
            if (startDate) params.set('startDate', startDate)
            if (endDate) params.set('endDate', endDate)

            const query = params.toString()
            const url = query ? `/api/adminDash/report?${query}` : '/api/adminDash/report'

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            })
            const data = await res.json()

            if (!res.ok) {
                setReportError(data.error || 'Could not generate report.')
                return
            }

            setReport(data)
        } catch {
            setReportError('Could not reach the server.')
        } finally {
            setReportLoading(false)
        }
    }

    function handleExportCsv() {
        if (!report) return

        const headers = [
            'Service',
            'Total Parties',
            'Served',
            'Cancelled',
            'Avg Wait (min)',
            'Bribe Revenue ($)',
        ]

        const rows = report.byService.map((row) => [
            `"${String(row.serviceName).replaceAll('"', '""')}"`,
            row.totalParties,
            row.servedCount,
            row.cancelledCount,
            row.avgWaitMinutes ?? '',
            Number(row.bribeRevenue ?? 0).toFixed(2),
        ])

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `bribesmart-report-${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    async function handleExportPdf() {
        if (!report) return

        try {
            const params = new URLSearchParams()
            if (startDate) params.set('startDate', startDate)
            if (endDate) params.set('endDate', endDate)

            const query = params.toString()
            const url = query ? `/api/adminDash/report/pdf?${query}` : '/api/adminDash/report/pdf'

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            })

            if (!res.ok) {
                setReportError('Could not download PDF report.')
                return
            }

            const blob = await res.blob()
            const downloadUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = `bribesmart-report-${new Date().toISOString().slice(0, 10)}.pdf`
            link.click()
            URL.revokeObjectURL(downloadUrl)
        } catch {
            setReportError('Could not reach the server to download PDF.')
        }
    }

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

            <section className="admin-report-card">
                <div className="admin-report-header">
                    <div>
                        <h2 className="admin-report-title">Reports</h2>
                        <h4>Select an end date to receive a report from beginning to selected date</h4>
                    </div>
                </div>

                <form className="admin-report-controls" onSubmit={handleCreateReport}>
                    <label className="admin-report-field">
                        <span>Start date</span>
                        <input
                            type="date"
                            max={todayStr}
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value)
                                if (reportError) setReportError('')
                            }}
                        />
                    </label>

                    <label className="admin-report-field">
                        <span>End date</span>
                        <input
                            type="date"
                            max={todayStr}
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value)
                                if (reportError) setReportError('')
                            }}
                        />
                    </label>

                    <div className="admin-report-actions">
                        <button
                            type="submit"
                            className="admin-service-button primary"
                            disabled={reportLoading}
                        >
                            {reportLoading ? 'Generating...' : 'Create Report'}
                        </button>

                        {report && (
                            <>
                                <button
                                    type="button"
                                    className="admin-service-button outline"
                                    onClick={handleExportCsv}
                                >
                                    Export CSV
                                </button>

                                <button
                                    type="button"
                                    className="admin-service-button outline"
                                    onClick={handleExportPdf}
                                >
                                    Export PDF
                                </button>
                            </>
                        )}
                    </div>
                </form>

                {reportError && <p className="admin-report-error">{reportError}</p>}

                {report && (
                    <div className="admin-report-results">
                        <div className="admin-report-summary-grid">
                            <div className="admin-report-metric">
                                <span>Total Parties</span>
                                <strong>{report.summary.totalParties}</strong>
                            </div>
                            <div className="admin-report-metric">
                                <span>Served</span>
                                <strong>{report.summary.servedCount}</strong>
                            </div>
                            <div className="admin-report-metric">
                                <span>Cancelled</span>
                                <strong>{report.summary.cancelledCount}</strong>
                            </div>
                            <div className="admin-report-metric">
                                <span>Avg Wait</span>
                                <strong>
                                    {report.summary.avgWaitMinutes != null
                                        ? formatMinutes(report.summary.avgWaitMinutes)
                                        : 'N/A'}
                                </strong>
                            </div>
                            <div className="admin-report-metric">
                                <span>Skip Revenue</span>
                                <strong>${Number(report.summary.totalBribeRevenue ?? 0).toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="admin-report-table-wrap">
                            <table className="admin-report-table">
                                <thead>
                                    <tr>
                                        <th>Service</th>
                                        <th>Parties</th>
                                        <th>Served</th>
                                        <th>Cancelled</th>
                                        <th>Avg Wait</th>
                                        <th>Skip Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.byService.map((row) => (
                                        <tr key={row.serviceId}>
                                            <td>{row.serviceName}</td>
                                            <td>{row.totalParties}</td>
                                            <td>{row.servedCount}</td>
                                            <td>{row.cancelledCount}</td>
                                            <td>
                                                {row.avgWaitMinutes != null
                                                    ? formatMinutes(row.avgWaitMinutes)
                                                    : '—'}
                                            </td>
                                            <td>${Number(row.bribeRevenue ?? 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

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