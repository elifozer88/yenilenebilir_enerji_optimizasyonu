import PdfButton from './PdfButton';
/**
 * components/InlineIlcePanel.js
 * Harita altında açılan hızlı ilçe analiz paneli
 */
import { useState, useEffect } from 'react';
import MiniMap from './MiniMap';

const KRITER_META = {
  solar:{ad:'Solar Radyasyon',renk:'#F59E0B'},ruzgar:{ad:'Rüzgâr Hızı',renk:'#38BDF8'},
  egim:{ad:'Eğim & Bakı',renk:'#10B981'},baki:{ad:'Bakı',renk:'#A78BFA'},
  yukseklik:{ad:'Yükseklik',renk:'#FDE68A'},arazi:{ad:'Arazi Kullanımı',renk:'#60A5FA'},
  yerlesim:{ad:'Yerleşim Uzaklık',renk:'#F472B6'},yol:{ad:'Yola Yakınlık',renk:'#34D399'},
  akarsu:{ad:'Akarsu Uzaklığı',renk:'#67E8F9'},enerji:{ad:'ENH Yakınlığı',renk:'#FB923C'},
  fay:{ad:'Fay Uzaklığı',renk:'#94A3B8'},
};
const sinifRenk={5:'#14803C',4:'#4AA635',3:'#D97706',2:'#DC6B2E',1:'#B91C1C'};
const sinifAd={5:'Çok Uygun',4:'Uygun',3:'Orta',2:'Düşük',1:'Uygunsuz'};

function Donut({data,size=140}){
  const cx=size/2,cy=size/2,R=cx*0.72,r=cx*0.44;
  const sum=data.reduce((a,b)=>a+b.v,0)||1;
  let ang=-Math.PI/2;
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d,i)=>{
        const a=(d.v/sum)*2*Math.PI;
        if(a<0.02){ang+=a;return null;}
        const x1=cx+R*Math.cos(ang),y1=cy+R*Math.sin(ang);
        const x2=cx+R*Math.cos(ang+a),y2=cy+R*Math.sin(ang+a);
        const xi1=cx+r*Math.cos(ang),yi1=cy+r*Math.sin(ang);
        const xi2=cx+r*Math.cos(ang+a),yi2=cy+r*Math.sin(ang+a);
        const lg=a>Math.PI?1:0;
        ang+=a;
        return <path key={i}
          d={`M${x1},${y1}A${R},${R},0,${lg},1,${x2},${y2}L${xi2},${yi2}A${r},${r},0,${lg},0,${xi1},${yi1}Z`}
          fill={d.c} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2"/>;
      })}
      <circle cx={cx} cy={cy} r={r-1} fill="var(--card)"/>
      <text x={cx} y={cy-6} textAnchor="middle" fontSize={size*0.12} fontWeight="800"
        fill="var(--text)" fontFamily="Manrope,sans-serif">{sum.toLocaleString('tr')}</text>
      <text x={cx} y={cy+9} textAnchor="middle" fontSize={size*0.07} fill="var(--muted)"
        fontFamily="Manrope,sans-serif">ha toplam</text>
    </svg>
  );
}

export default function InlineIlcePanel({ ilceAdi, energyType='GES' }){
  const [data, setData] = useState(null);
  const [mwRow, setMwRow] = useState(null);
  const color = '#0EA5A4'; // brand

  useEffect(()=>{
    if(!ilceAdi) return;
    const t = energyType.toLowerCase();
    Promise.all([
      fetch(`/api/${t}/district/${encodeURIComponent(ilceAdi)}`).then(r=>r.ok?r.json():null),
      fetch(`/api/ml/mw-hesap?enerji=${energyType}`).then(r=>r.ok?r.json():null),
    ]).then(([d,mw])=>{
      setData(d);
      setMwRow(mw?.ilceler?.find(r=>r.ilce===ilceAdi)||null);
    }).catch(()=>{});
  },[ilceAdi,energyType]);

  if(!data) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,color:'var(--muted)',fontSize:13,gap:10}}>
      <div style={{width:16,height:16,border:'2px solid var(--surface-2)',borderTopColor:'var(--brand)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      Yükleniyor…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const skor = data.skor_ort || 0;
  const renk = skor>=4?'#14803C':skor>=3?'#4AA635':skor>=2?'#D97706':'#B91C1C';
  const pie = [5,4,3,2,1].map(s=>({c:sinifRenk[s],v:Number(data.sinif_dagilim?.[String(s)]||0)}));
  const toplamHa = pie.reduce((a,b)=>a+b.v,0);

  return(
    <div style={{display:'grid',gridTemplateColumns:'320px 1fr 1fr',gap:0,minHeight:400}}>

      {/* ── SOL: Mini harita ── */}
      <div style={{borderRight:'1px solid var(--border)',position:'relative'}}>
        <MiniMap ilceAdi={ilceAdi} energyType={energyType} color={renk} height={420}/>
        <div style={{
          position:'absolute',top:8,right:8,zIndex:10,
          background:'rgba(10,16,30,0.9)',backdropFilter:'blur(8px)',
          border:`1px solid ${renk}40`,borderRadius:8,padding:'8px 12px',
        }}>
          <div style={{fontSize:22,fontWeight:800,color:renk,lineHeight:1,fontFamily:"'Manrope',sans-serif"}}>{skor.toFixed(2)}</div>
          <div style={{fontSize:9,color:'var(--muted)'}}>AHP SKORU</div>
        </div>
      </div>

      {/* ── ORTA: Pie + sınıf dağılımı ── */}
      <div style={{padding:20,borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:16}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)'}}>
          Uygunluk Sınıf Dağılımı
        </div>

        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <Donut data={pie} size={140}/>
          <div style={{flex:1}}>
            {[5,4,3,2,1].map(s=>{
              const ha=Number(data.sinif_dagilim?.[String(s)]||0);
              const pct=toplamHa>0?((ha/toplamHa)*100).toFixed(0):0;
              return(
                <div key={s} style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:sinifRenk[s]}}/>
                      <span style={{color:'var(--text-2)'}}>{sinifAd[s]}</span>
                    </div>
                    <div style={{fontSize:11,fontFamily:'JetBrains Mono,monospace'}}>
                      <span style={{color:sinifRenk[s],fontWeight:700}}>{pct}%</span>
                      <span style={{color:'var(--muted)',marginLeft:4}}>{ha.toLocaleString('tr')} ha</span>
                    </div>
                  </div>
                  <div style={{height:4,borderRadius:2,background:'rgba(255,255,255,0.05)',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:sinifRenk[s],borderRadius:2,transition:'width 0.8s'}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KPI'lar */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:'auto'}}>
          {[
            ['Uygun Alan', `${Number(data.uygun_alan_ha||0).toLocaleString('tr')} ha`],
            ['~Kapasite',  `${Number(data.tahmini_mw||0).toFixed(0)} MW`],
            ['Yıllık Üretim', mwRow?`${(mwRow.yillik_mwh/1000).toFixed(0)} GWh`:'—'],
            ['CO₂ Azaltım', mwRow?`${(mwRow.co2_ton_yil/1000).toFixed(0)} kt/yıl`:'—'],
          ].map(([k,v])=>(
            <div key={k} style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px'}}>
              <div style={{fontSize:9.5,color:'var(--muted)',marginBottom:2}}>{k}</div>
              <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SAĞ: Kriter skorları ── */}
      <div style={{padding:20,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)'}}>
          Kriter Skorları · {energyType}
        </div>

        {data.kriterler?.map(k=>{
          const meta=KRITER_META[k.kod]||{ad:k.kod,renk:'#888'};
          const pct=((k.skor||0)/5)*100;
          return(
            <div key={k.kod}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:12,color:'var(--text-2)'}}>{meta.ad}</span>
                <span style={{fontSize:12,fontWeight:700,color:meta.renk,fontFamily:'JetBrains Mono,monospace'}}>{(k.skor||0).toFixed(2)}</span>
              </div>
              <div style={{height:5,borderRadius:3,background:'rgba(255,255,255,0.05)',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${meta.renk},${meta.renk}88)`,borderRadius:3,transition:'width 0.7s'}}/>
              </div>
            </div>
          );
        })}

        {/* Hane karşılığı */}
        {mwRow?.hane_karsiligi>0&&(
          <div style={{marginTop:'auto',padding:12,background:'var(--brand-soft)',border:'1px solid rgba(14,165,164,0.2)',borderRadius:10}}>
            <div style={{fontSize:9.5,color:'var(--brand)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>
              Sosyal Etki
            </div>
            <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>{mwRow.hane_karsiligi.toLocaleString('tr')}</div>
            <div style={{fontSize:11,color:'var(--text-2)'}}>hanenin yıllık enerjisini karşılar</div>
          </div>
        )}
      </div>
    </div>
  );
}