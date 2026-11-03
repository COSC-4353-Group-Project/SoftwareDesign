import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ListOrdered, LogOut } from 'lucide-react'
import RoleSwitch from './RoleSwitch.jsx'
import './AppLayout.css'

const APP_NAME = 'BribeQueue' // placeholder until prof says ok

// Shared frame for every signed-in page: top bar + the current page below it.
export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  // the logged-in user from the server, null if not logged in (or not loaded yet)
  const [user, setUser] = useState(null)
  // JUSTIN BACKEND STOOF: true when the user has a spot in line, decides if "My Queue" shows
  const [inQueue, setInQueue] = useState(false)

  // JUSTIN BACKEND STOOF: ask the server if I'm in a queue (GET /api/queues/me, 404 = not in one).
  // Runs again on every page change, so the tab shows up right after joining
  // and goes away right after leaving.
  useEffect(() => {
    async function checkQueue() {
      try {
        const res = await fetch('/api/queues/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        setInQueue(res.ok)
      } catch {
        setInQueue(false) // server is off: hide the tab
      }
    }
    checkQueue()
  }, [location.pathname])

  // Ask the server who is logged in, for the name in the top bar and
  // to decide if the "Staff" switch shows (staff only).
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        if (res.ok) {
          setUser(await res.json())
        }
      } catch {
        // server is off: leave user as null, the page still shows
      }
    }
    loadUser()
  }, [])

  // tell the server to delete the session, then forget the token so the next visit has to log in again
  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
    } catch {
      // server unreachable, still sign out on this side
    }
    localStorage.removeItem('token')
    navigate('/login')
  }

  // shown until the server answers, or if nobody is logged in
  let name = 'Guest'
  let isStaff = false
  if (user) {
    name = user.name
    isStaff = user.role === 'admin'
  }

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-inner">
          <Link to="/dashboard" className="top-bar-logo">
            <span className="top-bar-logo-icon"><ListOrdered size={16} /></span>
            {APP_NAME}
          </Link>

          {/* NavLink adds the "active" class by itself when its page is open,also defined in the .css */}
          <nav className="top-bar-nav">
            <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
            {/* orange = only shown when the user actually has a spot in line */}
            {inQueue && (
              <NavLink to="/status" className="nav-link nav-link-queue">My Queue</NavLink>
            )}
            <NavLink to="/history" className="nav-link">History</NavLink>
          </nav>

          {/* pushed to the right edge */}
          <div className="top-bar-right">
            {/* "user" side is highlighted because we're in the user layout. Staff half only for staff. */}
            <RoleSwitch current="user" showStaff={isStaff} />

            <button type="button" className="icon-btn" title="Notifications">
              <Bell size={16} />
            </button>

            <div className="top-bar-user">
              <span className="avatar">{name[0].toUpperCase()}</span>
              <span className="top-bar-user-name">{name}</span>
            </div>

            <button type="button" className="icon-btn" title="Sign out" onClick={handleSignOut}>
              <LogOut size={16} />
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
