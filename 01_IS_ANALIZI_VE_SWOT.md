# İzmir GES/RES Yer Seçimi Projesi — İş Analizi ve SWOT

Hazırlayan: ForgeFlow AI (supervisor + repo-inspector)
Tarih: 2026-04-24
Hedef: Akademik bitirme projesi için iş analizi, metodolojik değerlendirme, SWOT ve yol haritası.

---

## 1. Proje Tanımı

İzmir ili sınırları içinde güneş enerjisi santrali (GES) ve rüzgar enerjisi santrali (RES) kurulabilecek bölgelerin çok kriterli uygunluk analizi ile belirlenmesi. Yöntem olarak CBS (coğrafi bilgi sistemleri) katmanları üzerinde AHP/MCDA tabanlı ağırlıklandırma yapılıyor. Çıktı, uygunluk skoru ile renklendirilmiş tematik haritalar.

## 2. Paydaşlar

- Akademik danışman ve jüri
- İzmir Büyükşehir Belediyesi, EGİAD, İZFAŞ
- EPDK, TEİAŞ, Enerji ve Tabii Kaynaklar Bakanlığı
- Özel sektör yatırımcıları (IPP, EPC firmaları)
- STK'lar ve çevre kurulları
- Son kullanıcı: Araştırmacı, karar vericiler, enerji planlamacıları

## 3. Mevcut Metodoloji Değerlendirmesi

### 3.1 AHP / MCDA
Literatürde en yaygın kullanılan yer seçimi yöntemi. Avantajı, uzman görüşü ile ağırlıkların tutarlı şekilde belirlenmesi. Dezavantajı, ağırlıkların subjektif olması ve tutarlılık oranının (CR < 0.10) sıkı denetlenmesi gerekmesi.

### 3.2 GIS Katmanları
Raster ve vektör veri katmanları standart tekniktir. İzmir için tipik katmanlar:

GES için:
- Global Horizontal Irradiance (GHI) rasteri
- Eğim (slope), bakı (aspect)
- Arazi örtüsü (CORINE)
- Yerleşim, ulaşım, iletim hattı mesafeleri
- Korunan alanlar (milli park, SİT, Natura 2000)

RES için:
- Göbek yüksekliği rüzgar hızı (80-100m)
- Rüzgar yönü ve güç yoğunluğu
- Kuş göç yolları
- Yerleşim ve havaalanı tampon bölgeleri
- Yükseklik ve eğim

### 3.3 Makine Öğrenmesi — Mantıklı mı?

Kısa cevap: Evet, ama AHP'nin yerini almaz, onu tamamlar.

Uzun cevap: Akademik bitirmede ML katmanı üç somut yerde değer katar.

**Anlamlı kullanım alanları:**
1. Ağırlık öğrenme (supervised): Mevcut GES/RES santrallerinin kapasite faktörlerini hedef değişken alıp, kriter katmanlarını feature olarak verip Random Forest veya XGBoost ile önem (feature importance) skorları çıkarmak. AHP ağırlıklarını objektif olarak doğrular veya yeniden kalibre eder.
2. Kümeleme (unsupervised): K-Means veya DBSCAN ile mikro-bölgeleri benzer özelliklere göre gruplayıp hibrit santral adayları bulmak.
3. Zaman serisi tahmini: NASA POWER veya ERA5 verisiyle LSTM/Prophet modeli kurup aylık irradyans veya rüzgar hızı tahmini yapmak. Kapasite faktörü projeksiyonu için kullanılır.

**Mantıklı olmadığı alanlar:**
- Yer seçiminin temel karar aşamasını ML'e devretmek. Açıklanabilirlik kaybedilir, jüri sorgular.
- Küçük veri setinde (örneğin Türkiye'de aktif 20 GES) derin öğrenme. Overfitting riski yüksek.
- Uydu görüntüsünden arazi sınıflandırma yapmak. CORINE zaten bunu veriyor.

**Önerilen yaklaşım:** AHP birincil karar mekanizması kalsın. ML, "değerlendirme ve doğrulama" katmanı olarak eklensin. Bu da literatüre katkı (hybrid AHP-ML framework) sağlar, bitirme savunmasında güçlü durur.

## 4. SWOT Analizi

### Güçlü Yönler (Strengths)

- İzmir coğrafyası her iki kaynak için de üst çeyrek performansta. Yıllık GHI yaklaşık 1600-1800 kWh/m², kıyı şeridinde ortalama rüzgar hızı 6.5-8 m/s.
- AHP/MCDA akademik olarak oturmuş, referans veren yayın sayısı yüksek.
- GES ve RES eşzamanlı analizi, hibrit santral kurgusuna zemin hazırlıyor. Güncel trend.
- Tekrarlanabilir metodoloji. Farklı il/bölgelere uyarlanabilir, yayın potansiyeli yaratır.
- Türkiye'nin 2053 net sıfır hedefi ve YEKA sürecine politika bağlamı güçlü.

### Zayıf Yönler (Weaknesses)

- AHP ağırlıklarının uzman anketine bağımlılığı. Küçük panellerde tutarlılık oranı kırılgan.
- Raster çözünürlük sınırı. Tipik veriler 30m-1km arası. Mikro-iklim kaçabilir.
- Statik sonuç. Mevzuat veya arazi kullanım verisi değişince analiz bayatlar.
- Görselleştirme 2D kalıyorsa, arazinin topografik etkisi anlaşılmıyor.
- Finansal tarafı yok. LCOE, IRR, geri ödeme süresi olmadan yatırım kararına taşınmaz.
- Sosyal kabul ve paydaş analizi genelde atlanıyor.

### Fırsatlar (Opportunities)

- Kepler.gl 3D görselleştirme, akademik sunumu ve jüri izlenimini ciddi yukarı çeker.
- Açık kaynak veri portalları (NASA POWER, ERA5, Copernicus, Sentinel, EPDK açık veri) ücretsiz pipeline kurulabilir.
- Dijital ikiz (digital twin) ve gerçek zamanlı veri akışı eklenebilir.
- Proje, İzmir Kalkınma Ajansı (İZKA) veya TÜBİTAK 1001 çağrılarına aday olabilir.
- Yerli üretim ekipman zorunluluğu (YEKA) ile EPC firmalarının yer seçim talebi artıyor. Ticarileşme potansiyeli var.
- Mobil uygulama veya çevrim dışı kullanım için React Native/PWA çatısı kurulabilir.

### Tehditler (Threats)

- ÇED ve YEKA yönetmeliklerinin sık değişmesi. Analiz güncelliğini kolay kaybediyor.
- Uydu ve raster veri kaynaklarının erişim koşullarının değişmesi (ücretli API'a geçiş).
- Ticari platformlar (ArcGIS Online Renewable Toolkit, Trimble SITECH, Global Wind Atlas premium) alanı dolduruyor.
- Akademik projenin bakım sürdürülebilirliği. Öğrenci mezun olunca proje ölüyor.
- Veri gizliliği ve KVKK gereksinimleri. Özellikle saha çalışması varsa.
- İzmir kıyısında askeri kısıtlı bölgeler ve havayolu koridorları. Veri erişimi kısıtlı.

## 5. Risk Matrisi (Kısa)

| Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|
| AHP ağırlık tutarsızlığı | Orta | Yüksek | Uzman panel >= 5, CR < 0.10 doğrulaması, ML ile çapraz doğrulama |
| Veri kalitesi | Yüksek | Yüksek | Çoklu kaynak kesişimi, uydu verisi ile raster validasyon |
| Kullanıcı arayüz karmaşıklığı | Orta | Orta | İlerici açıklama (progressive disclosure), preset senaryolar |
| Performans (3D harita büyük veri) | Orta | Orta | Deck.gl katman seviyesinde LOD, hex aggregation |

## 6. Başarı Kriterleri

- AHP tutarlılık oranı CR < 0.10.
- En az 10 kriter katmanı entegre edilmiş.
- GES ve RES için ayrı ayrı uygunluk haritası ve hibrit senaryo.
- 3D dashboard üzerinde kullanıcı ağırlık değiştirince harita canlı güncelleniyor.
- Sunum demosu 3 dakikada kurulabiliyor.
- Tez jüri değerlendirmesi ve en az 1 konferans bildirisi hedefi.

DONE:supervisor:analysis-doc-01
