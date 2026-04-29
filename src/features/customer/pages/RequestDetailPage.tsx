import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import {
  ChevronLeft, ChevronRight, Clock, MapPin, Car,
  AlertTriangle, CheckCircle, XCircle, Star, MessageCircle
} from 'lucide-react'
import { cn } from '@/shared/components/cn'
import type { RequestStatus, OfferStatus } from '@/core/supabase/types'

// ─── Tipler ────────────────────────────────────────────
interface RequestDetail {
  id: string
  title: string
  description: string | null
  status: RequestStatus
  urgency: string
  budget_min: number | null
  budget_max: number | null
  address: { text: string } | null
  photos: string[]
  offer_count: number
  created_at: string
  vehicle_id: string | null
  categories: { name: string } | null
}

interface Offer {
  id: string
  price: number
  duration_days: number | null
  message: string | null
  status: OfferStatus
  created_at: string
  professional_id: string
  profiles: { full_name: string; avatar_url: string | null } | null
  professional_profiles: { rating: number; review_count: number } | null
}

// ─── Yardımcılar ───────────────────────────────────────
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:           { label: 'Bekliyor',       color: 'bg-slate-100 text-slate-600',  icon: <Clock size={14} /> },
  receiving_offers:  { label: 'Teklif Alıyor',  color: 'bg-blue-100 text-blue-700',   icon: <Clock size={14} /> },
  in_progress:       { label: 'Devam Ediyor',   color: 'bg-amber-100 text-amber-700', icon: <CheckCircle size={14} /> },
  completed:         { label: 'Tamamlandı',     color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
  cancelled:         { label: 'İptal Edildi',   color: 'bg-red-100 text-red-500',     icon: <XCircle size={14} /> },
  disputed:          { label: 'İtirazda',       color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle size={14} /> },
}

// ─── Teklif Kartı ──────────────────────────────────────
function OfferCard({
  offer,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
  canAct,
}: {
  offer: Offer
  onAccept: (id: string) => void
  onReject: (id: string) => void
  isAccepting: boolean
  isRejecting: boolean
  canAct: boolean
}) {
  const isActive = offer.status === 'active'
  const isAccepted = offer.status === 'accepted'
  const isRejected = offer.status === 'rejected'

  return (
    <div className={cn(
      'rounded-xl border-2 p-4 transition-all',
      isAccepted ? 'border-green-400 bg-green-50' :
      isRejected ? 'border-slate-200 bg-slate-50 opacity-60' :
      'border-slate-200 bg-white hover:border-navy/30'
    )}>
      {/* Usta bilgisi */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
            {offer.profiles?.avatar_url
              ? <img src={offer.profiles.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
              : <span className="text-navy font-bold text-sm">
                  {offer.profiles?.full_name?.[0] ?? '?'}
                </span>
            }
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800">{offer.profiles?.full_name ?? 'Usta'}</p>
            {offer.professional_profiles && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="text-xs text-slate-500">
                  {offer.professional_profiles.rating.toFixed(1)}
                  {' '}({offer.professional_profiles.review_count} yorum)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fiyat */}
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-navy">₺{offer.price.toLocaleString()}</p>
          {offer.duration_days && (
            <p className="text-xs text-slate-500">{offer.duration_days} gün</p>
          )}
        </div>
      </div>

      {/* Mesaj */}
      {offer.message && (
        <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
          {offer.message}
        </p>
      )}

      {/* Durum veya butonlar */}
      <div className="mt-4">
        {isAccepted && (
          <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
            <CheckCircle size={16} />
            Teklif Kabul Edildi
          </div>
        )}
        {isRejected && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <XCircle size={16} />
            Reddedildi
          </div>
        )}
        {isActive && canAct && (
          <div className="flex gap-2">
            <button
              onClick={() => onReject(offer.id)}
              disabled={isRejecting}
              className="flex-1 border border-slate-200 text-slate-600 font-medium py-2 rounded-xl text-sm hover:bg-slate-50 transition disabled:opacity-50"
            >
              Reddet
            </button>
            <button
              onClick={() => onAccept(offer.id)}
              disabled={isAccepting}
              className="flex-1 bg-navy text-white font-semibold py-2 rounded-xl text-sm hover:bg-navy-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAccepting
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Kabul Et'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Ana sayfa ─────────────────────────────────────────
export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  // Talep
  const { data: request, isLoading } = useQuery<RequestDetail | null>({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('*, categories(name)')
        .eq('id', id!)
        .single()
      return data as RequestDetail | null
    },
    enabled: !!id,
  })

  // Teklifler
  const { data: offers } = useQuery<Offer[]>({
    queryKey: ['offers', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('*, profiles(full_name, avatar_url), professional_profiles(rating, review_count)')
        .eq('request_id', id!)
        .order('price', { ascending: true })
      return (data ?? []) as unknown as Offer[]
    },
    enabled: !!id,
  })

  // Teklif kabul
  const acceptOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
      if (error) throw error
      return data
    },
    onSuccess: (jobId) => {
      qc.invalidateQueries({ queryKey: ['request', id] })
      qc.invalidateQueries({ queryKey: ['offers', id] })
      qc.invalidateQueries({ queryKey: ['my-requests', user?.id] })
      navigate(`/messages`)
      // İleride: navigate(`/jobs/${jobId}`)
      void jobId
    },
  })

  // Teklif ret
  const rejectOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase
        .from('offers')
        .update({ status: 'rejected' })
        .eq('id', offerId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers', id] })
    },
  })

  // İptal
  const cancelRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'cancelled' })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request', id] })
      qc.invalidateQueries({ queryKey: ['my-requests', user?.id] })
      navigate('/home')
    },
  })

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-2/3 mb-3" />
            <div className="h-4 bg-slate-200 rounded w-full mb-2" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (!request) return null

  const statusCfg = STATUS_CONFIG[request.status]
  const canAct = ['pending', 'receiving_offers'].includes(request.status)
  const activeOffers = (offers ?? []).filter((o) => o.status === 'active')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/home')}
          className="p-2 rounded-xl hover:bg-slate-100 transition"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>
        <h2 className="font-semibold text-slate-800 flex-1 truncate">{request.title}</h2>
        <span className={cn('flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full', statusCfg.color)}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">

        {/* Talep Bilgileri */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          {request.categories && (
            <span className="inline-block text-xs font-medium bg-navy/10 text-navy px-2.5 py-1 rounded-full">
              {request.categories.name}
            </span>
          )}

          <div>
            <h3 className="font-bold text-lg text-slate-800">{request.title}</h3>
            {request.description && (
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">{request.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {request.budget_min && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">Bütçe</p>
                <p className="font-semibold text-sm text-slate-800">
                  ₺{request.budget_min.toLocaleString()} — ₺{request.budget_max?.toLocaleString()}
                </p>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-0.5">Aciliyet</p>
              <p className="font-semibold text-sm text-slate-800 capitalize">
                {request.urgency === 'urgent' ? '🔴 Acil' : '🟢 Normal'}
              </p>
            </div>
          </div>

          {request.address?.text && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
              {request.address.text}
            </div>
          )}

          {request.vehicle_id && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Car size={16} className="text-slate-400" />
              Araç bilgisi mevcut
            </div>
          )}

          {/* Fotoğraflar */}
          {request.photos?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Fotoğraflar</p>
              <div className="grid grid-cols-3 gap-2">
                {request.photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="aspect-square rounded-xl object-cover bg-slate-100 cursor-pointer hover:opacity-90 transition"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Teklifler */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-navy">
              Teklifler
              {activeOffers.length > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {activeOffers.length} aktif
                </span>
              )}
            </h3>
            {(offers ?? []).length > 3 && (
              <button
                onClick={() => navigate(`/requests/${id}/offers`)}
                className="flex items-center gap-1 text-navy text-sm font-medium hover:underline"
              >
                Tümünü gör <ChevronRight size={16} />
              </button>
            )}
          </div>

          {(offers ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <Clock size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Henüz teklif yok</p>
              <p className="text-sm text-slate-500 mt-1">Ustalar talebini inceliyor, yakında teklifler gelecek</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(offers ?? []).slice(0, 3).map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onAccept={(oid) => acceptOffer.mutate(oid)}
                  onReject={(oid) => rejectOffer.mutate(oid)}
                  isAccepting={acceptOffer.isPending && acceptOffer.variables === offer.id}
                  isRejecting={rejectOffer.isPending && rejectOffer.variables === offer.id}
                  canAct={canAct}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mesajlaşma kısayolu (iş başladıysa) */}
        {request.status === 'in_progress' && (
          <button
            onClick={() => navigate('/messages')}
            className="w-full flex items-center justify-center gap-2 bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navy-700 transition"
          >
            <MessageCircle size={18} />
            Ustayla Mesajlaş
          </button>
        )}

        {/* İptal */}
        {canAct && (
          <button
            onClick={() => {
              if (window.confirm('Talebi iptal etmek istediğine emin misin?')) {
                cancelRequest.mutate()
              }
            }}
            disabled={cancelRequest.isPending}
            className="w-full border border-red-200 text-red-500 font-medium py-3 rounded-xl hover:bg-red-50 transition text-sm disabled:opacity-50"
          >
            {cancelRequest.isPending ? 'İptal ediliyor...' : 'Talebi İptal Et'}
          </button>
        )}
      </div>
    </div>
  )
}
