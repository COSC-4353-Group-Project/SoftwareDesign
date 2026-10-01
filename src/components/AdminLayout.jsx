import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, ListOrdered, LogOut } from 'lucide-react'
import RoleSwitch from './RoleSwitch.jsx'
import './AppLayout.css' // same top bar look as the user side, so reuse those styles instead of copying them
import './AdminLayout.css' // only the admin-only extras (the "Staff" tag)

const APP_NAME = 'BribeQueue' // placeholder until prof says ok

// Fake data until login exist..
const MOCK_STAFF = { name: 'Justin Hendrix' }

// Shared frame for every staff page: same top bar as AppLayout, but with the admin links.
// kept as 2 dif layout files so if we fuck up one, it doesnt kill the other murder suicide style
export default function AdminLayout() {
  const navigate = useNavigate()

  // no real login yet, so signing out just goes back to the login page
  function handleSignOut() {
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-inner">
          {/* logo goes to the staff home instead of the user dashboard */}
          <Link to="/admin-board" className="top-bar-logo">
            <span className="top-bar-logo-icon"><ListOrdered size={16} /></span>
            {APP_NAME}
          </Link>

          {/* same NavLink trick as AppLayout: the open page gets the "active" class */}
          <nav className="top-bar-nav">
            <NavLink to="/admin-board" className="nav-link">Overview</NavLink>
            <NavLink to="/admin-services" className="nav-link">Services</NavLink>
            <NavLink to="/admin-queues" className="nav-link">Queues</NavLink>
          </nav>

          {/* pushed to the right edge */}
          <div className="top-bar-right">
            {/* demo switch, "staff" side is highlighted because admin side*/}
            <RoleSwitch current="staff" />

            <button type="button" className="icon-btn" title="Notifications">
              <Bell size={16} />
            </button>

            <div className="top-bar-user">
              <span className="avatar">{MOCK_STAFF.name[0].toUpperCase()}</span>
              <span className="top-bar-user-name">{MOCK_STAFF.name}</span>
              {/* small tag so it's obvious you're looking at the staff side */}
              <span className="staff-tag">Staff</span>
            </div>

            <button type="button" className="icon-btn" title="Sign out" onClick={handleSignOut}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* whichever admin route matches the URL renders here, when backend is actually real */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
