import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/core/supabase/client'
import { ChevronLeft, Star, MessageCircle, Briefcase, Building2 } from 'lucide-react'

interface ProProfile {
  id: string
  bio: string | null
  hourly_rate: number | null
  min_job_amount: number | null
  company_name: string | null
  is_online: boolean
  rating: number
  review_count: number
  skills: string[] | null
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface PortfolioItem {
  id: string
  image_url: string
  title: string | null
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
    </div>
  )
}

export function ProPublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: pro, isLoading } = useQuery<ProProfile>({
    queryKey: ['pro-public', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select('id, bio, hourly_rate, min_job_amount, company_name, is_online, rating, review_count, skills, profiles(full_name, avatar_url)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as ProProfile
    },
    enabled: !!id,
  })

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ['pro-reviews', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
        .eq('reviewee_id', id!)
        .order('created_at', { ascending: false })
        .limit(5)
      return (data ?? []) as unknown as Review[]
    },
    enabled: !!id,
  })

  const { data: sanayis } = useQuery<{ name: string; district: string }[]>({
    queryKey: ['pro-sanayis-public', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('professional_sanayis')
        .select('sanayis(name, district)')
        .eq('professional_id', id!)
      interface SanayiRow {
        sanayis: { name: string; district: string } | null
      }
      return ((data ?? []) as SanayiRow[]).map((r) => r.sanayis).filter(Boolean) as { name: string; district: string }[]
    },
    enabled: !!id,
  })

  const { data: portfolio } = useQuery<PortfolioItem[]>({
    queryKey: ['pro-portfolio-public', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolio_items')
        .select('id, image_url, title')
        .eq('professional_id', id!)
        .limit(9)
      return (data ?? []) as PortfolioItem[]
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
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 bg-slate-200 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-full mb-2" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (!pro) {
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

  const name = pro.profiles?.full_name ?? 'Usta'
  const avatar = pro.profiles?.avatar_url

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
        <h2 className="font-semibold text-slate-800">Usta Profili</h2>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Temel Bilgi */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-navy/10 flex items-center justify-center overflow-hidden">
                {avatar
                  ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-navy">{name[0]}</span>
                }
              </div>
              {pro.is_online && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-800">{name}</h1>
              {pro.company_name && (
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <Briefcase size={13} />
                  {pro.company_name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <StarRow rating={pro.rating} />
                <span className="text-sm font-semibold text-slate-700">{pro.rating.toFixed(1)}</span>
                <span className="text-xs text-slate-400">({pro.review_count} yorum)</span>
              </div>
            </div>
          </div>

          {/* Fiyat */}
          {(pro.hourly_rate || pro.min_job_amount) && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
              {pro.hourly_rate && (
                <div className="flex-1 bg-navy/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Saatlik Ücret</p>
                  <p className="font-bold text-navy">₺{pro.hourly_rate.toLocaleString()}</p>
                </div>
              )}
              {pro.min_job_amount && (
                <div className="flex-1 bg-navy/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Min. İş Tutarı</p>
                  <p className="font-bold text-navy">₺{pro.min_job_amount.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hakkında */}
        {pro.bio && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-2">Hakkında</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{pro.bio}</p>
          </div>
        )}

        {/* Yetkinlikler */}
        {pro.skills && pro.skills.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3">Yetkinlikler</h3>
            <div className="flex flex-wrap gap-2">
              {pro.skills.map((skill, i) => (
                <span
                  key={i}
                  className="bg-navy/10 text-navy text-sm font-medium px-3 py-1.5 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Çalıştığı Sanayiler */}
        {sanayis && sanayis.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 size={16} className="text-navy" /> Çalıştığı Sanayiler
            </h3>
            <div className="flex flex-wrap gap-2">
              {sanayis.map((s, i) => (
                <span
                  key={i}
                  className="bg-navy/8 text-navy text-xs font-medium px-3 py-1.5 rounded-full"
                  title={s.district}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portföy */}
        {portfolio && portfolio.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3">Portföy</h3>
            <div className="grid grid-cols-3 gap-2">
              {portfolio.map((item) => (
                <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <img src={item.image_url} alt={item.title ?? ''} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yorumlar */}
        {reviews && reviews.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3">Yorumlar</h3>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy overflow-hidden">
                      {review.profiles?.avatar_url
                        ? <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (review.profiles?.full_name?.[0] ?? '?')
                      }
                    </div>
                    <span className="text-sm font-medium text-slate-700">{review.profiles?.full_name ?? 'Müşteri'}</span>
                    <StarRow rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-slate-600 leading-relaxed ml-9">{review.comment}</p>
                  )}
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
