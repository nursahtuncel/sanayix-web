import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import {
  MapPin, Clock, ChevronRight, X, Send, Banknote, Calendar, Filter
} from 'lucide-react'
import { cn } from '@/shared/components/cn'
import type { RequestStatus } from '@/core/supabase/types'

interface Lead {
  id: string
  customer_id: string
  title: string
  description: string | null
  status: RequestStatus
  urgency: string
  budget_min: number | null
  budget_max: number | null
  address: { text: string } | null
  offer_count: number
  created_at: string
  photos: string[]
  categories: { name: string } | null
  profiles: { full_name: string } | null
}

const offerSchema = z.object({
  price: z.coerce.number().min(1, 'Fiyat girin'),
  duration_days: z.coerce.number().min(1, 'Süre girin'),
  message: z.string().min(10, 'En az 10 karakter yazın'),
})
type OfferForm = z.infer<typeof offerSchema>

const STATUS_COLOR: Partial<Record<RequestStatus, string>> = {
  pending:          'bg-slate-100 text-slate-600',
  receiving_offers: 'bg-blue-100 text-blue-700',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}sa önce`
  return `${Math.floor(hours / 24)}g önce`
}

// ─── Teklif Ver Modal ──────────────────────────────────
function OfferModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: Lead
  onClose: () => void
  onSuccess: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const { register, handleSubmit, formState: { errors }, watch } = useForm<OfferForm>({
    defaultValues: { duration_days: 1 },
  })

  const submitOffer = useMutation({
    mutationFn: async (data: OfferForm) => {
      const { error } = await supabase.from('offers').insert({
        request_id: lead.id,
        professional_id: user!.id,
        price: data.price,
        duration_days: data.duration_days,
        message: data.message,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  const price = watch('price')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-navy">Teklif Ver</h3>
            <p className="text-xs text-slate-500 truncate max-w-[250px]">{lead.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Talep özeti */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {lead.budget_min && (
              <span className="flex items-center gap-1">
                <Banknote size={12} />
                ₺{lead.budget_min.toLocaleString()} — ₺{lead.budget_max?.toLocaleString()}
              </span>
            )}
            {lead.address?.text && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={12} />
                {lead.address.text}
              </span>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit((d) => submitOffer.mutate(d))}
          className="px-5 py-5 space-y-4"
        >
          {/* Fiyat + Süre */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teklif Fiyatı (₺)
              </label>
              <input
                {...register('price')}
                type="number"
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Calendar size={12} className="inline mr-1" />
                Süre (gün)
              </label>
              <input
                {...register('duration_days')}
                type="number"
                min={1}
                placeholder="1"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              />
              {errors.duration_days && <p className="text-red-500 text-xs mt-1">{errors.duration_days.message}</p>}
            </div>
          </div>

          {/* Bütçeye göre uyarı */}
          {price && lead.budget_max && price > lead.budget_max && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs">
              ⚠ Teklifin müşterinin bütçesinin (₺{lead.budget_max.toLocaleString()}) üzerinde
            </div>
          )}

          {/* Mesaj */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Açıklama / Yaklaşımın
            </label>
            <textarea
              {...register('message')}
              rows={4}
              placeholder="Bu işi nasıl yapacağını, deneyimini ve müşteriye güven verecek bilgileri yaz..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy resize-none"
            />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
          </div>

          {submitOffer.isError && (
            <p className="text-red-500 text-sm">
              {submitOffer.error instanceof Error && submitOffer.error.message.includes('unique')
                ? 'Bu talep için zaten teklif verdin.'
                : 'Bir hata oluştu, tekrar dene.'}
            </p>
          )}

          <button
            type="submit"
            disabled={submitOffer.isPending}
            className="w-full flex items-center justify-center gap-2 bg-navy text-white font-bold py-3.5 rounded-xl hover:bg-navy-700 transition disabled:opacity-60"
          >
            {submitOffer.isPending
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Send size={16} /> Teklif Gönder</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Lead Kartı ────────────────────────────────────────
function LeadCard({ lead, onOffer }: { lead: Lead; onOffer: (l: Lead) => void }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 text-left flex items-start gap-3 hover:bg-slate-50/50 transition"
      >
        <div className="flex-1 min-w-0">
          {/* Başlık + Badge */}
          <div className="flex items-start gap-2 flex-wrap">
            {lead.categories && (
              <span className="text-xs bg-navy/10 text-navy px-2 py-0.5 rounded-full font-medium shrink-0">
                {lead.categories.name}
              </span>
            )}
            {lead.urgency === 'urgent' && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                🔴 Acil
              </span>
            )}
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
              STATUS_COLOR[lead.status as RequestStatus] ?? 'bg-slate-100 text-slate-500'
            )}>
              {lead.offer_count} teklif
            </span>
          </div>

          <p className="font-semibold text-slate-800 mt-2 text-sm leading-snug">{lead.title}</p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {lead.budget_min && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Banknote size={12} />
                ₺{lead.budget_min.toLocaleString()} — ₺{lead.budget_max?.toLocaleString()}
              </span>
            )}
            {lead.address?.text && (
              <span className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[180px]">
                <MapPin size={12} />
                {lead.address.text}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={12} />
              {timeAgo(lead.created_at)}
            </span>
          </div>
        </div>
        <ChevronRight
          size={18}
          className={cn('text-slate-400 shrink-0 transition-transform mt-1', expanded && 'rotate-90')}
        />
      </button>

      {/* Genişletilmiş detay */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {lead.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{lead.description}</p>
          )}

          {/* Fotoğraflar */}
          {lead.photos?.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {lead.photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="aspect-square rounded-xl object-cover bg-slate-100"
                />
              ))}
            </div>
          )}

          {lead.profiles?.full_name && (
            <div className="flex items-center gap-2 py-2 border-t border-slate-100">
              <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy">
                {lead.profiles.full_name[0]}
              </div>
              <button
                onClick={() => navigate(`/customers/${lead.customer_id}`)}
                className="text-xs text-navy font-semibold hover:underline"
              >
                {lead.profiles.full_name} — Profili Gör
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => navigate(`/requests/${lead.id}`)}
              className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl text-sm hover:bg-slate-50 transition"
            >
              Detayı Gör
            </button>
            <button
              onClick={() => onOffer(lead)}
              className="flex-2 bg-navy text-white font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-navy-700 transition flex items-center justify-center gap-1.5"
            >
              <Send size={14} /> Teklif Ver
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Ana Sayfa ─────────────────────────────────────────
export function LeadsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [filter, setFilter] = useState<'all' | 'urgent'>('all')

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ['leads-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('*, customer_id, categories(name), profiles!service_requests_customer_id_fkey(full_name)')
        .in('status', ['pending', 'receiving_offers'])
        .order('created_at', { ascending: false })
      return (data ?? []) as unknown as Lead[]
    },
    enabled: !!user,
  })

  // Zaten teklif verilmiş talepleri filtrele
  const { data: myOfferRequestIds } = useQuery<string[]>({
    queryKey: ['my-offer-ids', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('request_id')
        .eq('professional_id', user!.id)
      return (data ?? []).map((o: { request_id: string }) => o.request_id)
    },
    enabled: !!user,
  })

  const filtered = (leads ?? []).filter((l) => {
    if (filter === 'urgent' && l.urgency !== 'urgent') return false
    return true
  })

  const alreadyOffered = (id: string) => (myOfferRequestIds ?? []).includes(id)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h2 className="font-bold text-lg text-navy">Yeni Talepler</h2>
          <span className="text-sm text-slate-500">{filtered.length} talep</span>
        </div>

        {/* Filtre */}
        <div className="flex gap-2 mt-3 max-w-2xl mx-auto">
          {[
            { key: 'all', label: 'Tümü', icon: <Filter size={12} /> },
            { key: 'urgent', label: 'Acil', icon: <span>🔴</span> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition',
                filter === key
                  ? 'bg-navy text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
              <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="font-semibold text-slate-600">Şu an talep yok</p>
            <p className="text-sm text-slate-400 mt-1">Yeni talepler burada görünür</p>
          </div>
        ) : (
          filtered.map((lead) => (
            <div key={lead.id} className="relative">
              <LeadCard lead={lead} onOffer={setSelectedLead} />
              {alreadyOffered(lead.id) && (
                <div className="absolute top-3 right-10 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  ✓ Teklif Verildi
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Teklif Modal */}
      {selectedLead && (
        <OfferModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['leads-all'] })
            qc.invalidateQueries({ queryKey: ['my-offer-ids', user?.id] })
          }}
        />
      )}
    </div>
  )
}
