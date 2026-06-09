# YE·ATLAS — İzmir Yenilenebilir Enerji Uygunluk Atlası

YE·ATLAS, İzmir genelindeki **GES (Güneş Enerjisi Santrali)** ve **RES (Rüzgâr Enerjisi Santrali)** kurulumuna en uygun alanları belirlemek, analiz etmek ve raporlamak amacıyla geliştirilmiş, **AHP (Analitik Hiyerarşi Süreci)** tabanlı bir mekânsal karar destek sistemidir.

Proje; coğrafi bilgi sistemleri (CBS) veri katmanlarını, çok kriterli mekânsal analizleri ve anlık hava tahminlerini tek bir modern web uygulamasında bir araya getirir. İzmir Büyükşehir Belediyesi İklim Değişikliği ve Temiz Enerji Şube Müdürlüğü'nün yöneticileri ve analistleri hedef kullanıcı olarak alınarak tasarlanmıştır.

> **Not:** Bu repo bir bitirme/portföy projesidir. Canlı sürüm sergileme ve deneme amaçlı yayınlanmıştır; gerçek operasyonel kullanımda değildir ve içinde gerçek/gizli kurumsal veri barındırmaz.

<img width="100%" alt="YE·ATLAS genel görünüm" src="https://github.com/user-attachments/assets/1ae59541-40a4-4077-b525-c69376f80896" />

<img width="100%" alt="YE·ATLAS ana ekran" src="https://github.com/user-attachments/assets/4c133e6f-fc2b-49e0-9819-58ef1f5f33fa" />

---

## 🌐 Canlı Demo

Uygulamayı denemek için: `https://yeatlas.com/'
Giriş yapmak için aşağıdaki **Demo Giriş Bilgileri** bölümündeki test hesabını kullanabilirsiniz.

---

## 🛰️ CBS / QGIS Analiz Metodolojisi

Projenin çekirdeğini, uygunluk haritalarının üretildiği QGIS tabanlı mekânsal analiz iş akışı oluşturur. Tüm katmanlar **EPSG:32635 (UTM Zone 35N)** koordinat sisteminde ve **100 m çözünürlükte** işlenmiştir. Süreç beş aşamadan oluşur:

### Aşama 1 — Veri Toplama ve Ön İşleme
İzmir geneline ait ham coğrafi veriler toplanır ve standart bir referansa getirilir:
- **Raster veriler:** Sayısal Yükseklik Modeli (DEM), güneş radyasyonu (solar irradiance), rüzgâr hızı, arazi örtüsü/kullanımı.
- **Vektör veriler:** Karayolları, enerji nakil hatları (ENH), yerleşim alanları, fay hatları, akarsular, koruma alanları ve kuş habitatları.
- Tüm katmanlar EPSG:32635'e yeniden projekte edilir, 100 m piksel boyutuna yeniden örneklenir (resample) ve İzmir il sınırına kırpılır (clip).

### Aşama 2 — Türetilmiş Kriter Katmanlarının Üretimi
Ham verilerden analize girecek kriter katmanları üretilir:
- DEM üzerinden **eğim (slope)** ve **bakı (aspect)** hesaplanır.
- Vektör verilerden **mesafe (proximity / öklid uzaklık) rasterları** üretilir: yola yakınlık, ENH yakınlığı, yerleşime uzaklık, fay hattına uzaklık, akarsuya uzaklık.

### Aşama 3 — Yeniden Sınıflandırma (Reclassification)
Birbirinden farklı birim ve ölçeklerdeki kriter katmanları, ortak bir uygunluk ölçeğine taşınır:
- Her kriter, tanımlı eşik değerlerine göre **1 (en uygunsuz) – 5 (en uygun)** ölçeğinde yeniden sınıflandırılır.
- Her kriter için ayrı bir yeniden sınıflandırma (reclassification) tablosu kullanılır.

### Aşama 4 — Kısıt Maskeleri (Constraint Masks)
Yasal/ekolojik olarak kuruluma kapalı alanlar analizin dışında bırakılır:
- Koruma alanları ve kuş habitatları gibi hassas bölgeler maskelenerek (exclusion mask) nihai uygunluk hesabından çıkarılır.

### Aşama 5 — AHP Ağırlıklı Çakıştırma (Weighted Overlay)
Sınıflandırılmış kriter katmanları, AHP ile belirlenen ağırlıklarla raster hesaplayıcıda birleştirilir:
- Çıktılar:
  - `izmir_ges_uygunluk_v4.tif` — değer aralığı **1.74 – 3.90**
  - `izmir_res_uygunluk_v5.tif` — değer aralığı **1.62 – 4.39**
- AHP karşılaştırma matrislerinin **Tutarlılık Oranı (Consistency Ratio, CR) < 0.10** olarak doğrulanmıştır.
- Sonuçlar **Random Forest** modeliyle çapraz doğrulanmış; tahmin ile uygunluk skorları arasında **Pearson r = 0.956** korelasyon elde edilmiştir.

### AHP Kriter Ağırlıkları
- **GES Kriterleri:** Solar Radyasyon (%32), Arazi Kullanımı (%25), Eğim (%11), Bakı (%9), ENH Yakınlığı (%8), Yerleşim Uzaklığı (%7), Yola Yakınlık (%4), Fay Hatlarından Uzaklık (%3), Akarsulardan Uzaklık (%1).
- **RES Kriterleri:** Rüzgâr Hızı (%30), Arazi Kullanımı (%27), Yükseklik (%13), Yerleşim Uzaklığı (%10), ENH Yakınlığı (%6), Eğim (%5), Yola Yakınlık (%4), Fay Hatlarından Uzaklık (%3), Akarsulardan Uzaklık (%2).

---

## 🚀 Öne Çıkan Özellikler

### 1. Gelişmiş CBS Atlas Görünümü (Deck.gl & 3D)
- MapTiler altyapısı ile 3D Terrain (yükselti) haritası.
- ESRI World Imagery uydu fotoğrafları katmanı.
- **Göz yormayan filtreleme:** Raster ve polygon katmanları, varsayılan olarak yalnızca **Sınıf 4 (Uygun)** ve **Sınıf 5 (Çok Uygun)** alanları renklendirecek şekilde dinamik filtrelenir.
- Her ilçe için interaktif sınır çizgileri, tıklayarak yakınlaşma (zoom) ve detay kartları.

<img width="100%" alt="3D Atlas harita görünümü" src="https://github.com/user-attachments/assets/c3d6fb52-9ba3-4c07-83eb-72a844bfc755" />

<img width="100%" alt="İlçe bazlı atlas detayı" src="https://github.com/user-attachments/assets/aa53e514-6081-4651-9fca-33651248871b" />

### 2. Yetki Tabanlı Erişim Kontrolü (RBAC)
- Güvenli **JWT** tabanlı kimlik doğrulama.
- Roller: `Admin`, `Müdür`, `Analist`.
- **Dinamik yetkilendirme:** Admin yetkisindeki kullanıcılar, Sistem Yönetimi panelinden hangi rollerin hangi sayfaları (`Atlas`, `Raporlar`, `Santraller`) görebileceğini açıp kapatabilir. Değişiklikler anında hem veritabanına hem de arayüze yansır.

<img width="100%" alt="Sistem yönetimi ve yetkilendirme paneli" src="https://github.com/user-attachments/assets/4dda0d81-46df-4a91-9367-7511809da87a" />

### 3. Raporlama ve Hava Durumu Entegrasyonu
- Open-Meteo API ile ilçelerin anlık sıcaklık, rüzgâr hızı, solar radyasyon, bulutluluk değerleri ve 7 günlük tahmin grafikleri.
- İlçe bazında kapasite tahmini, kurulu güç potansiyeli ve alan istatistiklerinin karşılaştırmalı analizi.
- Detaylı PDF rapor çıktısı.

<img width="100%" alt="Raporlama ekranı" src="https://github.com/user-attachments/assets/f0635250-e736-40cf-9533-5cb1a7dba1e7" />

<img width="100%" alt="Hava durumu entegrasyonu" src="https://github.com/user-attachments/assets/5e096303-4cc3-4ca0-b75a-ea1112f6cfa7" />

<img width="100%" alt="İlçe detay ve istatistikler" src="https://github.com/user-attachments/assets/d66194f2-8eda-49a1-a826-634054d1e8e1" />

<img width="100%" alt="Kapasite ve potansiyel analizi" src="https://github.com/user-attachments/assets/84d843ea-f06e-4042-9713-4b62e388d288" />

<img width="100%" alt="Karşılaştırmalı analiz görünümü" src="https://github.com/user-attachments/assets/21d6e83d-3389-420c-8dab-f3de331ae439" />

<img width="100%" alt="Tahmin grafikleri" src="https://github.com/user-attachments/assets/33724343-a5f5-44c2-9056-d53613013cfc" />

<img width="100%" alt="PDF rapor çıktısı" src="https://github.com/user-attachments/assets/f23407e8-95c0-42f1-86e7-04c69431cb05" />

<img width="100%" alt="Genel uygulama görünümü" src="https://github.com/user-attachments/assets/a55150d4-2202-45ed-a8fa-5e0e369bbd4c" />

---

## 🛠️ Teknoloji Yığını

### Backend
- **Python / FastAPI:** Yüksek performanslı asenkron API altyapısı.
- **PostgreSQL / PostGIS:** CBS vektör sorguları ve mekânsal analizler için veri tabanı.
- **Rasterio, Shapely, GeoPandas:** TIF formatındaki coğrafi verilerin işlenmesi ve vektörize edilmesi.
- **Rio-Tiler, Pillow:** Dinamik PNG tile üretimi ve renklendirme.
- **PyJWT, Bcrypt:** Güvenli şifreleme ve token doğrulama.

### Frontend
- **React (ES6+):** Bileşen tabanlı arayüz.
- **Deck.gl, MapLibre GL:** WebGL tabanlı yüksek performanslı 3D CBS görselleştirme.
- **Vanilla CSS (HSL renk sistemi):** Karanlık/aydınlık mod ve yumuşak geçiş efektleri.

### Altyapı
- **Docker & Docker Compose:** PostGIS + FastAPI + Nginx/React tam orkestrasyonu.
- **Hetzner Cloud (Ubuntu VPS):** Production dağıtımı.

---

## 📁 Dizin Yapısı

```text
├── backend/
│   ├── routers/          # API rotaları (ges, res, auth, ahp, santral vb.)
│   ├── main.py           # FastAPI ana uygulama dosyası
│   ├── tile_server.py    # Dinamik TIF raster tile sunucusu
│   ├── database.py       # PostgreSQL bağlantı havuzu
│   ├── calistir.py       # CBS raster verilerini veritabanına aktarma/vektörize etme scripti
│   └── .env              # Veritabanı bağlantı ayarları (repoya dahil DEĞİLDİR — bkz. .env.example)
├── frontend/
│   ├── public/           # Statik dosyalar ve logolar
│   ├── src/
│   │   ├── components/    # Arayüz bileşenleri (Map, AdminPanel, Login vb.)
│   │   ├── App.js         # Ana React bileşeni ve sayfa yönlendiricileri
│   │   └── Atlas.css      # Tema ve CSS tasarımları
│   └── package.json
├── data/
│   └── proceed/          # İzmir GES/RES TIF formatında CBS harita verileri
```

---

## ⚙️ Yerel Kurulum ve Çalıştırma

### 1. Veritabanı Kurulumu
1. PostgreSQL ve PostGIS eklentisini kurun.
2. `yenilenebilir` adında bir veritabanı oluşturun ve `CREATE EXTENSION postgis;` çalıştırın.
3. `.env.example` dosyasını `backend/.env` olarak kopyalayıp kendi bilgilerinizi girin:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yenilenebilir
DB_USER=postgres
DB_PASS=<veritabanı_şifreniz>
JWT_SECRET=<güçlü_bir_gizli_anahtar>
```

### 2. Backend Başlatma
```bash
pip install fastapi uvicorn psycopg2 geopandas rasterio shapely PyJWT bcrypt pillow rio-tiler

# Rasterio PROJ ortam değişkenini ayarlayın (örnek)
# Windows PowerShell:
$env:PROJ_DATA = "<rasterio_proj_data_yolunuz>"

cd backend
python -m uvicorn main:app --port 8003 --reload
```

### 3. Frontend Başlatma
```bash
npm install
npm start
```
Uygulama `http://localhost:3000` adresinde açılır.

---

## 🐳 Docker ile Production (Hetzner VPS) Dağıtımı

Proje; PostGIS, FastAPI ve Nginx/React yapısını içeren tam bir `docker-compose` orkestrasyonu ile canlıya alınmaya hazırdır.

### 1. Sunucu Hazırlığı
```bash
# Ubuntu VPS (min. 4-8 GB RAM önerilir) — güvenlik duvarı
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Docker kurulumu
curl -fsSL https://get.docker.com | sh

# Projeyi klonlayın
git clone https://github.com/elifozer88/yenilenebilir_enerji_optimizasyonu.git /opt/yeatlas
cd /opt/yeatlas
```

### 2. Raster Verilerinin ve Veritabanının Aktarılması
```bash
# Yerel makineden TIF harita dosyalarını gönderin
scp <yerel_data_yolu>/izmir_ges_uygunluk_v4.tif root@<SUNUCU_IP>:/opt/yeatlas/data/
scp <yerel_data_yolu>/izmir_res_uygunluk_v5.tif root@<SUNUCU_IP>:/opt/yeatlas/data/

# Yerel veritabanı yedeğini alıp gönderin
pg_dump -U postgres -h localhost -p 5432 yenilenebilir > yeatlas_backup.sql
scp yeatlas_backup.sql root@<SUNUCU_IP>:/opt/yeatlas/
```

### 3. Servisleri Başlatma ve Yedeği Geri Yükleme
```bash
docker compose up -d db
docker exec -i ye_db psql -U postgres -c "CREATE DATABASE yenilenebilir;"
docker exec -i ye_db psql -U postgres yenilenebilir < /opt/yeatlas/yeatlas_backup.sql
docker compose up -d --build
```

### 4. Yayını Doğrulama
- **Frontend:** Tarayıcıdan `http://<SUNUCU_IP>` adresine gidin.
- **API sağlık kontrolü:** `http://<SUNUCU_IP>/api/health` adresinin `{"status": "ok"}` döndürdüğünü teyit edin.

---

## 👤 Demo / Test Giriş Bilgileri

> Aşağıdaki hesap, yetkilendirme sistemini (RBAC) **denemek isteyen ziyaretçiler için** bilerek paylaşılan bir demo hesabıdır. Gerçek kurumsal kullanıcı bilgisi değildir. Kendi kurulumunuzda bu hesabı ilk girişte mutlaka güçlü bir şifreyle değiştirin.

| Rol | Kullanıcı Adı | Şifre |
| --- | --- | --- |
| Yönetici (Admin) | `admin` | `Atlas2026!` |

> `Müdür` ve `Analist` rolleri de sistemde tanımlıdır; RBAC akışını test etmek için Admin panelinden bu roller için kullanıcı oluşturabilirsiniz.

---

## 📌 Proje Bağlamı
Bu çalışma, Dokuz Eylül Üniversitesi Yönetim Bilişim Sistemleri bölümü bitirme projesi kapsamında, İzmir Büyükşehir Belediyesi İklim Değişikliği ve Temiz Enerji Şube Müdürlüğü ile iş birliği içinde geliştirilmiştir.
