import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ListOrdered, LogOut } from 'lucide-react'
import RoleSwitch from './RoleSwitch.jsx'
import NotificationBell from './NotificationBell.jsx'
import './AppLayout.css' // same top bar look as the user side, so reuse those styles instead of copying them
import './AdminLayout.css' // only the admin-only extras (the "Staff" tag)

const APP_NAME = 'BribeQueue' // placeholder until prof says ok

// Shared frame for every staff page: same top bar as AppLayout, but with the admin links.
// kept as 2 dif layout files so if we fuck up one, it doesnt kill the other murder suicide style
export default function AdminLayout() {
  const navigate = useNavigate()
  // the logged-in staff member, null until the server answers
  const [staff, setStaff] = useState(null)

  // Every admin page goes through this layout, so this one check guards all of them.
  // Ask the server who is logged in (GET /api/auth/me with the token from the login page):
  //   not logged in -> login page, logged in but not staff -> user dashboard.
  // The real protection is still on the server (requireAdmin), this just keeps users off the pages.
  useEffect(() => {
    async function checkStaff() {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        if (!res.ok) {
          navigate('/login')
          return
        }
        const user = await res.json()
        if (user.role !== 'admin') {
          navigate('/dashboard')
          return
        }
        setStaff(user)
      } catch {
        navigate('/login') // server is off, nothing to show
      }
    }
    checkStaff()
  }, [navigate])

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

  // still checking: show nothing instead of flashing the admin page at a non-admin
  if (!staff) {
    return null
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
            <RoleSwitch current="staff" showStaff={true} />

            {/* staff only get notifications if they're in a line themselves, same bell as the user side */}
            <NotificationBell />

            <div className="top-bar-user">
              <span className="avatar">{staff.name[0].toUpperCase()}</span>
              <span className="top-bar-user-name">{staff.name}</span>
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
