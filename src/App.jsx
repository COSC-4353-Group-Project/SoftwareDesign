import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import RegistrationPage from './pages/RegistrationPage.jsx'
import QueueStatusPage from './pages/QueueStatusPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import HistoryPage from './pages/HistoryPage.jsx'   
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminServicesPage from './pages/AdminServicesPage.jsx'
import AdminQueuesPage from './pages/AdminQueuesPage.jsx'

// One line per page. Teammates add their route here.
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />

      {/* no top bar: login / registration */}
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/login" element={<LoginPage />} /> 

      {/* with top bar: every page nested in here gets AppLayout around it */}
      <Route element={<AppLayout />}>
        <Route path="/status" element={<QueueStatusPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<UserDashboard />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/history" element={<HistoryPage />} />
      </Route>

      {/* staff pages: same idea as above, but wrapped in the admin top bar instead, when we add more admin pages, they go here */}
      <Route element={<AdminLayout />}>
        <Route path="/admin-board" element={<AdminDashboard />} />
        <Route path="/admin-services" element={<AdminServicesPage />} />
        <Route path="/admin-queues" element={<AdminQueuesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
