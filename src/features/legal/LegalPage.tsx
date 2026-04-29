import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

type LegalType = 'kvkk' | 'acik-riza' | 'gizlilik' | 'kullanim-kosullari'

const TITLES: Record<LegalType, string> = {
  'kvkk': 'KVKK Aydınlatma Metni',
  'acik-riza': 'Açık Rıza Beyanı',
  'gizlilik': 'Gizlilik Politikası',
  'kullanim-kosullari': 'Kullanım Koşulları',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-navy mb-2">{title}</h2>
      <div className="text-sm text-slate-700 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

function KvkkContent() {
  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        SanayiX platformu ("Platform"), kullanıcıların araç arızalarına çözüm bulmalarını sağlamak amacıyla hizmet sunan bir aracı platformdur. Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında aşağıda belirtilen esaslara uygun olarak işlenmektedir.
      </p>

      <Section title="1. Veri Sorumlusu">
        <p>KVKK kapsamında veri sorumlusu:</p>
        <p><strong>SanayiX – Mücteba Kalkan</strong></p>
        <p>İletişim: <a href="mailto:iletisim@sanayix.com" className="text-navy underline">iletisim@sanayix.com</a></p>
      </Section>

      <Section title="2. İşlenen Kişisel Veriler">
        <p>Platform kapsamında aşağıdaki kişisel veriler işlenebilir:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Kimlik Bilgileri:</strong> Ad, soyad</li>
          <li><strong>İletişim Bilgileri:</strong> Telefon numarası, e-posta adresi</li>
          <li><strong>Konum Bilgisi:</strong> Kullanıcının paylaştığı lokasyon verisi</li>
          <li><strong>Araç Bilgileri:</strong> Marka, model, arıza detayları</li>
          <li><strong>Kullanım Verileri:</strong> Uygulama içi işlem kayıtları, log verileri</li>
        </ul>
      </Section>

      <Section title="3. Kişisel Verilerin İşlenme Amaçları">
        <p>Toplanan kişisel verileriniz:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kullanıcı ile uygun ustanın eşleştirilmesi</li>
          <li>Arıza taleplerinin oluşturulması ve yönetilmesi</li>
          <li>Kullanıcı deneyiminin geliştirilmesi</li>
          <li>Hizmet kalitesinin artırılması</li>
          <li>Platform güvenliğinin sağlanması ve kötüye kullanımın önlenmesi</li>
        </ul>
        <p>amaçlarıyla işlenmektedir.</p>
      </Section>

      <Section title="4. Kişisel Verilerin Aktarılması">
        <p>Kişisel verileriniz aşağıdaki taraflarla paylaşılabilir:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Hizmet sağlayıcı ustalar (işin gerçekleştirilmesi amacıyla)</li>
          <li>Teknik altyapı sağlayıcıları (örn. Google Firebase)</li>
          <li>Yasal yükümlülükler kapsamında yetkili kamu kurumları</li>
        </ul>
      </Section>

      <Section title="5. Hukuki Sebepler">
        <p>Kişisel verileriniz aşağıdaki hukuki sebeplere dayanarak işlenir:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Açık rızanızın bulunması</li>
          <li>Bir sözleşmenin kurulması veya ifası</li>
          <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
        </ul>
      </Section>

      <Section title="6. Veri Saklama Süresi">
        <p>Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca saklanır ve ilgili süre sonunda silinir, yok edilir veya anonim hale getirilir.</p>
      </Section>

      <Section title="7. KVKK Kapsamındaki Haklarınız">
        <p>KVKK'nın 11. maddesi kapsamında:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse bilgi talep etme</li>
          <li>Düzeltme talep etme</li>
          <li>Silinmesini isteme</li>
          <li>İşlemenin sınırlandırılmasını talep etme</li>
        </ul>
        <p className="mt-2">Taleplerinizi: <a href="mailto:iletisim@sanayix.com" className="text-navy underline">iletisim@sanayix.com</a> adresine iletebilirsiniz.</p>
      </Section>
    </>
  )
}

function AcikRizaContent() {
  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        SanayiX uygulaması kapsamında sunulan hizmetlerden yararlanabilmek için aşağıdaki konularda açık rızanızın alınması gerekmektedir.
      </p>

      <Section title="Açık Rıza Kapsamı">
        <p>SanayiX uygulaması kapsamında:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kişisel verilerimin işlenmesini</li>
          <li>Ustalar ile paylaşılmasını</li>
          <li>Konum bilgilerimin kullanılmasını</li>
        </ul>
        <p className="mt-2">özgür irademle kabul ettiğimi beyan ederim.</p>
      </Section>

      <Section title="Geri Alma Hakkı">
        <p>
          Açık rızanızı her zaman geri alabilirsiniz. Rıza geri alımı, geri almadan önce gerçekleştirilen işlemlerin hukuki geçerliliğini etkilemez.
          Talebinizi <a href="mailto:iletisim@sanayix.com" className="text-navy underline">iletisim@sanayix.com</a> adresine iletebilirsiniz.
        </p>
      </Section>
    </>
  )
}

function GizlilikContent() {
  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        SanayiX, kullanıcı gizliliğini korumayı temel ilke olarak benimser.
      </p>

      <Section title="Veri Kullanımı">
        <ul className="list-disc pl-5 space-y-1">
          <li>Kullanıcı verileri yalnızca hizmet sunmak amacıyla işlenir</li>
          <li>Veriler üçüncü kişilerle izinsiz paylaşılmaz</li>
          <li>Teknik altyapı kapsamında güvenli sunucular kullanılır</li>
          <li>Kullanıcı talebi halinde veriler silinebilir</li>
        </ul>
        <p className="mt-2">SanayiX, kullanıcı verilerini ticari amaçlarla satmaz veya izinsiz kullanmaz.</p>
      </Section>

      <Section title="Çerezler">
        <p>Platform, kullanıcı deneyimini iyileştirmek amacıyla oturum çerezleri kullanmaktadır. Bu çerezler kişisel veri içermez ve yalnızca teknik amaçlarla kullanılır.</p>
      </Section>

      <Section title="Üçüncü Taraf Hizmetler">
        <p>Platform, Supabase altyapısını kullanmaktadır. Bu hizmetlerin gizlilik politikaları kendi web sitelerinde mevcuttur.</p>
      </Section>

      <Section title="İletişim">
        <p>Gizlilik konularında: <a href="mailto:iletisim@sanayix.com" className="text-navy underline">iletisim@sanayix.com</a></p>
      </Section>
    </>
  )
}

function KullanimKosullariContent() {
  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        SanayiX platformunu kullanmadan önce aşağıdaki kullanım koşullarını dikkatlice okuyunuz.
      </p>

      <Section title="Kullanıcı Yükümlülükleri">
        <ul className="list-disc pl-5 space-y-1">
          <li>Kullanıcılar doğru ve güncel bilgi vermekle yükümlüdür</li>
          <li>Platform kötüye kullanılamaz</li>
          <li>SanayiX, gerekli gördüğü durumlarda kullanıcı hesaplarını askıya alabilir</li>
          <li>Platformda sunulan hizmetler garanti kapsamında değildir</li>
        </ul>
      </Section>

      <Section title="Sorumluluk Reddi">
        <p>SanayiX bir hizmet sağlayıcı değil, <strong>aracı platformdur</strong>.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Platform üzerinden sunulan hizmetler bağımsız ustalar tarafından sağlanır</li>
          <li>SanayiX, hizmetin kalitesi, sonucu veya fiyatlandırmasından sorumlu değildir</li>
          <li>Kullanıcı ile usta arasındaki ilişki doğrudan taraflar arasındadır</li>
        </ul>
      </Section>

      <Section title="Değişiklikler">
        <p>SanayiX, kullanım koşullarını önceden bildirim yapmaksızın değiştirme hakkını saklı tutar. Güncel koşullar her zaman platform üzerinden erişilebilir olacaktır.</p>
      </Section>

      <Section title="İletişim">
        <p>Sorularınız için: <a href="mailto:iletisim@sanayix.com" className="text-navy underline">iletisim@sanayix.com</a></p>
      </Section>
    </>
  )
}

const CONTENT: Record<LegalType, React.ReactNode> = {
  'kvkk': <KvkkContent />,
  'acik-riza': <AcikRizaContent />,
  'gizlilik': <GizlilikContent />,
  'kullanim-kosullari': <KullanimKosullariContent />,
}

export function LegalPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const legalType = type as LegalType

  if (!TITLES[legalType]) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-slate-500 mb-4">Sayfa bulunamadı.</p>
          <button onClick={() => navigate(-1)} className="text-navy font-semibold text-sm hover:underline">
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-5 h-5 bg-navy rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">SanayiX</span>
          </div>
          <h2 className="font-bold text-slate-800 text-sm leading-tight">{TITLES[legalType]}</h2>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        {/* İçerik */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {CONTENT[legalType]}
        </div>

        {/* Diğer belgeler */}
        <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 mb-3">Diğer Belgeler</p>
          <div className="space-y-1">
            {(Object.entries(TITLES) as [LegalType, string][])
              .filter(([key]) => key !== legalType)
              .map(([key, title]) => (
                <Link
                  key={key}
                  to={`/legal/${key}`}
                  className="block text-sm text-navy hover:underline py-1"
                >
                  → {title}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
