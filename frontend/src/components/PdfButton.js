/**
 * components/PdfButton.js
 * İlçe analiz raporunu PDF olarak indirir
 */
import { useState } from 'react';

export default function PdfButton({ ilceAdi, energyType = 'GES', style = {} }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const download = async () => {
    if (!ilceAdi || loading) return;
    setLoading(true);
    setError('');
    try {
      const url = `/api/rapor/pdf/${encodeURIComponent(ilceAdi)}?enerji=${energyType}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'PDF oluşturulamadı' }));
        throw new Error(err.detail);
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `YE-ATLAS_${ilceAdi}_${energyType}_${new Date().toISOString().slice(0,10)}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <button
        onClick={download}
        disabled={!ilceAdi || loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', borderRadius: 9,
          background: loading ? 'var(--surface-2)' : 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: loading ? 'var(--muted)' : '#EF4444',
          fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
          cursor: ilceAdi && !loading ? 'pointer' : 'not-allowed',
          transition: 'all 0.18s',
          opacity: !ilceAdi ? 0.5 : 1,
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: 13, height: 13,
              border: '2px solid rgba(239,68,68,0.2)',
              borderTopColor: '#EF4444',
              borderRadius: '50%',
              animation: 'spin .8s linear infinite',
            }}/>
            PDF hazırlanıyor…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 18 15 15"/>
            </svg>
            PDF İndir {ilceAdi ? `— ${ilceAdi}` : ''}
          </>
        )}
      </button>
      {error && (
        <div style={{ fontSize: 11, color: '#EF4444', padding: '4px 6px',
          background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
          ⚠ {error}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}