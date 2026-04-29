import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/core/supabase/client'

const schema = z.object({
  full_name: z.string().min(2, 'Ad soyad en az 2 karakter'),
  email: z.string().email('Geçerli e-posta girin'),
  phone: z.string().min(10, 'Telefon numarasını girin'),
  company_name: z.string().optional(),
  tax_id: z.string().optional(),
  password: z.string().min(6, 'Şifre en az 6 karakter'),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: 'Şifreler eşleşmiyor',
  path: ['password_confirm'],
})

type FormData = z.infer<typeof schema>

export function RegisterProPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: 'professional',
          full_name: data.full_name,
          phone: data.phone,
        },
      },
    })
    setLoading(false)
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setError('Bu e-posta adresi zaten kayıtlı.')
      } else {
        setError(error.message)
      }
      return
    }
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4">
            <span className="text-navy font-bold text-2xl">S</span>
          </div>
          <h1 className="text-white text-3xl font-bold">Usta Kaydı</h1>
          <p className="text-white/60 mt-1 text-sm">Müşterilerine ulaş, daha fazla iş al</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-amber-700 text-sm">
            Kayıt sonrası hesabın incelemeye alınacak. Onaylandıktan sonra iş almaya başlayabilirsin.
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { name: 'full_name', label: 'Ad Soyad', type: 'text', placeholder: 'Mehmet Usta' },
              { name: 'email', label: 'E-posta', type: 'email', placeholder: 'ornek@email.com' },
              { name: 'phone', label: 'Telefon', type: 'tel', placeholder: '05xx xxx xx xx' },
              { name: 'company_name', label: 'Firma Adı (opsiyonel)', type: 'text', placeholder: 'Usta Tamircilik' },
              { name: 'tax_id', label: 'Vergi No (opsiyonel)', type: 'text', placeholder: '1234567890' },
              { name: 'password', label: 'Şifre', type: 'password', placeholder: '••••••••' },
              { name: 'password_confirm', label: 'Şifre Tekrar', type: 'password', placeholder: '••••••••' },
            ].map(({ name, label, type, placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input
                  {...register(name as keyof FormData)}
                  type={type}
                  placeholder={placeholder}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition"
                />
                {errors[name as keyof FormData] && (
                  <p className="text-red-500 text-xs mt-1">{errors[name as keyof FormData]?.message}</p>
                )}
              </div>
            ))}

            {/* Onay */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-navy shrink-0"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                <Link to="/legal/kvkk" target="_blank" className="text-navy font-semibold hover:underline">KVKK Aydınlatma Metni</Link>
                'ni,{' '}
                <Link to="/legal/acik-riza" target="_blank" className="text-navy font-semibold hover:underline">Açık Rıza Beyanı</Link>
                'nı,{' '}
                <Link to="/legal/gizlilik" target="_blank" className="text-navy font-semibold hover:underline">Gizlilik Politikası</Link>
                'nı ve{' '}
                <Link to="/legal/kullanim-kosullari" target="_blank" className="text-navy font-semibold hover:underline">Kullanım Koşulları</Link>
                'nı okudum, kabul ediyorum.
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navy-700 transition disabled:opacity-60"
            >
              {loading ? 'Kaydediliyor...' : 'Usta Olarak Kayıt Ol'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Hesabın var mı?{' '}
            <Link to="/login" className="text-navy font-semibold hover:underline">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
