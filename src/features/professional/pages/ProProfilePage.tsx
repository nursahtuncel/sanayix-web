import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import {
  User, Briefcase, Star, Edit2, Check, LogOut,
  Clock, Banknote, MapPin, Camera, Trash2, Plus,
  Search, ChevronDown, X, Building2
} from 'lucide-react'
import { cn } from '@/shared/components/cn'

interface ProForm {
  full_name: string
  phone: string
  company_name: string
  tax_id: string
  bio: string
  hourly_rate: string
  min_job_amount: string
}

interface PortfolioItem {
  id: string
  image_url: string
  title: string | null
}

interface Sanayi {
  id: string
  name: string
  district: string
  side: 'Avrupa' | 'Anadolu'
}

// ─── Sanayi Seçici ─────────────────────────────────────────
function SanayiPicker({
  allSanayis,
  selectedIds,
  onChange,
}: {
  allSanayis: Sanayi[]
  selectedIds: Set<string>
  onChange: (ids: Set<string>) => void
}) {
  const [search, setSearch] = useState('')
  const [openDistricts, setOpenDistricts] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => {
    const filtered = allSanayis.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.district.toLowerCase().includes(search.toLowerCase())
    )
    const map: Record<string, { side: string; items: Sanayi[] }> = {}
    for (const s of filtered) {
      if (!map[s.district]) map[s.district] = { side: s.side, items: [] }
      map[s.district].items.push(s)
    }
    return map
  }, [allSanayis, search])

  const toggleDistrict = (d: string) => {
    setOpenDistricts((prev) => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
  }

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  // Arama açıkken tüm gruplar açık
  const isOpen = (d: string) => search.length > 0 || openDistricts.has(d)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Arama */}
      <div className="relative border-b border-slate-100">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sanayi veya ilçe ara..."
          className="w-full pl-9 pr-4 py-2.5 text-sm focus:outline-none"
        />
      </div>

      {/* Seçilen sayısı */}
      {selectedIds.size > 0 && (
        <div className="px-3 py-2 bg-navy/5 border-b border-slate-100 text-xs text-navy font-semibold">
          {selectedIds.size} sanayi seçildi
        </div>
      )}

      {/* Gruplar */}
      <div className="max-h-72 overflow-y-auto">
        {Object.keys(grouped).length === 0 ? (
          <p className="text-center py-6 text-sm text-slate-400">Sonuç bulunamadı</p>
        ) : (
          Object.entries(grouped).map(([district, { side, items }]) => (
            <div key={district} className="border-b border-slate-100 last:border-0">
              {/* Grup başlığı */}
              <button
                type="button"
                onClick={() => toggleDistrict(district)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-700">{district}</span>
                  <span className={cn(
                    'ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium',
                    side === 'Avrupa' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  )}>
                    {side} Yakası
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {items.some((s) => selectedIds.has(s.id)) && (
                    <span className="w-2 h-2 bg-navy rounded-full" />
                  )}
                  <ChevronDown
                    size={14}
                    className={cn('text-slate-400 transition-transform', isOpen(district) && 'rotate-180')}
                  />
                </div>
              </button>

              {/* Sanayiler */}
              {isOpen(district) && (
                <div className="pb-1">
                  {items.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggle(s.id)}
                        className="w-4 h-4 rounded accent-navy"
                      />
                      <span className="text-sm text-slate-700">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Ana Sayfa ──────────────────────────────────────────────
export function ProProfilePage() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)
  const [editingSanayis, setEditingSanayis] = useState(false)
  const [selectedSanayiIds, setSelectedSanayiIds] = useState<Set<string>>(new Set())

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      return data
    },
    enabled: !!user,
  })

  const { data: proProfile } = useQuery({
    queryKey: ['pro-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('professional_profiles').select('*').eq('id', user!.id).single()
      return data
    },
    enabled: !!user,
  })

  const { data: portfolio } = useQuery<PortfolioItem[]>({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolio_items')
        .select('id, image_url, title')
        .eq('professional_id', user!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as PortfolioItem[]
    },
    enabled: !!user,
  })

  const { data: allSanayis } = useQuery<Sanayi[]>({
    queryKey: ['sanayis'],
    queryFn: async () => {
      const { data } = await supabase.from('sanayis').select('*').order('side').order('district').order('name')
      return (data ?? []) as Sanayi[]
    },
  })

  const { data: mySanayiIds } = useQuery<string[]>({
    queryKey: ['my-sanayis', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('professional_sanayis')
        .select('sanayi_id')
        .eq('professional_id', user!.id)
      return (data ?? []).map((r: { sanayi_id: string }) => r.sanayi_id)
    },
    enabled: !!user,
    onSuccess: (ids) => {
      if (!editingSanayis) setSelectedSanayiIds(new Set(ids))
    },
  } as Parameters<typeof useQuery>[0])

  const mySanayis = useMemo(
    () => (allSanayis ?? []).filter((s) => (mySanayiIds ?? []).includes(s.id)),
    [allSanayis, mySanayiIds],
  )

  const updateProfile = useMutation({
    mutationFn: async (data: ProForm) => {
      await supabase.from('profiles').update({ full_name: data.full_name, phone: data.phone }).eq('id', user!.id)
      await supabase.from('professional_profiles').update({
        company_name: data.company_name || null,
        tax_id: data.tax_id || null,
        bio: data.bio || null,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
        min_job_amount: data.min_job_amount ? parseFloat(data.min_job_amount) : null,
      }).eq('id', user!.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] })
      qc.invalidateQueries({ queryKey: ['pro-profile', user?.id] })
      setEditing(false)
    },
  })

  const saveSanayis = useMutation({
    mutationFn: async (ids: Set<string>) => {
      await supabase.from('professional_sanayis').delete().eq('professional_id', user!.id)
      if (ids.size > 0) {
        await supabase.from('professional_sanayis').insert(
          Array.from(ids).map((sanayi_id) => ({ professional_id: user!.id, sanayi_id }))
        )
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-sanayis', user?.id] })
      setEditingSanayis(false)
    },
  })

  const uploadPortfolio = async (files: FileList | null) => {
    if (!files || !user) return
    setUploadingPortfolio(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file)
      if (upErr) continue
      const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
      await supabase.from('portfolio_items').insert({ professional_id: user.id, image_url: data.publicUrl })
    }
    setUploadingPortfolio(false)
    qc.invalidateQueries({ queryKey: ['portfolio', user?.id] })
  }

  const deletePortfolio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolio_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio', user?.id] }),
  })

  const { register, handleSubmit } = useForm<ProForm>({
    values: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      company_name: proProfile?.company_name ?? '',
      tax_id: proProfile?.tax_id ?? '',
      bio: proProfile?.bio ?? '',
      hourly_rate: proProfile?.hourly_rate?.toString() ?? '',
      min_job_amount: proProfile?.min_job_amount?.toString() ?? '',
    },
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-10">
        <h2 className="font-bold text-lg text-navy">Usta Profilim</h2>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">

        {/* Profil kartı */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center">
              <User size={28} className="text-navy/50" />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-800">{profile?.full_name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-navy/10 text-navy px-2.5 py-0.5 rounded-full font-medium">Usta</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  proProfile?.approval_status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : proProfile?.approval_status === 'rejected'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {proProfile?.approval_status === 'approved' ? '✓ Onaylı'
                    : proProfile?.approval_status === 'rejected' ? '✗ Reddedildi'
                    : '⏳ Onay Bekliyor'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">{proProfile?.rating?.toFixed(1) ?? '—'}</p>
                <p className="text-xs text-slate-500">{proProfile?.review_count ?? 0} yorum</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
              <Banknote size={16} className="text-green-500 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">
                  {proProfile?.hourly_rate ? `₺${proProfile.hourly_rate}/sa` : '—'}
                </p>
                <p className="text-xs text-slate-500">Saatlik ücret</p>
              </div>
            </div>
          </div>

          {!editing ? (
            <div className="space-y-3">
              {[
                { icon: <User size={14} />, label: 'Telefon', value: profile?.phone },
                { icon: <Briefcase size={14} />, label: 'Firma', value: proProfile?.company_name },
                { icon: <MapPin size={14} />, label: 'Vergi No', value: proProfile?.tax_id },
                { icon: <Clock size={14} />, label: 'Min. İş', value: proProfile?.min_job_amount ? `₺${proProfile.min_job_amount}` : null },
              ].map(({ icon, label, value }) => value ? (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">{icon} {label}</span>
                  <span className="text-slate-800 font-medium">{value}</span>
                </div>
              ) : null)}

              {proProfile?.bio && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Hakkımda</p>
                  <p className="text-sm text-slate-700">{proProfile.bio}</p>
                </div>
              )}

              <button
                onClick={() => setEditing(true)}
                className="mt-2 flex items-center gap-1.5 text-navy text-sm font-medium hover:underline"
              >
                <Edit2 size={14} /> Profili Düzenle
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => updateProfile.mutate(d))} className="space-y-3">
              {[
                { name: 'full_name', label: 'Ad Soyad', type: 'text' },
                { name: 'phone', label: 'Telefon', type: 'tel' },
                { name: 'company_name', label: 'Firma Adı', type: 'text' },
                { name: 'tax_id', label: 'Vergi No', type: 'text' },
                { name: 'hourly_rate', label: 'Saatlik Ücret (₺)', type: 'number' },
                { name: 'min_job_amount', label: 'Min. İş Bedeli (₺)', type: 'number' },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input
                    {...register(name as keyof ProForm)}
                    type={type}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hakkımda</label>
                <textarea
                  {...register('bio')}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">
                  İptal
                </button>
                <button type="submit" disabled={updateProfile.isPending}
                  className="flex-1 bg-navy text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1">
                  <Check size={14} /> Kaydet
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sanayiler */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-navy flex items-center gap-2">
              <Building2 size={18} /> Çalıştığım Sanayiler
            </h3>
            {!editingSanayis ? (
              <button
                onClick={() => {
                  setSelectedSanayiIds(new Set(mySanayiIds ?? []))
                  setEditingSanayis(true)
                }}
                className="flex items-center gap-1 text-navy text-sm font-medium hover:underline"
              >
                <Edit2 size={14} /> Düzenle
              </button>
            ) : (
              <button
                onClick={() => setEditingSanayis(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {!editingSanayis ? (
            mySanayis.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">
                Henüz sanayi seçilmedi.
                <br />
                <button
                  onClick={() => {
                    setSelectedSanayiIds(new Set())
                    setEditingSanayis(true)
                  }}
                  className="text-navy font-semibold mt-1 hover:underline"
                >
                  Sanayi ekle →
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mySanayis.map((s) => (
                  <span
                    key={s.id}
                    className="bg-navy/8 text-navy text-xs font-medium px-3 py-1.5 rounded-full"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <SanayiPicker
                allSanayis={allSanayis ?? []}
                selectedIds={selectedSanayiIds}
                onChange={setSelectedSanayiIds}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSanayis(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => saveSanayis.mutate(selectedSanayiIds)}
                  disabled={saveSanayis.isPending}
                  className="flex-1 bg-navy text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  {saveSanayis.isPending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Check size={14} /> Kaydet</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-navy flex items-center gap-2">
              <Camera size={18} /> Portfolio
            </h3>
            <label className="flex items-center gap-1 text-navy text-sm font-medium cursor-pointer hover:underline">
              {uploadingPortfolio
                ? <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                : <Plus size={16} />
              }
              Ekle
              <input type="file" accept="image/*" multiple className="sr-only"
                onChange={(e) => uploadPortfolio(e.target.files)} />
            </label>
          </div>

          {(portfolio ?? []).length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              Henüz portfolio fotoğrafı yok
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(portfolio ?? []).map((item) => (
                <div key={item.id} className="relative group aspect-square">
                  <img src={item.image_url} alt={item.title ?? ''} className="w-full h-full object-cover rounded-xl" />
                  <button
                    onClick={() => {
                      if (window.confirm('Fotoğraf silinsin mi?')) deletePortfolio.mutate(item.id)
                    }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Çıkış */}
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 font-medium py-3 rounded-2xl hover:bg-red-50 transition text-sm"
        >
          <LogOut size={16} /> Çıkış Yap
        </button>
      </div>
    </div>
  )
}
