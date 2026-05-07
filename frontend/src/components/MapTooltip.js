export function buildTooltip(object, energyType) {
  if (!object?.properties) return null;
  const p = object.properties;

  const sinifRenk = { 5:'#14803C', 4:'#4AA635', 3:'#D97706', 2:'#DC6B2E', 1:'#B91C1C' };
  const sinifAd   = { 5:'Çok Uygun', 4:'Uygun', 3:'Orta', 2:'Düşük', 1:'Uygunsuz' };

  // Polygon bölgesi
  if (p.sinif !== undefined) {
    const renk = sinifRenk[Math.round(p.sinif)] || '#888';
    const ad   = sinifAd[Math.round(p.sinif)]   || '';
    const pct  = (p.sinif / 5) * 100;
    return {
      html: `<div style="background:rgba(10,16,30,0.97);border:1px solid rgba(255,255,255,0.1);border-left:3px solid ${renk};border-radius:12px;padding:14px 18px;font-family:'Manrope',sans-serif;min-width:200px;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
        <div style="font-size:9.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${renk};margin-bottom:8px">${energyType} Uygunluk Bölgesi</div>
        <div style="display:flex;align-items:end;gap:8px;margin-bottom:8px">
          <div style="font-size:30px;font-weight:800;color:${renk};line-height:1">Sınıf ${Math.round(p.sinif)}</div>
          <div style="font-size:12px;color:${renk};opacity:0.8;padding-bottom:3px;font-weight:600">${ad}</div>
        </div>
        <div style="height:5px;border-radius:3px;background:rgba(255,255,255,0.07);margin-bottom:12px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${renk};border-radius:3px"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
          ${p.alan_ha ? `<div style="background:rgba(255,255,255,0.05);border-radius:7px;padding:8px 10px">
            <div style="font-size:9px;color:rgba(255,255,255,0.4);margin-bottom:2px">Alan</div>
            <div style="font-size:15px;font-weight:800;color:#E6ECF5">${Number(p.alan_ha).toLocaleString('tr')}<span style="font-size:9px;color:rgba(255,255,255,0.35);margin-left:2px">ha</span></div>
          </div>` : ''}
          ${p.mw ? `<div style="background:rgba(255,255,255,0.05);border-radius:7px;padding:8px 10px">
            <div style="font-size:9px;color:rgba(255,255,255,0.4);margin-bottom:2px">~Kapasite</div>
            <div style="font-size:15px;font-weight:800;color:#E6ECF5">${Number(p.mw).toFixed(0)}<span style="font-size:9px;color:rgba(255,255,255,0.35);margin-left:2px">MW</span></div>
          </div>` : ''}
        </div>
        ${p.ilce ? `<div style="margin-top:8px;font-size:10.5px;color:rgba(255,255,255,0.35)">📍 ${p.ilce}</div>` : ''}
      </div>`,
      style: { background:'none', border:'none', padding:'0' },
    };
  }

  // İlçe sınırı
  if (p.ilce !== undefined && p.skor_ort !== undefined) {
    const skor = parseFloat(p.skor_ort);
    const renk = skor>=4?'#14803C':skor>=3?'#4AA635':skor>=2?'#D97706':'#B91C1C';
    const pct  = (skor/5)*100;
    return {
      html: `<div style="background:rgba(10,16,30,0.97);border:1px solid rgba(255,255,255,0.1);border-top:3px solid ${renk};border-radius:12px;padding:16px 20px;font-family:'Manrope',sans-serif;min-width:250px;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
        <div style="font-size:9.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">${energyType} · ${p.ilce}</div>
        <div style="display:flex;align-items:end;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:38px;font-weight:800;color:${renk};line-height:1">${skor.toFixed(2)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.35);padding-bottom:5px">/5.00</div>
        </div>
        <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.07);margin-bottom:12px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${renk},${renk}cc);border-radius:3px"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px">
          ${[['Uygun Alan',Number(p.uygun_alan_ha||0).toLocaleString('tr')+' ha'],
             ['Tahmini',Number(p.tahmini_mw||0).toFixed(0)+' MW'],
             ['Min Skor',Number(p.skor_min||0).toFixed(2)],
             ['Maks Skor',Number(p.skor_max||0).toFixed(2)]].map(([k,v])=>`
          <div style="background:rgba(255,255,255,0.04);border-radius:7px;padding:7px 10px">
            <div style="font-size:9px;color:rgba(255,255,255,0.35);margin-bottom:2px">${k}</div>
            <div style="font-size:13px;font-weight:700;color:#E6ECF5">${v}</div>
          </div>`).join('')}
        </div>
        <div style="display:flex;gap:6px">
          ${[[4,'Sınıf 4',Number(p.sinif4_ha||0).toLocaleString('tr')+'ha','#4AA635'],
             [5,'Sınıf 5',Number(p.sinif5_ha||0).toLocaleString('tr')+'ha','#14803C']].map(([,l,v,c])=>`
          <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:6px;padding:6px 8px;border-left:2px solid ${c}">
            <div style="font-size:9px;color:rgba(255,255,255,0.35)">${l}</div>
            <div style="font-size:11px;font-weight:700;color:#E6ECF5">${v}</div>
          </div>`).join('')}
        </div>
      </div>`,
      style: { background:'none', border:'none', padding:'0' },
    };
  }
  return null;
}