import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'

// Giriş yapmamışsa /login'e yönlendir
export function AuthGuard() {
  const { user, initialized } = useAuthStore()
  if (!initialized) return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

// Giriş yapmışsa /home'a yönlendir (login/register sayfaları için)
export function GuestGuard() {
  const { user, initialized } = useAuthStore()
  if (!initialized) return null
  if (user) return <Navigate to="/home" replace />
  return <Outlet />
}

// Sadece müşteri
export function CustomerGuard() {
  const { role, initialized } = useAuthStore()
  if (!initialized) return null
  if (role !== 'customer') return <Navigate to="/home" replace />
  return <Outlet />
}

// Sadece usta
export function ProGuard() {
  const { role, initialized } = useAuthStore()
  if (!initialized) return null
  if (role !== 'professional') return <Navigate to="/home" replace />
  return <Outlet />
}
