import { Navigate, Route, Routes } from 'react-router-dom'
import RegistrationPage from './pages/RegistrationPage.jsx'
import QueueStatusPage from './pages/QueueStatusPage.jsx'

// One line per page. Teammates add their route here.
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/status" element={<QueueStatusPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
