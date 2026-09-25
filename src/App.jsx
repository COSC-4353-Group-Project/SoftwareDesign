import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import RegistrationPage from './pages/RegistrationPage.jsx'
import QueueStatusPage from './pages/QueueStatusPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'

// One line per page. Teammates add their route here.
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />

      {/* no top bar: login / registration */}
      <Route path="/register" element={<RegistrationPage />} />

      {/* with top bar: every page nested in here gets AppLayout around it */}
      <Route element={<AppLayout />}>
        <Route path="/status" element={<QueueStatusPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/HistoryPage" element={<HistoryPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
