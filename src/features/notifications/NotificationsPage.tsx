import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import { ChevronLeft, Bell, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  title: string
  body: string | null
  type: string
  action_url: string | null
  is_read: boolean
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Az önce'
  if (mins < 60) return `${mins}dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}sa önce`
  return `${Math.floor(hours / 24)}g önce`
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data ?? []) as Notification[]
    },
    enabled: !!user,
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.id] })
      qc.invalidateQueries({ queryKey: ['unread-notifications', user?.id] })
    },
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.id] })
      qc.invalidateQueries({ queryKey: ['unread-notifications', user?.id] })
    },
  })

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markRead.mutate(notif.id)
    if (notif.action_url) navigate(notif.action_url)
  }

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 transition">
            <ChevronLeft size={20} className="text-slate-700" />
          </button>
          <h2 className="font-bold text-navy">Bildirimler</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-navy text-sm font-medium hover:underline"
          >
            <CheckCheck size={16} />
            Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))
        ) : (notifications ?? []).length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Bell size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">Bildirim yok</p>
            <p className="text-sm text-slate-400 mt-1">Yeni bildirimler burada görünür</p>
          </div>
        ) : (
          (notifications ?? []).map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`w-full text-left rounded-2xl p-4 border transition hover:shadow-sm ${
                notif.is_read
                  ? 'bg-white border-slate-100'
                  : 'bg-navy/5 border-navy/15'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${notif.is_read ? 'bg-slate-200' : 'bg-navy'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${notif.is_read ? 'text-slate-600' : 'text-navy'}`}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.body}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.created_at)}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
