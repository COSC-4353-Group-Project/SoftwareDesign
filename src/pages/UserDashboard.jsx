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
            <div>+Live wait times+</div>
        </div>
    )
}

export default UserDashboard