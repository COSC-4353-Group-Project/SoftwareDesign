import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, ListOrdered, LogOut } from 'lucide-react'
import './AppLayout.css'

const APP_NAME = 'BribeQueue' // placeholder until prof says ok

// Fake data until login exist
const MOCK_USER = { name: 'Justin Hendrix' }
const MOCK_HAS_QUEUE_SPOT = true // if false, my queue doesnt

// Shared frame for every signed-in page: top bar + the current page below it.
export default function AppLayout() {
  const navigate = useNavigate()

  // no real login yet, so signing out just goes back to the login page
  function handleSignOut() {
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-inner">
          <Link to="/dashboard" className="top-bar-logo">
            <span className="top-bar-logo-icon"><ListOrdered size={16} aria-hidden /></span>
            {APP_NAME}
          </Link>

          {/* NavLink adds the "active" class by itself when its page is open,also defined in the .css */}
          <nav className="top-bar-nav" aria-label="Main">
            <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
            {/* orange = only shown when the user actually has a spot in line */}
            {MOCK_HAS_QUEUE_SPOT && (
              <NavLink to="/status" className="nav-link nav-link-queue">My Queue</NavLink>
            )}
            <NavLink to="/history" className="nav-link">History</NavLink>
          </nav>

          {/* pushed to the right edge */}
          <div className="top-bar-right">
            <button type="button" className="icon-btn" /*aria-label="Notifications"*/ title="Notifications">
              <Bell size={16} aria-hidden />
            </button>

            <div className="top-bar-user">
              <span className="avatar" aria-hidden>{MOCK_USER.name[0].toUpperCase()}</span>
              <span className="top-bar-user-name">{MOCK_USER.name}</span>
            </div>

            <button type="button" className="icon-btn" aria-label="Sign out" title="Sign out" onClick={handleSignOut}>
              <LogOut size={16} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* whichever child route matches the URL renders here */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
