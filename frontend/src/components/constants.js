// components/constants.js — YE·ATLAS paylaşılan sabitler

export const KRITER_META = {
  solar:    { ad:'Solar Radyasyon',   renk:'#D97706', ikon:'☀'  },
  ruzgar:   { ad:'Rüzgâr Hızı',      renk:'#0891B2', ikon:'💨' },
  egim:     { ad:'Eğim & Bakı',      renk:'#059669', ikon:'⛰'  },
  baki:     { ad:'Bakı',             renk:'#7C3AED', ikon:'🧭' },
  yukseklik:{ ad:'Yükseklik',        renk:'#B45309', ikon:'📏' },
  arazi:    { ad:'Arazi Kullanımı',  renk:'#1D4ED8', ikon:'🌿' },
  yerlesim: { ad:'Yerleşim Uzaklık', renk:'#BE185D', ikon:'🏘' },
  yol:      { ad:'Yola Yakınlık',    renk:'#047857', ikon:'🛣' },
  akarsu:   { ad:'Akarsu Uzaklığı',  renk:'#0369A1', ikon:'💧' },
  enerji:   { ad:'ENH Yakınlığı',    renk:'#C2410C', ikon:'⚡' },
  fay:      { ad:'Fay Uzaklığı',     renk:'#4B5563', ikon:'🏔' },
};

// Profesyonel renk paleti — 4 ilçe karşılaştırması için
export const COLORS = [
  '#1D4ED8',  // Safir mavi    — ana renk
  '#0E7490',  // Okyanus mavisi — ikincil
  '#7C3AED',  // Mor            — üçüncül
  '#047857',  // Orman yeşili   — dördüncül
];

// ── Uygunluk renk paleti ──
export const S_RENK = {
  5: '#15803D',  // Çok Uygun — koyu yeşil
  4: '#4ADE80',  // Uygun     — açık yeşil
  3: '#F59E0B',  // Orta      — amber
  2: '#F97316',  // Düşük     — turuncu
  1: '#DC2626',  // Uygunsuz  — kırmızı
};

// RGB versiyonu — DeckGL layer'ları için
export const S_RENK_RGB = {
  5: [21,  128,  61],
  4: [74,  222, 128],
  3: [245, 158,  11],
  2: [249, 115,  22],
  1: [220,  38,  38],
};

export const S_AD = {
  5: 'Çok Uygun',
  4: 'Uygun',
  3: 'Orta',
  2: 'Düşük',
  1: 'Uygunsuz',
};

export const trSort = (a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' });

export const skorRenk = s =>
  s >= 4 ? '#15803D' : s >= 3 ? '#CA8A04' : s >= 2 ? '#EA580C' : '#DC2626';

// /api/ml/mw-hesap parametreleri
export const MW_PARAMS = {
  GES: {
    panel_kw_per_ha:  1000,
    kapasite_faktoru: 0.18,
    emisyon:          0.463,
    hane_kwh:         3500,
  },
  RES: {
    turbin_mw:        2.0,
    turbin_ha:        25.0,
    kapasite_faktoru: 0.30,
    emisyon:          0.463,
    hane_kwh:         3500,
  },
};