import { useState, useEffect, useCallback } from 'react';

const KRITER_ADI = {
  solar: 'Solar Radyasyon', ruzgar: 'Rüzgâr Hızı', egim: 'Eğim',
  baki: 'Bakı', yukseklik: 'Yükseklik', arazi: 'Arazi Kullanımı',
  yerlesim: 'Yerleşim', yol: 'Yola Yakınlık', akarsu: 'Akarsu',
  enerji: 'ENH Yakınlığı', fay: 'Fay Uzaklığı',
};

const KRITER_RENK = {
  solar: '#F59E0B', ruzgar: '#38BDF8', egim: '#10B981',
  baki: '#A78BFA', yukseklik: '#FDE68A', arazi: '#60A5FA',
  yerlesim: '#F472B6', yol: '#34D399', akarsu: '#67E8F9',
  enerji: '#FB923C', fay: '#94A3B8',
};

export default function AhpEditor({ energyType = 'GES', token, onClose }) {
  const [agirliklar, setAgirliklar] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [mesaj, setMesaj]           = useState(null);
  const [cr, setCr]                 = useState(0);

  // Ağırlıkları yükle
  const yukle = useCallback(() => {
    setLoading(true);
    fetch(`/api/ahp/agirliklar?enerji_tipi=${energyType}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setAgirliklar(d.agirliklar.map(a => ({ ...a, yeni: a.agirlik })));
        setCr(d.cr_tahmini || 0);
      })
      .finally(() => setLoading(false));
  }, [energyType]);

  useEffect(() => { yukle(); }, [yukle]);

  // Slider değişince toplam 1'e göre yüzde hesapla
  const handleChange = (kod, yeniDeger) => {
    const updated = agirliklar.map(a =>
      a.kriter_kod === kod ? { ...a, yeni: parseFloat(yeniDeger) } : a
    );
    const toplam = updated.reduce((s, a) => s + a.yeni, 0);
    setCr(toplam > 0 ? Math.abs((toplam - 1) * 0.3) : 0); // basit CR tahmini
    setAgirliklar(updated);
  };

  // Normalize et → toplamı 1 yap
  const normalize = () => {
    const toplam = agirliklar.reduce((s, a) => s + a.yeni, 0);
    if (toplam <= 0) return;
    setAgirliklar(agirliklar.map(a => ({
      ...a,
      yeni: Math.round((a.yeni / toplam) * 10000) / 10000,
    })));
    setCr(0);
    setMesaj({ tip: 'bilgi', metin: 'Ağırlıklar normalize edildi (toplam = 1.00)' });
  };

  // Kaydet
  const kaydet = async () => {
    setSaving(true);
    setMesaj(null);
    try {
      const res = await fetch('/api/ahp/agirliklar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          enerji_tipi: energyType,
          agirliklar: agirliklar.map(a => ({
            kriter_kod: a.kriter_kod,
            agirlik: a.yeni,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMesaj({ tip: 'hata', metin: data.detail || 'Kayıt başarısız' });
      } else {
        setMesaj({ tip: 'basari', metin: `✓ Kaydedildi · CR: ${data.cr?.toFixed(3)}` });
        yukle();
        setTimeout(() => onClose(), 1500); // 1.5 sn sonra kapat
      }
    } catch {
      setMesaj({ tip: 'hata', metin: 'Bağlantı hatası' });
    } finally {
      setSaving(false);
    }
  };

  // Sıfırla
  const sifirla = async () => {
    if (!window.confirm('Varsayılan ağırlıklara sıfırlanacak. Emin misiniz?')) return;
    await fetch(`/api/ahp/sifirla?enerji_tipi=${energyType}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    yukle();
    setMesaj({ tip: 'bilgi', metin: 'Varsayılan ağırlıklara sıfırlandı' });
  };

  const toplam = agirliklar.reduce((s, a) => s + (a.yeni || 0), 0);
  const crRenk = cr > 0.10 ? '#EF4444' : cr > 0.07 ? '#F59E0B' : '#10B981';
  const color  = energyType === 'GES' ? '#F59E0B' : '#38BDF8';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(4,8,18,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Manrope',sans-serif",
      padding: '20px',
    }}>
      <div style={{
        width: 560, maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--card)', borderRadius: 16,
        border: `1px solid ${color}30`,
        borderTop: `3px solid ${color}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Başlık */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'var(--card)', zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
              AHP Ağırlık Editörü
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {energyType === 'GES' ? '☀ Güneş Enerjisi' : '💨 Rüzgâr Enerjisi'} · Admin Paneli
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* CR Göstergesi */}
            <div style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: `${crRenk}18`, color: crRenk,
              border: `1px solid ${crRenk}40`,
            }}>
              CR ≈ {cr.toFixed(3)} {cr <= 0.10 ? '✓' : '⚠'}
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(248,113,113,0.15)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: '#F87171', cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, flexShrink: 0,
            }}>×</button>
          </div>
        </div>

        {/* İçerik */}
        <div style={{ padding: '16px 24px' }}>

          {/* Uyarı bandı */}
          <div style={{
            padding: '8px 12px', borderRadius: 8, marginBottom: 16,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            fontSize: 11, color: 'var(--muted)', lineHeight: 1.5,
          }}>
            💡 Slider'ları kaydırdıktan sonra <strong>Normalize</strong> butonuna tıklayın, toplam otomatik 1.00'e getirilir. CR &lt; 0.10 olduğunda kayıt aktif olur.
          </div>

          {/* Toplam göstergesi */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14, padding: '8px 12px', borderRadius: 8,
            background: Math.abs(toplam - 1) < 0.01 ? '#10B98118' : '#EF444418',
            border: `1px solid ${Math.abs(toplam - 1) < 0.01 ? '#10B981' : '#EF4444'}40`,
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Toplam ağırlık</span>
            <span style={{
              fontSize: 13, fontWeight: 800,
              color: Math.abs(toplam - 1) < 0.01 ? '#10B981' : '#EF4444',
              fontFamily: 'JetBrains Mono,monospace',
            }}>
              {toplam.toFixed(4)}
            </span>
          </div>

          {/* Kriter Slider'ları */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
              Yükleniyor…
            </div>
          ) : (
            agirliklar.map(a => {
              const renk = KRITER_RENK[a.kriter_kod] || color;
              const yuzde = toplam > 0 ? Math.round((a.yeni / toplam) * 100) : 0;
              return (
                <div key={a.kriter_kod} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: renk }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                        {KRITER_ADI[a.kriter_kod] || a.kriter_kod}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{yuzde}%</span>
                      <input
                        type="number"
                        min="0" max="1" step="0.01"
                        value={a.yeni}
                        onChange={e => handleChange(a.kriter_kod, e.target.value)}
                        style={{
                          width: 60, padding: '3px 6px', borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'var(--surface-2)', color: 'var(--text)',
                          fontSize: 11, fontFamily: 'JetBrains Mono,monospace',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={a.yeni}
                    onChange={e => handleChange(a.kriter_kod, e.target.value)}
                    style={{ width: '100%', accentColor: renk, cursor: 'pointer' }}
                  />
                </div>
              );
            })
          )}

          {/* Mesaj */}
          {mesaj && (
            <div style={{
              padding: '9px 12px', borderRadius: 8, marginTop: 12,
              fontSize: 12, fontWeight: 600,
              background: mesaj.tip === 'basari' ? '#10B98118' : mesaj.tip === 'hata' ? '#EF444418' : '#38BDF818',
              color: mesaj.tip === 'basari' ? '#10B981' : mesaj.tip === 'hata' ? '#EF4444' : '#38BDF8',
              border: `1px solid ${mesaj.tip === 'basari' ? '#10B981' : mesaj.tip === 'hata' ? '#EF4444' : '#38BDF8'}30`,
            }}>
              {mesaj.tip === 'basari' ? '✓' : mesaj.tip === 'hata' ? '✕' : 'ℹ'} {mesaj.metin}
            </div>
          )}
        </div>

        {/* Footer butonlar */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          position: 'sticky', bottom: 0, background: 'var(--card)',
        }}>
          <button onClick={sifirla} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', cursor: 'pointer',
          }}>
            ↺ Varsayılana Sıfırla
          </button>
          <button onClick={normalize} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer',
          }}>
            ⊕ Normalize Et
          </button>
          <button
            onClick={kaydet}
            disabled={saving || cr > 0.10}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: cr > 0.10 ? 'var(--surface-2)' : color,
              border: 'none', color: cr > 0.10 ? 'var(--muted)' : '#000',
              cursor: cr > 0.10 ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Kaydediliyor…' : '✓ Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}