import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import { Plus, ChevronRight, Clock, Star, Search, MapPin, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/shared/components/cn'
import type { Database, RequestStatus } from '@/core/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']
type ServiceRequest = Database['public']['Tables']['service_requests']['Row']
type SortMode = 'rating' | 'price' | 'proximity'

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Bekliyor',
  receiving_offers: 'Teklif Alıyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
  disputed: 'İtirazda',
}

const STATUS_COLOR: Record<RequestStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  receiving_offers: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  disputed: 'bg-orange-100 text-orange-700',
}

interface Pro {
  id: string
  hourly_rate: number | null
  rating: number
  review_count: number
  is_online: boolean
  company_name: string | null
  bio: string | null
  skills: string[] | null
  latitude: number | null
  longitude: number | null
  profiles: { full_name: string; avatar_url: string | null } | null
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export function CustomerHomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<'requests' | 'pros'>('requests')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('rating')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState(false)
  const locationRequested = useRef(false)

  useEffect(() => {
    if (sortMode === 'proximity' && !locationRequested.current) {
      locationRequested.current = true
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocationError(true),
        { timeout: 8000 },
      )
    }
  }, [sortMode])

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*')
      return (data ?? []) as Category[]
    },
  })

  const { data: requests, isLoading: requestsLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['my-requests', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('*')
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      return (data ?? []) as ServiceRequest[]
    },
    enabled: !!user,
  })

  const { data: pros, isLoading: prosLoading } = useQuery<Pro[]>({
    queryKey: ['pros-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('professional_profiles')
        .select('id, hourly_rate, rating, review_count, is_online, company_name, bio, skills, latitude, longitude, profiles(full_name, avatar_url)')
        .eq('approval_status', 'approved')
      return (data ?? []) as unknown as Pro[]
    },
    enabled: activeTab === 'pros',
  })

  const filteredPros = (() => {
    let list = (pros ?? []).filter((p) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const inSkills = (p.skills ?? []).some((s) => s.toLowerCase().includes(q))
      const inBio = (p.bio ?? '').toLowerCase().includes(q)
      const inCompany = (p.company_name ?? '').toLowerCase().includes(q)
      return inSkills || inBio || inCompany
    })

    if (sortMode === 'rating') {
      list = [...list].sort((a, b) => b.rating - a.rating)
    } else if (sortMode === 'price') {
      list = [...list].sort((a, b) => {
        if (a.hourly_rate == null) return 1
        if (b.hourly_rate == null) return -1
        return a.hourly_rate - b.hourly_rate
      })
    } else if (sortMode === 'proximity' && userLocation) {
      list = [...list].sort((a, b) => {
        if (a.latitude == null || a.longitude == null) return 1
        if (b.latitude == null || b.longitude == null) return -1
        const da = haversine(userLocation.lat, userLocation.lng, a.latitude, a.longitude)
        const db = haversine(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
        return da - db
      })
    }
    return list
  })()

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Merhaba'

  return (
    <div className="max-w-3xl mx-auto">
      {/* Karşılama */}
      <div className="bg-navy px-4 pt-4 pb-5 text-white">
        <p className="text-white/70 text-sm">Merhaba,</p>
        <h2 className="text-2xl font-bold mt-0.5">{firstName} 👋</h2>
        <p className="text-white/60 text-sm mt-1">Bugün ne yaptırmak istersin?</p>
        <button
          onClick={() => navigate('/requests/new')}
          className="mt-4 flex items-center gap-2 bg-accent text-navy font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-accent/90 transition"
        >
          <Plus size={16} />
          Yeni Talep Oluştur
        </button>
      </div>

      {/* Sekmeler */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex">
          {(['requests', 'pros'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-3 text-sm font-semibold transition border-b-2',
                activeTab === tab
                  ? 'border-navy text-navy'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {tab === 'requests' ? 'Taleplerim' : 'Ustalar'}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      {activeTab === 'requests' ? (
        <div className="p-4 space-y-6">
          {/* Kategoriler */}
          <section>
            <h3 className="font-semibold text-navy mb-3">Kategoriler</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(categories ?? []).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate('/requests/new')}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 hover:border-navy hover:text-navy transition text-left"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </section>

          {/* Talepler */}
          <section>
            <h3 className="font-semibold text-navy mb-3">Son Taleplerim</h3>
            {requestsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : (requests ?? []).length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-slate-500 text-sm border border-slate-100">
                Henüz talebiniz yok.
                <br />
                <button
                  onClick={() => navigate('/requests/new')}
                  className="text-navy font-semibold mt-1 hover:underline"
                >
                  İlk talebini oluştur →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(requests ?? []).map((req) => (
                  <button
                    key={req.id}
                    onClick={() => navigate(`/requests/${req.id}`)}
                    className="w-full bg-white rounded-xl p-4 border border-slate-100 hover:border-navy/30 hover:shadow-sm transition text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{req.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[req.status as RequestStatus]}`}>
                          {STATUS_LABEL[req.status as RequestStatus]}
                        </span>
                        {req.offer_count > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/requests/${req.id}/offers`)
                            }}
                            className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline"
                          >
                            <Clock size={12} />
                            {req.offer_count} teklif
                          </button>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Arama */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Yetkinlik ara (örn: elektrik, boya, kaynak...)"
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
            />
          </div>

          {/* Filtre */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {([
              { key: 'rating', label: 'En Yüksek Puan', icon: <Star size={12} /> },
              { key: 'price', label: 'En Düşük Fiyat', icon: <SlidersHorizontal size={12} /> },
              { key: 'proximity', label: 'Yakınlık', icon: <MapPin size={12} /> },
            ] as { key: SortMode; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setSortMode(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition',
                  sortMode === key
                    ? 'bg-navy text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300',
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {sortMode === 'proximity' && locationError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700 text-xs">
              Konum izni alınamadı. Lütfen tarayıcı ayarlarından konum iznini etkinleştirin.
            </div>
          )}

          {/* Pro listesi */}
          {prosLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-14 h-14 bg-slate-200 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPros.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
              <p className="font-medium text-slate-600">Usta bulunamadı</p>
              <p className="text-sm text-slate-400 mt-1">
                {search ? 'Farklı bir yetkinlik aramayı deneyin' : 'Henüz onaylı usta yok'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPros.map((pro) => {
                const name = pro.profiles?.full_name ?? 'Usta'
                const avatar = pro.profiles?.avatar_url
                const dist =
                  sortMode === 'proximity' && userLocation && pro.latitude && pro.longitude
                    ? haversine(userLocation.lat, userLocation.lng, pro.latitude, pro.longitude)
                    : null

                return (
                  <button
                    key={pro.id}
                    onClick={() => navigate(`/pros/${pro.id}`)}
                    className="w-full bg-white rounded-2xl p-4 border border-slate-100 hover:border-navy/30 hover:shadow-sm transition text-left"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-navy/10 flex items-center justify-center overflow-hidden">
                          {avatar
                            ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
                            : <span className="text-xl font-bold text-navy">{name[0]}</span>
                          }
                        </div>
                        {pro.is_online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                        )}
                      </div>

                      {/* Bilgi */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
                            {pro.company_name && (
                              <p className="text-xs text-slate-500 truncate">{pro.company_name}</p>
                            )}
                          </div>
                          {pro.hourly_rate && (
                            <span className="text-sm font-bold text-navy shrink-0">
                              ₺{pro.hourly_rate.toLocaleString()}<span className="text-xs font-normal text-slate-400">/sa</span>
                            </span>
                          )}
                        </div>

                        {/* Puan */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-slate-700">{pro.rating.toFixed(1)}</span>
                          <span className="text-xs text-slate-400">({pro.review_count} yorum)</span>
                          {dist != null && (
                            <span className="text-xs text-slate-400 flex items-center gap-0.5 ml-2">
                              <MapPin size={10} />
                              {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                            </span>
                          )}
                        </div>

                        {/* Yetkinlikler */}
                        {pro.skills && pro.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pro.skills.slice(0, 3).map((s, i) => (
                              <span
                                key={i}
                                className="bg-navy/8 text-navy text-xs px-2 py-0.5 rounded-full"
                              >
                                {s}
                              </span>
                            ))}
                            {pro.skills.length > 3 && (
                              <span className="text-xs text-slate-400">+{pro.skills.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
