import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import { ChevronLeft, Star, Clock, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/shared/components/cn'

type SortBy = 'price' | 'rating' | 'duration'

interface Offer {
  id: string
  price: number
  duration_days: number | null
  message: string | null
  status: string
  created_at: string
  professional_id: string
  profiles: { full_name: string; avatar_url: string | null } | null
  professional_profiles: { rating: number; review_count: number; is_online: boolean } | null
}

const SORT_LABELS: Record<SortBy, string> = {
  price: 'En Düşük Fiyat',
  rating: 'En Yüksek Puan',
  duration: 'En Hızlı',
}

export function OffersPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [sortBy, setSortBy] = useState<SortBy>('price')

  const { data: request } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('title, status')
        .eq('id', id!)
        .single()
      return data
    },
    enabled: !!id,
  })

  const { data: offers, isLoading } = useQuery<Offer[]>({
    queryKey: ['offers-all', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('*, profiles(full_name, avatar_url), professional_profiles(rating, review_count, is_online)')
        .eq('request_id', id!)
      return (data ?? []) as unknown as Offer[]
    },
    enabled: !!id,
  })

  const acceptOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request', id] })
      qc.invalidateQueries({ queryKey: ['offers-all', id] })
      qc.invalidateQueries({ queryKey: ['my-requests', user?.id] })
      navigate('/messages')
    },
  })

  const rejectOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase
        .from('offers')
        .update({ status: 'rejected' })
        .eq('id', offerId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers-all', id] }),
  })

  // Sıralama
  const sorted = [...(offers ?? [])].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price
    if (sortBy === 'rating')
      return (b.professional_profiles?.rating ?? 0) - (a.professional_profiles?.rating ?? 0)
    if (sortBy === 'duration')
      return (a.duration_days ?? 999) - (b.duration_days ?? 999)
    return 0
  })

  const canAct = request?.status === 'pending' || request?.status === 'receiving_offers'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(`/requests/${id}`)}
          className="p-2 rounded-xl hover:bg-slate-100 transition"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-800">Tüm Teklifler</h2>
          {request?.title && (
            <p className="text-xs text-slate-500 truncate">{request.title}</p>
          )}
        </div>
        <span className="text-sm text-slate-500">{(offers ?? []).length} teklif</span>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        {/* Sıralama */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition',
                sortBy === key
                  ? 'bg-navy text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                  </div>
                  <div className="h-7 bg-slate-200 rounded w-20" />
                </div>
                <div className="h-3 bg-slate-200 rounded w-full mb-1" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <Clock size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">Henüz teklif yok</p>
            <p className="text-sm text-slate-500 mt-1">Ustalar talebini inceliyor</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((offer, idx) => {
              const isActive = offer.status === 'active'
              const isAccepted = offer.status === 'accepted'
              const isRejected = offer.status === 'rejected'
              const isFirst = idx === 0 && sortBy === 'price' && isActive

              return (
                <div
                  key={offer.id}
                  className={cn(
                    'bg-white rounded-2xl p-5 shadow-sm border-2 transition',
                    isAccepted ? 'border-green-400' :
                    isFirst ? 'border-navy' :
                    isRejected ? 'border-slate-100 opacity-60' :
                    'border-transparent'
                  )}
                >
                  {isFirst && (
                    <div className="inline-flex items-center gap-1 bg-navy text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                      ⭐ En İyi Fiyat
                    </div>
                  )}
                  {isAccepted && (
                    <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                      <CheckCircle size={12} /> Kabul Edildi
                    </div>
                  )}

                  {/* Usta */}
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="flex items-center gap-3 hover:opacity-80 transition text-left"
                      onClick={() => navigate(`/pros/${offer.professional_id}`)}
                    >
                      <div className="w-11 h-11 rounded-full bg-navy/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {offer.profiles?.avatar_url
                          ? <img src={offer.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                          : <span className="text-navy font-bold">{offer.profiles?.full_name?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-slate-800 underline decoration-slate-300">{offer.profiles?.full_name}</p>
                          {offer.professional_profiles?.is_online && (
                            <span className="w-2 h-2 bg-green-400 rounded-full" title="Çevrimiçi" />
                          )}
                        </div>
                        {offer.professional_profiles && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            <span className="text-xs text-slate-500">
                              {offer.professional_profiles.rating.toFixed(1)}
                              {' '}· {offer.professional_profiles.review_count} yorum
                            </span>
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-navy">₺{offer.price.toLocaleString()}</p>
                      {offer.duration_days && (
                        <p className="text-xs text-slate-500 mt-0.5">{offer.duration_days} gün</p>
                      )}
                    </div>
                  </div>

                  {/* Mesaj */}
                  {offer.message && (
                    <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">
                      "{offer.message}"
                    </p>
                  )}

                  {/* Butonlar */}
                  {isActive && canAct && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => rejectOffer.mutate(offer.id)}
                        disabled={rejectOffer.isPending}
                        className="flex-1 flex items-center justify-center gap-1 border border-slate-200 text-slate-500 font-medium py-2.5 rounded-xl text-sm hover:bg-slate-50 transition"
                      >
                        <XCircle size={14} /> Reddet
                      </button>
                      <button
                        onClick={() => acceptOffer.mutate(offer.id)}
                        disabled={acceptOffer.isPending}
                        className="flex-2 flex items-center justify-center gap-1 bg-navy text-white font-semibold py-2.5 px-5 rounded-xl text-sm hover:bg-navy-700 transition disabled:opacity-60"
                      >
                        {acceptOffer.isPending && acceptOffer.variables === offer.id
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <><CheckCircle size={14} /> Kabul Et</>
                        }
                      </button>
                    </div>
                  )}

                  {isRejected && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                      <XCircle size={12} /> Reddedildi
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
