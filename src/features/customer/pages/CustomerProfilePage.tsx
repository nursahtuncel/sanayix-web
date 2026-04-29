import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import { User, Car, Plus, Trash2, Edit2, Check, LogOut } from 'lucide-react'
import { cn } from '@/shared/components/cn'
import { useNavigate } from 'react-router-dom'

interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
  year: number | null
}

interface ProfileForm {
  full_name: string
  phone: string
}

interface VehicleForm {
  plate: string
  brand: string
  model: string
  year: string
}

export function CustomerProfilePage() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editingProfile, setEditingProfile] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  // Profil
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      return data
    },
    enabled: !!user,
  })

  // Araçlar
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as Vehicle[]
    },
    enabled: !!user,
  })

  // Profil güncelle
  const updateProfile = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, phone: data.phone })
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] })
      setEditingProfile(false)
    },
  })

  // Araç ekle/güncelle
  const saveVehicle = useMutation({
    mutationFn: async (data: VehicleForm) => {
      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update({ plate: data.plate, brand: data.brand, model: data.model, year: data.year ? parseInt(data.year) : null })
          .eq('id', editingVehicle.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert({ owner_id: user!.id, plate: data.plate, brand: data.brand, model: data.model, year: data.year ? parseInt(data.year) : null })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles', user?.id] })
      setShowVehicleForm(false)
      setEditingVehicle(null)
      vehicleForm.reset()
    },
  })

  // Araç sil
  const deleteVehicle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles', user?.id] }),
  })

  // Form'lar
  const profileForm = useForm<ProfileForm>({
    values: { full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' },
  })
  const vehicleForm = useForm<VehicleForm>({
    values: editingVehicle
      ? { plate: editingVehicle.plate, brand: editingVehicle.brand, model: editingVehicle.model, year: editingVehicle.year?.toString() ?? '' }
      : { plate: '', brand: '', model: '', year: '' },
  })

  const startEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v)
    setShowVehicleForm(true)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-10">
        <h2 className="font-bold text-lg text-navy">Profilim</h2>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">

        {/* Avatar + ad */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center">
              <User size={28} className="text-navy/50" />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-800">{profile?.full_name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                Müşteri
              </span>
            </div>
          </div>

          {editingProfile ? (
            <form
              onSubmit={profileForm.handleSubmit((d) => updateProfile.mutate(d))}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ad Soyad</label>
                <input
                  {...profileForm.register('full_name')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                <input
                  {...profileForm.register('phone')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="flex-1 bg-navy text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  <Check size={14} /> Kaydet
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Telefon</span>
                <span className="text-slate-800">{profile?.phone ?? '—'}</span>
              </div>
              <button
                onClick={() => setEditingProfile(true)}
                className="mt-3 flex items-center gap-1.5 text-navy text-sm font-medium hover:underline"
              >
                <Edit2 size={14} /> Profili Düzenle
              </button>
            </div>
          )}
        </div>

        {/* Araçlar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-navy flex items-center gap-2">
              <Car size={18} /> Araçlarım
            </h3>
            <button
              onClick={() => { setEditingVehicle(null); vehicleForm.reset(); setShowVehicleForm(true) }}
              className="flex items-center gap-1 text-navy text-sm font-medium hover:underline"
            >
              <Plus size={16} /> Ekle
            </button>
          </div>

          {showVehicleForm && (
            <form
              onSubmit={vehicleForm.handleSubmit((d) => saveVehicle.mutate(d))}
              className="mb-4 p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-200"
            >
              <p className="text-sm font-semibold text-slate-700">{editingVehicle ? 'Araç Düzenle' : 'Yeni Araç'}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'plate', label: 'Plaka', placeholder: '34 ABC 123' },
                  { name: 'brand', label: 'Marka', placeholder: 'Toyota' },
                  { name: 'model', label: 'Model', placeholder: 'Corolla' },
                  { name: 'year',  label: 'Yıl',   placeholder: '2020' },
                ].map(({ name, label, placeholder }) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input
                      {...vehicleForm.register(name as keyof VehicleForm)}
                      placeholder={placeholder}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowVehicleForm(false); setEditingVehicle(null) }}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm hover:bg-slate-100"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saveVehicle.isPending}
                  className="flex-1 bg-navy text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                >
                  {saveVehicle.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          )}

          {(vehicles ?? []).length === 0 && !showVehicleForm ? (
            <div className="text-center py-6 text-sm text-slate-400">
              Henüz araç eklemediniz
            </div>
          ) : (
            <div className="space-y-2">
              {(vehicles ?? []).map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition',
                    editingVehicle?.id === v.id ? 'border-navy bg-navy/5' : 'border-slate-100 hover:border-slate-200'
                  )}
                >
                  <div>
                    <p className="font-medium text-sm text-slate-800">{v.brand} {v.model}</p>
                    <p className="text-xs text-slate-500">{v.plate}{v.year ? ` · ${v.year}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditVehicle(v)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                    >
                      <Edit2 size={14} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Araç silinsin mi?')) deleteVehicle.mutate(v.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
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
