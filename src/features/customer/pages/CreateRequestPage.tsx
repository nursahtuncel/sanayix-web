import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'
import { ChevronLeft, ChevronRight, Check, Upload, X } from 'lucide-react'
import { cn } from '@/shared/components/cn'

// ─── Şema ───────────────────────────────────────────────
const detailSchema = z.object({
  title: z.string().min(5, 'En az 5 karakter girin'),
  description: z.string().min(10, 'En az 10 karakter girin'),
  urgency: z.enum(['normal', 'urgent']),
  budget_min: z.coerce.number().min(1, 'Bütçe girin'),
  budget_max: z.coerce.number().min(1, 'Bütçe girin'),
  address_text: z.string().min(5, 'Adres girin'),
})

type DetailForm = z.infer<typeof detailSchema>

// ─── Adım göstergesi ───────────────────────────────────
const STEPS = ['Kategori', 'Detaylar', 'Araç', 'Fotoğraf']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                done ? 'bg-green-500 text-white' :
                active ? 'bg-navy text-white' :
                'bg-slate-200 text-slate-400'
              )}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span className={cn(
                'text-xs mt-1 font-medium hidden sm:block',
                active ? 'text-navy' : done ? 'text-green-600' : 'text-slate-400'
              )}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-1 mb-5',
                done ? 'bg-green-400' : 'bg-slate-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Ana bileşen ───────────────────────────────────────
export function CreateRequestPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState(0)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<DetailForm, unknown, DetailForm>({
    resolver: zodResolver(detailSchema) as unknown as import('react-hook-form').Resolver<DetailForm>,
    defaultValues: { urgency: 'normal' },
  })

  // Kategoriler
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*')
      return data ?? []
    },
  })

  // Araçlar
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', user!.id)
      return data ?? []
    },
    enabled: !!user,
  })

  // Talep oluşturma mutasyonu
  const createRequest = useMutation({
    mutationFn: async (formData: DetailForm) => {
      let photoUrls: string[] = []

      // Fotoğrafları yükle
      if (photos.length > 0) {
        setUploadingPhotos(true)
        const uploads = await Promise.all(
          photos.map(async (file) => {
            const ext = file.name.split('.').pop()
            const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const { error } = await supabase.storage
              .from('request-photos')
              .upload(path, file)
            if (error) return null
            const { data } = supabase.storage.from('request-photos').getPublicUrl(path)
            return data.publicUrl
          })
        )
        photoUrls = uploads.filter(Boolean) as string[]
        setUploadingPhotos(false)
      }

      const { data, error } = await supabase
        .from('service_requests')
        .insert({
          customer_id: user!.id,
          category_id: selectedCategoryId,
          title: formData.title,
          description: formData.description,
          urgency: formData.urgency,
          budget_min: formData.budget_min,
          budget_max: formData.budget_max,
          address: { text: formData.address_text },
          vehicle_id: selectedVehicleId,
          photos: photoUrls,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      navigate(`/requests/${data.id}`)
    },
  })

  // Fotoğraf ekleme
  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setPhotos((prev) => [...prev, ...newFiles].slice(0, 5))
  }

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  // ─── Adım 1: Kategori Seçimi ─────────────────────────
  const Step1 = () => (
    <div>
      <h3 className="text-lg font-semibold text-navy mb-1">Kategori Seçin</h3>
      <p className="text-slate-500 text-sm mb-6">Hangi konuda yardım lazım?</p>
      <div className="grid grid-cols-2 gap-3">
        {(categories ?? []).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              selectedCategoryId === cat.id
                ? 'border-navy bg-navy/5 text-navy font-semibold'
                : 'border-slate-200 text-slate-700 hover:border-slate-300'
            )}
          >
            <span className="text-sm">{cat.name}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setStep(1)}
        disabled={!selectedCategoryId}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-navy text-white font-semibold py-3 rounded-xl disabled:opacity-40 hover:bg-navy-700 transition"
      >
        Devam Et <ChevronRight size={18} />
      </button>
    </div>
  )

  // ─── Adım 2: Detaylar ────────────────────────────────
  const Step2 = () => (
    <div>
      <h3 className="text-lg font-semibold text-navy mb-1">Detayları Girin</h3>
      <p className="text-slate-500 text-sm mb-6">Ustanın seni anlayabilmesi için net bilgi ver</p>

      <div className="space-y-4">
        {/* Başlık */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Başlık</label>
          <input
            {...register('title')}
            placeholder="ör. Ön fren balataları değişimi"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Sorun nedir? Ne zamandır var? Araç ne durumda?"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition resize-none"
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>

        {/* Aciliyet */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Aciliyet</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'normal', label: 'Normal', desc: 'Birkaç gün içinde' },
              { value: 'urgent', label: 'Acil', desc: 'Bugün / yarın' },
            ].map(({ value, label, desc }) => (
              <label
                key={value}
                className={cn(
                  'flex flex-col p-3 rounded-xl border-2 cursor-pointer transition',
                  watch('urgency') === value
                    ? 'border-navy bg-navy/5'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <input {...register('urgency')} type="radio" value={value} className="sr-only" />
                <span className="font-medium text-sm text-slate-800">{label}</span>
                <span className="text-xs text-slate-500">{desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Bütçe */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Bütçe Aralığı (₺)</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                {...register('budget_min')}
                type="number"
                placeholder="Min"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
              />
              {errors.budget_min && <p className="text-red-500 text-xs mt-1">{errors.budget_min.message}</p>}
            </div>
            <div>
              <input
                {...register('budget_max')}
                type="number"
                placeholder="Max"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
              />
              {errors.budget_max && <p className="text-red-500 text-xs mt-1">{errors.budget_max.message}</p>}
            </div>
          </div>
        </div>

        {/* Adres */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
          <input
            {...register('address_text')}
            placeholder="ör. Kadıköy, İstanbul"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
          />
          {errors.address_text && <p className="text-red-500 text-xs mt-1">{errors.address_text.message}</p>}
        </div>
      </div>
    </div>
  )

  // ─── Adım 3: Araç Seçimi ────────────────────────────
  const Step3 = () => (
    <div>
      <h3 className="text-lg font-semibold text-navy mb-1">Araç Seçin</h3>
      <p className="text-slate-500 text-sm mb-6">Hangi araç için talep oluşturuyorsun?</p>

      <div className="space-y-3">
        {/* Araç yok seçeneği */}
        <button
          onClick={() => setSelectedVehicleId(null)}
          className={cn(
            'w-full p-4 rounded-xl border-2 text-left transition-all',
            selectedVehicleId === null
              ? 'border-navy bg-navy/5'
              : 'border-slate-200 hover:border-slate-300'
          )}
        >
          <p className="font-medium text-sm text-slate-800">Araç belirtmek istemiyorum</p>
          <p className="text-xs text-slate-500 mt-0.5">Genel hizmet talebi</p>
        </button>

        {/* Kayıtlı araçlar */}
        {(vehicles ?? []).map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicleId(v.id)}
            className={cn(
              'w-full p-4 rounded-xl border-2 text-left transition-all',
              selectedVehicleId === v.id
                ? 'border-navy bg-navy/5'
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <p className="font-medium text-sm text-slate-800">{v.brand} {v.model}</p>
            <p className="text-xs text-slate-500 mt-0.5">{v.plate} {v.year ? `· ${v.year}` : ''}</p>
          </button>
        ))}

        {(vehicles ?? []).length === 0 && (
          <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-500">
            Kayıtlı araç yok. Araç eklemek için profil sayfasını kullan.
          </div>
        )}
      </div>
    </div>
  )

  // ─── Adım 4: Fotoğraflar ────────────────────────────
  const Step4 = () => (
    <div>
      <h3 className="text-lg font-semibold text-navy mb-1">Fotoğraf Ekle</h3>
      <p className="text-slate-500 text-sm mb-6">Sorunun fotoğrafı ustanın teklif vermesine yardımcı olur (opsiyonel, maks. 5)</p>

      {/* Yükleme alanı */}
      <label className="block cursor-pointer">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-navy hover:bg-navy/5 transition">
          <Upload size={32} className="text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">Fotoğraf seç veya sürükle bırak</p>
          <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP · Maks. 5 fotoğraf</p>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => addPhotos(e.target.files)}
        />
      </label>

      {/* Seçilen fotoğraflar */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {photos.map((file, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ─── Form submit (adım 2'de validasyon) ─────────────
  const onStep2Next = handleSubmit(() => setStep(2))

  const onFinalSubmit = handleSubmit((data) => {
    createRequest.mutate(data)
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => step === 0 ? navigate(-1) : setStep((s) => s - 1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>
        <h2 className="font-semibold text-slate-800">Yeni Talep Oluştur</h2>
      </div>

      <div className="max-w-lg mx-auto p-4 md:p-6">
        <StepBar current={step} />

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          {step === 0 && <Step1 />}
          {step === 1 && (
            <div>
              <Step2 />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition"
                >
                  Geri
                </button>
                <button
                  onClick={onStep2Next}
                  className="flex-1 flex items-center justify-center gap-2 bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navy-700 transition"
                >
                  Devam Et <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <Step3 />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition"
                >
                  Geri
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navy-700 transition"
                >
                  Devam Et <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <Step4 />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition"
                >
                  Geri
                </button>
                <button
                  onClick={onFinalSubmit}
                  disabled={createRequest.isPending || uploadingPhotos}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent text-navy font-bold py-3 rounded-xl hover:bg-accent/90 transition disabled:opacity-60"
                >
                  {createRequest.isPending || uploadingPhotos ? (
                    <>
                      <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Talebi Gönder
                    </>
                  )}
                </button>
              </div>

              {createRequest.isError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                  Bir hata oluştu. Lütfen tekrar dene.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
