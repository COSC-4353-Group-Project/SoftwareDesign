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
                <h1>Services</h1>
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