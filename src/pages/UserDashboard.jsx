import './UserDashboard.css'

// layout shenanigans

function UserDashboard(){
    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <div className="dashboard-box-hello"> {/** greets the user w address */}
                        <h1>Hi, user!</h1> {/**this'll have to be replaced with the actual person's name */}
                        <h4>1984 Nowhere Atlantis Suite, Middleof</h4>
                        </div>
                </div>
            </div>
            <div className="dashboard-table-header"> {/** next header for "get a table" section */}
                <h2>~Get a table~</h2>
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
                <div className="dashboard-main-content">
                    <div className="dashboard-general-box dashboard-wait-title">
                        <h2>+Live wait times+</h2>
                    </div>
                    <div className="dashboard-general-box dashboard-waittimes">
                        --Box example--
                    </div>
                    {/* <div className="dashboard-general-box dashboard-waitlist">--box--</div> */}
                </div>
                <aside className="dashboard-sidebar">
                    <div className="dashboard-notif-box dashboard-notif-title">
                        <h2>?Recent Notifications?</h2>
                    </div>
                    <p></p>
                    <div className="dashboard-general-box dashboard-notifs">
                        --Box example--
                    </div>
                </aside>
            </div>


        </div>
    )
}

export default UserDashboard