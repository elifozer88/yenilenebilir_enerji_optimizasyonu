import { useState, useEffect, useCallback } from 'react';

const KRITER_ADI = {
  solar:'Solar Radyasyon', ruzgar:'Rüzgâr Hızı', egim:'Eğim',
  baki:'Bakı', yukseklik:'Yükseklik', arazi:'Arazi Kullanımı',
  yerlesim:'Yerleşim', yol:'Yola Yakınlık', akarsu:'Akarsu',
  enerji:'ENH Yakınlığı', fay:'Fay Uzaklığı',
};
const KRITER_RENK = {
  solar:'#F59E0B', ruzgar:'#38BDF8', egim:'#10B981', baki:'#A78BFA',
  yukseklik:'#FDE68A', arazi:'#60A5FA', yerlesim:'#F472B6',
  yol:'#34D399', akarsu:'#67E8F9', enerji:'#FB923C', fay:'#94A3B8',
};

function AhpKart({ enerji, token }) {
  const [agirliklar, setAgirliklar] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [mesaj, setMesaj]           = useState(null);
  const [cr, setCr]                 = useState(0);
  const [hesaplandi, setHesaplandi] = useState(false);
  const color = enerji === 'GES' ? '#F59E0B' : '#38BDF8';

  const yukle = useCallback(() => {
    setLoading(true);
    fetch(`/api/ahp/agirliklar?enerji_tipi=${enerji}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setAgirliklar(d.agirliklar.map(a => ({ ...a, yeni: a.agirlik })));
        setCr(d.cr_tahmini || 0);
      }).finally(() => setLoading(false));
  }, [enerji]);

  useEffect(() => { yukle(); }, [yukle]);

  const handleChange = (kod, val) => {
    const updated = agirliklar.map(a =>
      a.kriter_kod === kod ? { ...a, yeni: parseFloat(val) || 0 } : a
    );
    const toplam = updated.reduce((s, a) => s + a.yeni, 0);
    setCr(toplam > 0 ? Math.abs((toplam - 1) * 0.3) : 0);
    setAgirliklar(updated);
    setHesaplandi(false);
  };

  const normalize = () => {
    const toplam = agirliklar.reduce((s, a) => s + a.yeni, 0);
    if (!toplam) return;
    setAgirliklar(agirliklar.map(a => ({ ...a, yeni: Math.round((a.yeni / toplam) * 10000) / 10000 })));
    setCr(0);
    setMesaj({ tip: 'bilgi', metin: 'Normalize edildi (toplam = 1.00)' });
  };

  const kaydet = async () => {
    setSaving(true); setMesaj(null); setHesaplandi(false);
    try {
      const res = await fetch('/api/ahp/agirliklar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ enerji_tipi: enerji, agirliklar: agirliklar.map(a => ({ kriter_kod: a.kriter_kod, agirlik: a.yeni })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMesaj({ tip: 'hata', metin: data.detail || 'Kayıt başarısız' });
      } else {
        setMesaj({ tip: 'basari', metin: `✓ ${data.guncellenen_ilce || 0} ilçe yeniden hesaplandı` });
        setHesaplandi(true);
        yukle();
      }
    } catch { setMesaj({ tip: 'hata', metin: 'Bağlantı hatası' }); }
    finally { setSaving(false); }
  };

  const sifirla = async () => {
    if (!window.confirm('Varsayılan ağırlıklara sıfırlanacak?')) return;
    await fetch(`/api/ahp/sifirla?enerji_tipi=${enerji}`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
    });
    yukle();
    setHesaplandi(false);
    setMesaj({ tip: 'bilgi', metin: 'Varsayılana sıfırlandı' });
  };

  const toplam = agirliklar.reduce((s, a) => s + (a.yeni || 0), 0);
  const crRenk = cr > 0.10 ? '#EF4444' : cr > 0.07 ? '#F59E0B' : '#10B981';
  const toplamOk = Math.abs(toplam - 1) < 0.01;

  return (
    <div style={{
      background: 'var(--card)', borderRadius: 16,
      border: `1px solid ${color}25`,
      borderTop: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Kart başlık */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
            {enerji === 'GES' ? '☀' : '💨'} {enerji} Ağırlıkları
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            {enerji === 'GES' ? 'Güneş Enerjisi Santrali' : 'Rüzgâr Enerjisi Santrali'} kriterleri
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${crRenk}18`, color: crRenk, border: `1px solid ${crRenk}30` }}>
            CR ≈ {cr.toFixed(3)} {cr <= 0.10 ? '✓' : '⚠'}
          </div>
          <div style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: toplamOk ? '#10B98118' : '#EF444418', color: toplamOk ? '#10B981' : '#EF4444', border: `1px solid ${toplamOk ? '#10B981' : '#EF4444'}30` }}>
            Σ = {toplam.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Slider'lar */}
      <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Yükleniyor…</div>
        ) : agirliklar.map(a => {
          const renk = KRITER_RENK[a.kriter_kod] || color;
          const yuzde = toplam > 0 ? Math.round((a.yeni / toplam) * 100) : 0;
          return (
            <div key={a.kriter_kod} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: renk }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{KRITER_ADI[a.kriter_kod] || a.kriter_kod}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', minWidth: 28, textAlign: 'right' }}>{yuzde}%</span>
                  <input type="number" min="0" max="100" step="1"
                    value={Math.round(a.yeni * 100)}
                    onChange={e => handleChange(a.kriter_kod, parseFloat(e.target.value) / 100)}
                    style={{ width: 52, padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 11, fontFamily: 'JetBrains Mono,monospace', textAlign: 'right' }}
                  />
                </div>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={a.yeni}
                onChange={e => handleChange(a.kriter_kod, e.target.value)}
                style={{ width: '100%', accentColor: renk, cursor: 'pointer' }}
              />
            </div>
          );
        })}
      </div>

      {/* Mesaj */}
      {mesaj && (
        <div style={{ margin: '0 20px', padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: mesaj.tip === 'basari' ? '#10B98118' : mesaj.tip === 'hata' ? '#EF444418' : '#38BDF818', color: mesaj.tip === 'basari' ? '#10B981' : mesaj.tip === 'hata' ? '#EF4444' : '#38BDF8', border: `1px solid ${mesaj.tip === 'basari' ? '#10B981' : mesaj.tip === 'hata' ? '#EF4444' : '#38BDF8'}30` }}>
          {mesaj.metin}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={sifirla} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}>↺ Sıfırla</button>
        <button onClick={normalize} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>⊕ Normalize</button>
        <button onClick={kaydet} disabled={saving || cr > 0.10}
          style={{ padding: '7px 18px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: cr > 0.10 ? 'var(--surface-2)' : color, border: 'none', color: cr > 0.10 ? 'var(--muted)' : '#000', cursor: cr > 0.10 ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Hesaplanıyor…' : '✓ Kaydet & Hesapla'}
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel({ token, user, onBack }) {
  const [kullanicilar, setKullanicilar] = useState([]);

  useEffect(() => {
    // Kullanıcı listesi (ileride genişletilebilir)
  }, []);

  return (
    <div style={{ fontFamily: "'Manrope',sans-serif", minHeight: 'calc(100vh - var(--nav-h))', background: 'var(--bg)', overflowY: 'auto' }}>

      {/* Başlık */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚙</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Admin Paneli</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>YE·ATLAS Sistem Yönetimi · {user?.ad_soyad}</div>
            </div>
          </div>
        </div>
        <button onClick={onBack} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Geri Dön
        </button>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>

        {/* Bilgi bandı */}
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-2)' }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <span>Ağırlıkları değiştirip <strong>Kaydet & Hesapla</strong>'ya tıkladığında tüm 28 ilçenin AHP skoru anında yeniden hesaplanır ve haritaya yansır. CR &lt; 0.10 olması gerekir.</span>
        </div>

        {/* AHP Editörler — yan yana */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <AhpKart enerji="GES" token={token} />
          <AhpKart enerji="RES" token={token} />
        </div>

        {/* Sistem bilgisi */}
        <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Sistem Bilgisi</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Veritabanı', val: 'PostgreSQL 16 + PostGIS', icon: '🗄' },
              { label: 'Çözünürlük', val: '100m · EPSG:32635', icon: '📐' },
              { label: 'Metodoloji', val: 'Saaty AHP · CR < 0.10', icon: '📊' },
              { label: 'Veri Kaynakları', val: 'GSA · GWA · OSM · MTA', icon: '🌍' },
            ].map(({ label, val, icon }) => (
              <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}