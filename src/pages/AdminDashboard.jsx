import './AdminDashboard.css'

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
                    <p className="admin-stats-text">Parties Waiting</p>
                    <h2>28</h2>
                    <p className="admin-stats-text">79 guests total</p>
                </div>
                <div className="admin-stats-box">
                    <p className="admin-stats-text">Open Services</p>
                    <h2>3 of 3</h2>
                    <p className="admin-stats-text">Accepting new guests</p>
                </div>
                <div className="admin-stats-box">
                    <p className="admin-stats-text">Seated today</p>
                    <h2>6</h2>
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
                <div className="admin-service-container">
                    Service ex c:
                </div>
                <div className="admin-service-container">
                    Service ex c:
                </div>
                <div className="admin-service-container">
                    Service ex c:
                </div>
            </div>
        </div>
    </div>
    )
}

export default AdminDashboard