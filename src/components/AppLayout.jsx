import { Outlet } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import './AppLayout.css'

// Shared frame for every signed-in page: top bar + the current page below it.
// Layout skeleton only. Each .bar-box is a placeholder to be filled in later.
export default function AppLayout() {
  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-inner">
          <div className="bar-box bar-box-logo">Logo</div>

          <nav className="top-bar-nav">
            <div className="bar-box bar-box-link">Dashboard</div>
            {/* orange = only shown when the user actually has a spot in line */}
            <div className="bar-box bar-box-link bar-box-queue">My Queue</div>
            <div className="bar-box bar-box-link">History</div>
          </nav>

          {/* pushed to the right edge */}
          <div className="top-bar-right">
            <div className="bar-box bar-box-icon"><Bell size={16} aria-hidden /></div>
            <div className="bar-box bar-box-user">User</div>
            <div className="bar-box bar-box-icon"><LogOut size={16} aria-hidden /></div>
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
