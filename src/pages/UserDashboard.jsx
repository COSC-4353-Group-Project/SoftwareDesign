import './UserDashboard.css'

// layout shenanigans

function UserDashboard(){
    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <div className="dashboard-box-hello dashboard-hi"> {/** greets the user w address */}
                        <h1>Hi, user!</h1> {/**this'll have to be replaced with the actual person's name */}
                    </div>
                    <div className="dashboard-box-hello dashboard-address">
                        <h4>1984 Nowhere Atlantis Suite, Middleof</h4>
                    </div>
                </div>
            </div>
            <div className="dashboard-table-header"> {/** next header for "get a table" section */}
                <div>
                    <h3>~Get a table~</h3>
                </div>
            </div>

            <div className="dashboard-layout"> {/** these should be just regular boxes for now */}
                <div className="dashboard-general-box dashboard-waitlist">
                    --Join waitlist--
                </div>
                <div className="dashboard-general-box dashboard-reservation">
                    --Reserve a future table--
                </div>
            </div>
        
            <p></p>

            <div className="dashboard-layout-content">
                <div className="dashboard-main">
                    <div className="dashboard-general-box dashboard-wait-title">
                        <h4>+Live wait times+</h4>
                    </div>
                    <div className="dashboard-general-box dashboard-waittimes">
                        --Box example--
                    </div>
                </div>
                <aside className="dashboard-sidebar">
                    <p></p>
                    <p></p>
                    <div className="dashboard-notif-box dashboard-notif-title">
                        <h4>?Recent Notifications?</h4>
                    </div>
                    <div className="dashboard-general-box dashboard-notifs">
                        --Box example--
                    </div>
                </aside>
            </div>


        </div>
    )
}

export default UserDashboard