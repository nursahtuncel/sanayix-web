import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import { MessageCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/components/cn'

interface ChatItem {
  id: string
  job_id: string
  customer_id: string
  professional_id: string
  created_at: string
  // join'ler
  customer: { full_name: string; avatar_url: string | null } | null
  professional: { full_name: string; avatar_url: string | null } | null
  jobs: { service_requests: { title: string } | null } | null
  last_message?: { content: string; created_at: string; sender_id: string } | null
  unread_count?: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins}dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}sa önce`
  const days = Math.floor(hours / 24)
  return `${days}g önce`
}

export function MessagesListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const qc = useQueryClient()

  const { data: chats, isLoading } = useQuery<ChatItem[]>({
    queryKey: ['chats', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('chats')
        .select(`
          *,
          customer:profiles!chats_customer_id_fkey(full_name, avatar_url),
          professional:profiles!chats_professional_id_fkey(full_name, avatar_url),
          jobs(service_requests(title))
        `)
        .or(`customer_id.eq.${user!.id},professional_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
      if (!data) return []

      // Her chat için son mesajı çek
      const enriched = await Promise.all(
        data.map(async (chat) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('is_read', false)
            .neq('sender_id', user!.id)

          return {
            ...chat,
            last_message: msgs?.[0] ?? null,
            unread_count: count ?? 0,
          }
        })
      )

      return enriched as unknown as ChatItem[]
    },
    enabled: !!user,
  })

  // Realtime — yeni mesaj gelince inbox'ı güncelle
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        qc.invalidateQueries({ queryKey: ['chats', user.id] })
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [user, qc])

  const getOtherPerson = (chat: ChatItem) =>
    role === 'customer' ? chat.professional : chat.customer

  const getJobTitle = (chat: ChatItem) =>
    (chat.jobs as { service_requests: { title: string } | null } | null)
      ?.service_requests?.title ?? 'İş'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-10">
        <h2 className="font-bold text-lg text-navy">Mesajlar</h2>
      </div>

      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (chats ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <MessageCircle size={48} className="text-slate-200 mb-4" />
            <p className="font-semibold text-slate-600">Henüz mesajın yok</p>
            <p className="text-sm text-slate-400 mt-1">
              Bir teklif kabul edildiğinde sohbet otomatik başlar
            </p>
          </div>
        ) : (
          <div className="bg-white divide-y divide-slate-100">
            {(chats ?? []).map((chat) => {
              const other = getOtherPerson(chat)
              const hasUnread = (chat.unread_count ?? 0) > 0

              return (
                <button
                  key={chat.id}
                  onClick={() => navigate(`/messages/${chat.id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition text-left"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-navy/10 flex items-center justify-center overflow-hidden">
                      {other?.avatar_url
                        ? <img src={other.avatar_url} className="w-full h-full object-cover" alt="" />
                        : <span className="text-navy font-bold text-lg">
                            {other?.full_name?.[0] ?? '?'}
                          </span>
                      }
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-navy text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm truncate', hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700')}>
                        {other?.full_name ?? '—'}
                      </p>
                      {chat.last_message && (
                        <span className="text-xs text-slate-400 shrink-0">
                          {timeAgo(chat.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {getJobTitle(chat)}
                    </p>
                    {chat.last_message && (
                      <p className={cn('text-sm truncate mt-0.5', hasUnread ? 'text-slate-800 font-medium' : 'text-slate-400')}>
                        {chat.last_message.sender_id === user?.id ? 'Sen: ' : ''}
                        {chat.last_message.content}
                      </p>
                    )}
                  </div>

                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
