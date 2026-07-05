import { Routes, Route, Navigate } from 'react-router-dom'
import ClientApp from './client/ClientApp.jsx'
import AdminApp from './admin/AdminApp.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<ClientApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
