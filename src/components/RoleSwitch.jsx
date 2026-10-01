import { Link } from 'react-router-dom'
import { Store, UserRound } from 'lucide-react'
import './RoleSwitch.css'

// Demo only: users should defo NOT be able to do this, but for funsies rn
// These are plain links , switching views is really just going to another page nothing fancy
export default function RoleSwitch({ current }) {

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
      <Link to="/admin-board" className={staffClass}>
        <Store size={14} />
        <span className="role-switch-label">Staff</span>
      </Link>
    </div>
  )
}
