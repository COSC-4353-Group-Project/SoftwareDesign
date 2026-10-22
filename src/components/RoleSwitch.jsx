import { Link } from 'react-router-dom'
import { Store, UserRound } from 'lucide-react'
import './RoleSwitch.css'

// These are plain links , switching views is really just going to another page nothing fancy
// showStaff: only staff get the "Staff" half. Regular users just see the "User" side.
export default function RoleSwitch({ current, showStaff }) {

  // pick the class for each half: the side we're on gets "active"
  let userClass = 'role-switch-option'
  let staffClass = 'role-switch-option'
  if (current === 'staff') {
    staffClass += ' active'
  } else {
    userClass += ' active'
  }

  return (
    <div className="role-switch" title="Demo: switch between user and staff views">
      <Link to="/dashboard" className={userClass}>
        <UserRound size={14} />
        <span className="role-switch-label">User</span>
      </Link>
      {showStaff && (
        <Link to="/admin-board" className={staffClass}>
          <Store size={14} />
          <span className="role-switch-label">Staff</span>
        </Link>
      )}
    </div>
  )
}
