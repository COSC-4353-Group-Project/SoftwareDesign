import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import './NotificationBell.css'

// how often to ask the server for new notifications while the app is open
const CHECK_EVERY_MS = 15000
// how many show in the dropdown
const SHOW_COUNT = 8

// "Nov 6, 7:42 PM" from the createdAt the server sends
function formatWhen(createdAt) {
  return new Date(createdAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// JUSTIN: the bell in the top bar (used by AppLayout and AdminLayout).
// Red number = unread notifications. Click to open the newest ones,
// closing it marks them all read (so the unread ones stay highlighted while you look).
export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)

  // load once now, then again every CHECK_EVERY_MS so new ones show up without a refresh
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        if (res.ok) {
          setNotifications(await res.json())
        }
      } catch {
        // server is off: keep showing what we had
      }
    }
    loadNotifications()
    const timer = setInterval(loadNotifications, CHECK_EVERY_MS)
    // stop checking when the layout goes away (signing out, switching to the other layout)
    return () => clearInterval(timer)
  }, [])

  const unreadCount = notifications.filter((notif) => !notif.isRead).length

  async function closeDropdown() {
    setOpen(false)
    if (unreadCount === 0) {
      return
    }
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (res.ok) {
        setNotifications(await res.json())
      }
    } catch {
      // server is off: they'll still be unread next time, no big deal
    }
  }

  function handleBellClick() {
    if (open) {
      closeDropdown()
    } else {
      setOpen(true)
    }
  }

  return (
    <div className="notif-bell">
      <button
        type="button"
        className="icon-btn"
        title="Notifications"
        aria-expanded={open}
        onClick={handleBellClick}
      >
        <Bell size={16} />
        {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
      </button>

      {open && (
        <>
          {/* invisible layer over the whole page, clicking anywhere outside the dropdown closes it */}
          <div className="notif-backdrop" onClick={closeDropdown} />

          <div className="notif-dropdown">
            <h4 className="notif-dropdown-title">Notifications</h4>

            {notifications.length === 0 ? (
              <p className="notif-empty">No notifications yet.</p>
            ) : (
              <ul className="notif-list">
                {notifications.slice(0, SHOW_COUNT).map((notif) => (
                  <li
                    key={notif.id}
                    className={notif.isRead ? `notif-item ${notif.type}` : `notif-item ${notif.type} unread`}
                  >
                    <p className="notif-title">{notif.title}</p>
                    <p className="notif-body">{notif.body}</p>
                    <p className="notif-when">{formatWhen(notif.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
