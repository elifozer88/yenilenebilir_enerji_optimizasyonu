import { useState, useEffect, useCallback } from 'react';

export default function AdminPanel({ token, user, onBack }) {
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
    fetchPermissions();
  }, [fetchPermissions]);

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

      <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
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
      </div>
    </div>
  );
}