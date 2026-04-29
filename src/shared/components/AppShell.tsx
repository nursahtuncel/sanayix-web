import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/core/auth/authStore'
import { Home, MessageCircle, User, Briefcase, Bell, Search, Download, Share, X } from 'lucide-react'
import { cn } from './cn'
import { supabase } from '@/core/supabase/client'
import { useInstallPrompt } from '@/core/pwa/useInstallPrompt'

export function AppShell() {
  const { role, user } = useAuthStore()
  const navigate = useNavigate()
  const { shouldShowBanner, installState, prompt, dismiss } = useInstallPrompt()

  // Okunmamış bildirim sayısı
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
      return count ?? 0
    },
    enabled: !!user,
    refetchInterval: 30000,
  })

  // Okunmamış mesaj (chat) sayısı — basit yaklaşım: okunmamış bildirimden mesaj tipindekiler
  const { data: unreadMessages = 0 } = useQuery<number>({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
        .eq('type', 'message')
      return count ?? 0
    },
    enabled: !!user,
    refetchInterval: 15000,
  })

  const customerNav = [
    { to: '/home', icon: Home, label: 'Anasayfa' },
    { to: '/messages', icon: MessageCircle, label: 'Mesajlar', badge: unreadMessages },
    { to: '/profile/customer', icon: User, label: 'Profil' },
  ]

  const proNav = [
    { to: '/home', icon: Home, label: 'Anasayfa' },
    { to: '/leads', icon: Briefcase, label: 'Teklifler' },
    { to: '/messages', icon: MessageCircle, label: 'Mesajlar', badge: unreadMessages },
    { to: '/profile/pro', icon: User, label: 'Profil' },
  ]

  const navItems = role === 'professional' ? proNav : customerNav

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-lg text-navy">SanayiX</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <Search size={20} className="text-slate-600" />
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <Bell size={20} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </header>

      {/* Install Prompt Banner */}
      {shouldShowBanner && (
        <div className="bg-navy text-white px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0">
            <span className="text-navy font-bold text-sm">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">SanayiX'i Kur</p>
            {installState === 'ios-manual' ? (
              <p className="text-xs text-white/70 leading-tight mt-0.5 flex items-center gap-1">
                <Share size={10} />
                Paylaş → Ana Ekrana Ekle
              </p>
            ) : (
              <p className="text-xs text-white/70 leading-tight mt-0.5">
                Ana ekrana ekle, hızlı eriş
              </p>
            )}
          </div>
          {installState === 'promptable' && (
            <button
              onClick={prompt}
              className="bg-accent text-navy text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 hover:bg-accent/90 transition flex items-center gap-1"
            >
              <Download size={12} />
              Kur
            </button>
          )}
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg hover:bg-white/10 transition shrink-0"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0 md:ml-64">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex fixed left-0 top-[57px] h-[calc(100vh-57px)] w-64 bg-navy text-white flex-col z-40">
          <div className="px-4 py-6 space-y-1">
            {navItems.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <div className="relative">
                  <Icon size={20} />
                  {(badge ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
                {label}
              </NavLink>
            ))}
          </div>
        </aside>

        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors',
                isActive ? 'text-navy font-semibold' : 'text-slate-400'
              )
            }
          >
            <div className="relative">
              <Icon size={22} />
              {(badge ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
