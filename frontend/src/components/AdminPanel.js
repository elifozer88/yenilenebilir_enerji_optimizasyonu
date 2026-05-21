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
  // eslint-disable-next-line no-unused-vars
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
  const [activeTab, setActiveTab] = useState('ahp');
  const [rolePermissions, setRolePermissions] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permError, setPermError] = useState('');
  const [savingRole, setSavingRole] = useState(null);

  const fetchPermissions = useCallback(async () => {
    setPermLoading(true);
    setPermError('');
    try {
      const res = await fetch('/api/auth/permissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Yetkiler alınamadı');
      }
      const data = await res.json();
      setRolePermissions(data);
    } catch (err) {
      setPermError('Yetki bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setPermLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'yetki') {
      fetchPermissions();
    }
  }, [activeTab, fetchPermissions]);

  const handleTogglePermission = async (role, pageKey, currentVal) => {
    setSavingRole(role);
    
    // Find the role's current permissions
    const roleRow = rolePermissions.find(r => r.role === role);
    if (!roleRow) {
      setSavingRole(null);
      return;
    }

    const updatedPermissions = {
      ...roleRow.permissions,
      [pageKey]: !currentVal
    };

    // Optimistic UI update
    setRolePermissions(prev => prev.map(r => 
      r.role === role ? { ...r, permissions: updatedPermissions } : r
    ));

    try {
      const res = await fetch('/api/auth/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: role,
          permissions: updatedPermissions
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Yetki güncellenemedi');
      }
    } catch (err) {
      alert(err.message || 'Yetki kaydedilirken hata oluştu.');
      // Revert UI on error
      setRolePermissions(prev => prev.map(r => 
        r.role === role ? { ...r, permissions: { ...roleRow.permissions, [pageKey]: currentVal } } : r
      ));
    } finally {
      setSavingRole(null);
    }
  };

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

      {/* Sekmeler */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { id: 'ahp', label: 'AHP Kriter Ağırlıkları', icon: '📊' },
            { id: 'yetki', label: 'Yetki Yönetimi', icon: '🔑' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 4px',
                border: 'none',
                background: 'none',
                color: activeTab === tab.id ? 'var(--brand)' : 'var(--muted)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--brand)' : 'transparent'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
        {activeTab === 'ahp' && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
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
        )}

        {activeTab === 'yetki' && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '24px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Kullanıcı Rol Yetki Matrisi</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Sisteme kayıtlı kullanıcı rollerinin erişebileceği sayfaları ve özellikleri belirleyin. Değişiklikler anında kaydedilir ve uygulanır.
                </div>
              </div>

              {permLoading ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 13 }}>
                  <div style={{ width: 24, height: 24, border: '2.5px solid var(--surface-2)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
                  Yetki matrisi yükleniyor...
                </div>
              ) : permError ? (
                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, color: '#EF4444', fontSize: 13 }}>
                  ⚠️ {permError}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'inherit' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', width: '25%' }}>Kullanıcı Rolü</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Atlas Haritası (atlas)</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>İlçe Raporları (raporlar)</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Mevcut Santraller (santraller)</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right', width: '15%' }}>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Admin Row (read-only indicator) */}
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '18px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: '#F59E0B15',
                                color: '#F59E0B',
                                border: '1px solid #F59E0B35',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                Admin
                              </span>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Tüm yetkilere sahip sistem yöneticisi</span>
                          </div>
                        </td>
                        {['atlas', 'raporlar', 'santraller'].map(pageKey => (
                          <td key={pageKey} style={{ padding: '18px 16px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={true}
                              disabled={true}
                              style={{
                                width: 18,
                                height: 18,
                                accentColor: '#F59E0B',
                                opacity: 0.5,
                                cursor: 'not-allowed'
                              }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '18px 16px', textAlign: 'right' }}>
                          <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>Tam Yetkili 🛡️</span>
                        </td>
                      </tr>

                      {rolePermissions
                        .filter(item => item.role !== 'admin')
                        .map(item => {
                          const rName = item.role;
                          const perms = item.permissions || {};
                          const displayNames = {
                            mudur: { label: 'Müdür', desc: 'Birim yöneticisi, rapor ve analiz izleme yetkileri', color: '#A78BFA' },
                            analist: { label: 'Analist', desc: 'Veri analiz personeli, kısıtlı işlem yetkileri', color: '#38BDF8' }
                          };
                          const meta = displayNames[rName] || { label: rName, desc: 'Sistem Rolü', color: '#94A3B8' };

                          return (
                            <tr key={rName} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                              <td style={{ padding: '18px 16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: 999,
                                      background: `${meta.color}15`,
                                      color: meta.color,
                                      border: `1px solid ${meta.color}35`,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em'
                                    }}>
                                      {meta.label}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{meta.desc}</span>
                                </div>
                              </td>
                              {['atlas', 'raporlar', 'santraller'].map(pageKey => {
                                const val = !!perms[pageKey];
                                return (
                                  <td key={pageKey} style={{ padding: '18px 16px', textAlign: 'center' }}>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                                      <input
                                        type="checkbox"
                                        checked={val}
                                        disabled={savingRole === rName}
                                        onChange={() => handleTogglePermission(rName, pageKey, val)}
                                        style={{
                                          width: 18,
                                          height: 18,
                                          accentColor: 'var(--brand)',
                                          cursor: 'pointer'
                                        }}
                                      />
                                    </label>
                                  </td>
                                );
                              })}
                              <td style={{ padding: '18px 16px', textAlign: 'right' }}>
                                {savingRole === rName ? (
                                  <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>Kaydediliyor...</span>
                                ) : (
                                  <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Aktif ✓</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}