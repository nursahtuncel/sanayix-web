import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import {
  Star, ChevronRight, MessageCircle, Settings, Wrench,
  ToggleLeft, ToggleRight, Zap
} from 'lucide-react'
import { cn } from '@/shared/components/cn'
import type { Database } from '@/core/supabase/types'

type NearbyTab = 'jobs' | 'pros' | 'customers'

type ProProfile = Database['public']['Tables']['professional_profiles']['Row']

interface JobWithRelations {
  id: string
  stage: string
  service_requests: { title: string } | null
}

interface NearbyPro {
  id: string
  rating: number
  review_count: number
  is_online: boolean
  company_name: string | null
  skills: string[] | null
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface NearbyCustomer {
  id: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

interface Lead {
  id: string
  title: string
  budget_min: number | null
  budget_max: number | null
  address: { text: string } | null
  offer_count: number
  urgency: string
  profiles: { full_name: string } | null
}

const STAGE_LABEL: Record<string, string> = {
  in_progress: 'Devam Ediyor',
  awaiting_parts: 'Parça Bekleniyor',
  awaiting_customer: 'Müşteri Bekleniyor',
  ready: 'Hazır',
  completed: 'Tamamlandı',
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  in_progress: <Settings size={18} />,
  awaiting_parts: <Wrench size={18} />,
  awaiting_customer: <Zap size={18} />,
  ready: <Zap size={18} />,
}

export function ProHomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [nearbyTab, setNearbyTab] = useState<NearbyTab>('jobs')

  const { data: proProfile } = useQuery<ProProfile | null>({
    queryKey: ['pro-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      return data as ProProfile | null
    },
    enabled: !!user,
  })

  const { data: activeJobs } = useQuery<JobWithRelations[]>({
    queryKey: ['active-jobs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, stage, service_requests(title)')
        .eq('professional_id', user!.id)
        .neq('stage', 'completed')
        .order('created_at', { ascending: false })
      return (data ?? []) as unknown as JobWithRelations[]
    },
    enabled: !!user,
  })

  // Yakındaki İşler (leads)
  const { data: nearbyJobs } = useQuery<Lead[]>({
    queryKey: ['nearby-jobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('id, title, budget_min, budget_max, address, offer_count, urgency, profiles!service_requests_customer_id_fkey(full_name)')
        .in('status', ['pending', 'receiving_offers'])
        .order('created_at', { ascending: false })
        .limit(10)
      return (data ?? []) as unknown as Lead[]
    },
    enabled: nearbyTab === 'jobs',
  })

  // Yakındaki Ustalar
  const { data: nearbyPros } = useQuery<NearbyPro[]>({
    queryKey: ['nearby-pros'],
    queryFn: async () => {
      const { data } = await supabase
        .from('professional_profiles')
        .select('id, rating, review_count, is_online, company_name, skills, profiles(full_name, avatar_url)')
        .eq('approval_status', 'approved')
        .neq('id', user!.id)
        .order('rating', { ascending: false })
        .limit(10)
      return (data ?? []) as unknown as NearbyPro[]
    },
    enabled: nearbyTab === 'pros',
  })

  // Yakındaki Müşteriler (açık talep sahibi müşteriler)
  const { data: nearbyCustomers } = useQuery<NearbyCustomer[]>({
    queryKey: ['nearby-customers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('customer_id, profiles!service_requests_customer_id_fkey(full_name, avatar_url, created_at)')
        .in('status', ['pending', 'receiving_offers'])
        .order('created_at', { ascending: false })
        .limit(20)
      if (!data) return []
      // Benzersiz müşterileri döndür
      const seen = new Set<string>()
      return data
        .filter((r: { customer_id: string }) => {
          if (seen.has(r.customer_id)) return false
          seen.add(r.customer_id)
          return true
        })
        .slice(0, 10)
        .map((r: { customer_id: string; profiles: { full_name: string; avatar_url: string | null; created_at: string } | null }) => ({
          id: r.customer_id,
          full_name: r.profiles?.full_name ?? 'Müşteri',
          avatar_url: r.profiles?.avatar_url ?? null,
          created_at: r.profiles?.created_at ?? '',
        }))
    },
    enabled: nearbyTab === 'customers',
  })

  const toggleOnline = useMutation({
    mutationFn: async (isOnline: boolean) => {
      await supabase.from('professional_profiles').update({ is_online: isOnline }).eq('id', user!.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pro-profile', user?.id] }),
  })

  const startChat = useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', { p_other_user_id: otherUserId })
      if (error) throw error
      return data as string
    },
    onSuccess: (chatId) => navigate(`/messages/${chatId}`),
  })

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Usta'
  const isOnline = proProfile?.is_online ?? false

  const NEARBY_TABS: { key: NearbyTab; label: string }[] = [
    { key: 'jobs', label: 'İşler' },
    { key: 'pros', label: 'Ustalar' },
    { key: 'customers', label: 'Müşteriler' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Navy Hero */}
      <div className="bg-navy text-white px-4 pt-5 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/60 text-sm">Merhaba,</p>
            <h2 className="text-2xl font-bold">{firstName} Usta!</h2>
            <p className="text-white/60 text-sm mt-0.5">
              Bugün çevrede {nearbyJobs?.length ?? 0} yeni iş ilanı var.
            </p>
          </div>
          <button
            onClick={() => toggleOnline.mutate(!isOnline)}
            disabled={toggleOnline.isPending}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
              isOnline ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'
            )}
          >
            {isOnline
              ? <ToggleRight size={18} className="text-green-400" />
              : <ToggleLeft size={18} />
            }
            {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/60 text-xs mb-1">Aktif Teklifler</p>
            <p className="text-3xl font-bold">{activeJobs?.length ?? 0}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/60 text-xs mb-1">Puanın</p>
            <p className="text-3xl font-bold flex items-center gap-1">
              {proProfile?.rating?.toFixed(1) ?? '—'}
              <Star size={18} className="text-accent fill-accent" />
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Aktif İşlerim */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-navy text-base">Aktif İşlerim</h3>
            <button
              onClick={() => navigate('/leads')}
              className="text-sm text-[#3B82F6] font-semibold hover:underline"
            >
              Tümünü Gör
            </button>
          </div>

          {(activeJobs ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center text-slate-400 text-sm border border-slate-100">
              Şu an aktif işin yok
            </div>
          ) : (
            <div className="space-y-3">
              {(activeJobs ?? []).map((job) => (
                <div
                  key={job.id}
                  className="bg-orange rounded-2xl p-4 flex items-center gap-3 text-white cursor-pointer hover:opacity-95 transition"
                  onClick={() => navigate('/leads')}
                  style={{ backgroundColor: '#F97316' }}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    {STAGE_ICONS[job.stage] ?? <Wrench size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {job.service_requests?.title ?? '—'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                      <span className="text-white/80 text-xs">{STAGE_LABEL[job.stage] ?? job.stage}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/60 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Yakındaki Sekmeler */}
        <section>
          {/* Tab başlıkları */}
          <div className="grid grid-cols-3 border-b border-slate-200 mb-4">
            {NEARBY_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setNearbyTab(key)}
                className={cn(
                  'pb-3 text-center transition',
                  nearbyTab === key
                    ? 'border-b-2 border-navy'
                    : 'border-b-2 border-transparent'
                )}
              >
                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mb-0.5">Yakındaki</p>
                <p className={cn(
                  'text-sm font-semibold',
                  nearbyTab === key ? 'text-navy' : 'text-slate-500'
                )}>{label}</p>
              </button>
            ))}
          </div>

          {/* YAKINDAKİ İŞLER */}
          {nearbyTab === 'jobs' && (
            <div className="space-y-3">
              {(nearbyJobs ?? []).length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Yakında iş ilanı yok</p>
              ) : (nearbyJobs ?? []).map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => navigate(`/requests/${lead.id}`)}
                  className="w-full bg-white rounded-2xl p-4 border border-slate-100 hover:border-navy/20 hover:shadow-sm transition text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{lead.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{lead.profiles?.full_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {lead.urgency === 'urgent' && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Acil</span>
                      )}
                      <span className="text-xs text-slate-400">{lead.offer_count} teklif</span>
                    </div>
                  </div>
                  {lead.budget_min && (
                    <p className="text-xs text-slate-500 mt-2">
                      Bütçe: ₺{lead.budget_min.toLocaleString()} — ₺{lead.budget_max?.toLocaleString()}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* YAKINDAKİ USTALAR */}
          {nearbyTab === 'pros' && (
            <div className="space-y-3">
              {(nearbyPros ?? []).length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Yakında usta bulunamadı</p>
              ) : (nearbyPros ?? []).map((pro) => {
                const name = pro.profiles?.full_name ?? 'Usta'
                return (
                  <div
                    key={pro.id}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                  >
                    <button
                      onClick={() => navigate(`/pros/${pro.id}`)}
                      className="w-full p-4 text-left hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center overflow-hidden">
                            {pro.profiles?.avatar_url
                              ? <img src={pro.profiles.avatar_url} alt={name} className="w-full h-full object-cover" />
                              : <span className="text-xl font-bold text-navy">{name[0]}</span>
                            }
                          </div>
                          {pro.is_online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{name}</p>
                          {pro.company_name && (
                            <p className="text-xs font-semibold mt-0.5" style={{ color: '#F97316' }}>
                              {pro.company_name}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            <span className="text-xs font-semibold text-slate-700">{pro.rating.toFixed(1)}</span>
                            <span className="text-xs text-slate-400">({pro.review_count} Değerlendirme)</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); startChat.mutate(pro.id) }}
                          disabled={startChat.isPending}
                          className="w-9 h-9 bg-navy/8 hover:bg-navy/15 rounded-xl flex items-center justify-center transition shrink-0"
                        >
                          <MessageCircle size={18} className="text-navy" />
                        </button>
                      </div>
                      {pro.skills && pro.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {pro.skills.slice(0, 4).map((s, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* YAKINDAKİ MÜŞTERİLER */}
          {nearbyTab === 'customers' && (
            <div className="space-y-3">
              {(nearbyCustomers ?? []).length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Aktif müşteri bulunamadı</p>
              ) : (nearbyCustomers ?? []).map((customer) => (
                <div key={customer.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="w-full p-4 text-left hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-navy/10 flex items-center justify-center overflow-hidden shrink-0">
                        {customer.avatar_url
                          ? <img src={customer.avatar_url} alt={customer.full_name} className="w-full h-full object-cover" />
                          : <span className="text-lg font-bold text-navy">{customer.full_name[0]}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{customer.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Aktif talep sahibi</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); startChat.mutate(customer.id) }}
                        disabled={startChat.isPending}
                        className="w-9 h-9 bg-navy/8 hover:bg-navy/15 rounded-xl flex items-center justify-center transition shrink-0"
                      >
                        <MessageCircle size={18} className="text-navy" />
                      </button>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
