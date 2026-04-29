import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import { ChevronLeft, Send, Check, CheckCheck } from 'lucide-react'
import { cn } from '@/shared/components/cn'

interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  type: string
  is_read: boolean
  created_at: string
}

interface ChatInfo {
  id: string
  customer_id: string
  professional_id: string
  customer: { full_name: string; avatar_url: string | null } | null
  professional: { full_name: string; avatar_url: string | null } | null
  jobs: { service_requests: { title: string } | null } | null
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Bugün'
  if (d.toDateString() === yesterday.toDateString()) return 'Dün'
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

// Mesajları tarihe göre gruplandır
function groupByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: Record<string, Message[]> = {}
  messages.forEach((m) => {
    const key = new Date(m.created_at).toDateString()
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  })
  return Object.entries(groups).map(([, msgs]) => ({
    date: formatDate(msgs[0].created_at),
    messages: msgs,
  }))
}

export function ChatDetailPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const qc = useQueryClient()

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Chat bilgisi
  const { data: chat } = useQuery<ChatInfo | null>({
    queryKey: ['chat-info', chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chats')
        .select(`
          *,
          customer:profiles!chats_customer_id_fkey(full_name, avatar_url),
          professional:profiles!chats_professional_id_fkey(full_name, avatar_url),
          jobs(service_requests(title))
        `)
        .eq('id', chatId!)
        .single()
      return data as unknown as ChatInfo | null
    },
    enabled: !!chatId,
  })

  // Mesajlar
  const { data: messages } = useQuery<Message[]>({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId!)
        .order('created_at', { ascending: true })
      return (data ?? []) as Message[]
    },
    enabled: !!chatId,
  })

  // Okunmamışları okundu işaretle
  useEffect(() => {
    if (!chatId || !user || !messages?.length) return
    const unread = messages.filter((m) => !m.is_read && m.sender_id !== user.id)
    if (unread.length === 0) return
    supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', unread.map((m) => m.id))
      .then(() => qc.invalidateQueries({ queryKey: ['chats', user.id] }))
  }, [messages, chatId, user, qc])

  // Realtime mesaj aboneliği
  useEffect(() => {
    if (!chatId || !user) return

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const newMsg = payload.new as Message
        qc.setQueryData<Message[]>(['messages', chatId], (old) =>
          old ? [...old, newMsg] : [newMsg]
        )
        // Karşı tarafın mesajıysa okundu işaretle
        if (newMsg.sender_id !== user.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id)
          qc.invalidateQueries({ queryKey: ['chats', user.id] })
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== user.id) {
          setIsTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
        }
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [chatId, user, qc])

  // Otomatik scroll — yeni mesaj gelince
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mesaj gönder
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !user || !chatId || sending) return

    setSending(true)
    setInput('')

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      chat_id: chatId,
      sender_id: user.id,
      content: text,
      type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    }

    // Optimistic update
    qc.setQueryData<Message[]>(['messages', chatId], (old) =>
      old ? [...old, optimistic] : [optimistic]
    )

    const { data, error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, sender_id: user.id, content: text })
      .select()
      .single()

    if (!error && data) {
      // Optimistic'i gerçek mesajla değiştir
      qc.setQueryData<Message[]>(['messages', chatId], (old) =>
        old ? old.map((m) => m.id === optimistic.id ? data as Message : m) : [data as Message]
      )
      qc.invalidateQueries({ queryKey: ['chats', user.id] })
    }
    setSending(false)
  }

  // Typing indicator yayını
  const handleInputChange = (val: string) => {
    setInput(val)
    if (!chatId || !user) return
    supabase.channel(`chat-${chatId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id },
    })
  }

  const other = role === 'customer' ? chat?.professional : chat?.customer
  const jobTitle = (chat?.jobs as { service_requests: { title: string } | null } | null)
    ?.service_requests?.title

  const grouped = groupByDate(messages ?? [])

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => navigate('/messages')}
          className="p-2 rounded-xl hover:bg-slate-100 transition shrink-0"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>

        <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center overflow-hidden shrink-0">
          {other?.avatar_url
            ? <img src={other.avatar_url} className="w-full h-full object-cover" alt="" />
            : <span className="text-navy font-bold">{other?.full_name?.[0] ?? '?'}</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{other?.full_name ?? '—'}</p>
          {jobTitle && (
            <p className="text-xs text-slate-500 truncate">{jobTitle}</p>
          )}
        </div>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-slate-400 text-sm">Henüz mesaj yok.</p>
            <p className="text-slate-300 text-xs mt-1">İlk mesajı sen gönder 👋</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              {/* Tarih ayırıcı */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">{group.date}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {group.messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                const isOptimistic = msg.id.startsWith('optimistic-')

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex mb-2',
                      isMe ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                      isMe
                        ? 'bg-navy text-white rounded-br-sm'
                        : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={cn(
                        'flex items-center justify-end gap-1 mt-1',
                        isMe ? 'text-white/50' : 'text-slate-400'
                      )}>
                        <span className="text-xs">{formatTime(msg.created_at)}</span>
                        {isMe && (
                          isOptimistic
                            ? <Check size={12} />
                            : msg.is_read
                              ? <CheckCheck size={12} className="text-blue-300" />
                              : <Check size={12} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mesaj giriş alanı */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 safe-area-pb">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Mesaj yaz..."
            rows={1}
            className="flex-1 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition resize-none max-h-32 leading-relaxed"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-navy text-white rounded-full flex items-center justify-center hover:bg-navy-700 transition disabled:opacity-40 shrink-0"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send size={18} />
            }
          </button>
        </div>
        <p className="text-center text-xs text-slate-300 mt-1">Enter ile gönder · Shift+Enter yeni satır</p>
      </div>
    </div>
  )
}
