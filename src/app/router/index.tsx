import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard, GuestGuard, CustomerGuard, ProGuard } from './guards'
import { AppShell } from '@/shared/components/AppShell'
import { useAuthStore } from '@/core/auth/authStore'

// Auth sayfaları
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterCustomerPage } from '@/features/auth/pages/RegisterCustomerPage'
import { RegisterProPage } from '@/features/auth/pages/RegisterProPage'

// Customer sayfaları
import { CustomerHomePage } from '@/features/customer/pages/CustomerHomePage'
import { CreateRequestPage } from '@/features/customer/pages/CreateRequestPage'
import { RequestDetailPage } from '@/features/customer/pages/RequestDetailPage'
import { OffersPage } from '@/features/customer/pages/OffersPage'
import { CustomerProfilePage } from '@/features/customer/pages/CustomerProfilePage'

// Professional sayfaları
import { ProHomePage } from '@/features/professional/pages/ProHomePage'
import { ProProfilePage } from '@/features/professional/pages/ProProfilePage'
import { ProPublicProfilePage } from '@/features/professional/pages/ProPublicProfilePage'
import { LeadsPage } from '@/features/professional/pages/LeadsPage'

// Customer public profil
import { CustomerPublicProfilePage } from '@/features/customer/pages/CustomerPublicProfilePage'

// Messaging
import { MessagesListPage } from '@/features/messaging/pages/MessagesListPage'
import { ChatDetailPage } from '@/features/messaging/pages/ChatDetailPage'

// Legal
import { LegalPage } from '@/features/legal/LegalPage'

// Role'e göre home yönlendirmesi
function HomeRedirect() {
  const role = useAuthStore((s) => s.role)
  if (role === 'customer') return <CustomerHomePage />
  if (role === 'professional') return <ProHomePage />
  return <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  // Public (sadece giriş yapmamışlar)
  {
    element: <GuestGuard />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register/customer', element: <RegisterCustomerPage /> },
      { path: '/register/pro', element: <RegisterProPage /> },
    ],
  },

  // Protected (giriş yapılmış)
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/home', element: <HomeRedirect /> },

          // Customer
          {
            element: <CustomerGuard />,
            children: [
              { path: '/requests/new', element: <CreateRequestPage /> },
              { path: '/requests/:id', element: <RequestDetailPage /> },
              { path: '/requests/:id/offers', element: <OffersPage /> },
              { path: '/profile/customer', element: <CustomerProfilePage /> },
            ],
          },

          // Professional
          {
            element: <ProGuard />,
            children: [
              { path: '/leads', element: <LeadsPage /> },
              { path: '/profile/pro', element: <ProProfilePage /> },
            ],
          },

          // İkisi de erişebilir
          { path: '/messages', element: <MessagesListPage /> },
          { path: '/messages/:chatId', element: <ChatDetailPage /> },
          { path: '/pros/:id', element: <ProPublicProfilePage /> },
          { path: '/customers/:id', element: <CustomerPublicProfilePage /> },
        ],
      },
    ],
  },

  // Legal (herkese açık)
  { path: '/legal/:type', element: <LegalPage /> },

  // Fallback
  { path: '/', element: <Navigate to="/home" replace /> },
  { path: '*', element: <Navigate to="/home" replace /> },
])
