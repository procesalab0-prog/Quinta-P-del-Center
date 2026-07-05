import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ClientApp from './client/ClientApp.jsx'
import AdminApp from './admin/AdminApp.jsx'

// Cambia el ícono y el nombre para "Agregar a inicio" según la sección:
// - Socios (/) → bola verde, "Quinta Padel"
// - Admin (/admin) → bola invertida, "Quinta Admin"
function useHomeScreenIdentity() {
  const { pathname } = useLocation()
  useEffect(() => {
    const isAdmin = pathname.startsWith('/admin')
    const icon = document.getElementById('apple-icon')
    const favicon = document.querySelector("link[rel='icon']")
    const title = document.getElementById('apple-title')
    const href = isAdmin ? '/icon-admin.png' : '/icon-socios.png'
    if (icon) icon.href = href
    if (favicon) favicon.href = href
    if (title) title.setAttribute('content', isAdmin ? 'Administracion' : 'Quinta Padel')
    document.title = isAdmin ? 'Administracion' : 'Quinta Padel Center'
  }, [pathname])
}

export default function App() {
  useHomeScreenIdentity()
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<ClientApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
