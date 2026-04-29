import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'
import { ChevronLeft, MessageCircle, CalendarDays, ClipboardList } from 'lucide-react'

interface CustomerProfile {
  full_name: string
  avatar_url: string | null
  created_at: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

export function CustomerPublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: profile, isLoading } = useQuery<CustomerProfile>({
    queryKey: ['customer-public', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, created_at')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as CustomerProfile
    },
    enabled: !!id,
  })

  const { data: requestCount } = useQuery<number>({
    queryKey: ['customer-request-count', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id!)
      return count ?? 0
    },
    enabled: !!id,
  })

  const { data: recentRequests } = useQuery<{ id: string; title: string; created_at: string }[]>({
    queryKey: ['customer-recent-requests', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('id, title, created_at')
        .eq('customer_id', id!)
        .in('status', ['completed', 'in_progress', 'pending', 'receiving_offers'])
        .order('created_at', { ascending: false })
        .limit(5)
      return data ?? []
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-5 bg-slate-200 rounded w-32 animate-pulse" />
        </div>
        <div className="p-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-200 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Profil bulunamadı.</p>
          <button onClick={() => navigate(-1)} className="mt-3 text-navy font-semibold text-sm hover:underline">
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>
        <h2 className="font-semibold text-slate-800">Müşteri Profili</h2>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Temel Bilgi */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-navy/10 flex items-center justify-center overflow-hidden shrink-0">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-navy">{profile.full_name[0]}</span>
              }
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{profile.full_name}</h1>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <CalendarDays size={13} />
                {formatDate(profile.created_at)}'den beri üye
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-700">
              <ClipboardList size={16} className="text-navy" />
              <span className="text-sm">
                Toplam <span className="font-bold text-navy">{requestCount ?? 0}</span> talep oluşturmuş
              </span>
            </div>
          </div>
        </div>

        {/* Son Talepler */}
        {recentRequests && recentRequests.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3">Son Talepleri</h3>
            <div className="space-y-2">
              {recentRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <p className="text-sm text-slate-700 font-medium truncate flex-1 mr-3">{req.title}</p>
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(req.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mesaj Gönder */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-10">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/messages')}
            className="w-full flex items-center justify-center gap-2 bg-navy text-white font-bold py-3.5 rounded-xl hover:bg-navy-700 transition"
          >
            <MessageCircle size={18} />
            Mesaj Gönder
          </button>
        </div>
      </div>
    </div>
  )
}
