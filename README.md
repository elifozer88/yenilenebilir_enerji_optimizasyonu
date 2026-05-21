# YE·ATLAS — İzmir Yenilenebilir Enerji Uygunluk Atlası

YE·ATLAS, İzmir genelindeki **GES (Güneş Enerjisi Santrali)** ve **RES (Rüzgâr Enerjisi Santrali)** kurulumuna en uygun alanları belirlemek, analiz etmek ve raporlamak amacıyla geliştirilmiş **AHP (Analitik Hiyerarşi Süreci)** tabanlı bir karar destek sistemidir.

Proje, İzmir Büyükşehir Belediyesi İklim Değişikliği ve Temiz Enerji Şube Müdürlüğü yöneticileri ve analistleri için coğrafi bilgi sistemleri (CBS) veri katmanlarını, mekânsal analizleri ve anlık hava tahminlerini bir araya getiren premium ve modern bir web uygulamasıdır.

---

## 🚀 Öne Çıkan Özellikler

### 1. Karar Destek ve AHP Metodolojisi
* **GES Kriterleri:** Solar Radyasyon (%32), Arazi Kullanımı (%25), Eğim (%11), Bakı (%9), ENH Yakınlığı (%8), Yerleşim Uzaklığı (%7), Yola Yakınlık (%4), Fay Hatlarından Uzaklık (%3), Akarsulardan Uzaklık (%1).
* **RES Kriterleri:** Rüzgâr Hızı (%30), Arazi Kullanımı (%27), Yükseklik (%13), Yerleşim Uzaklığı (%10), ENH Yakınlığı (%6), Eğim (%5), Yola Yakınlık (%4), Fay Hatlarından Uzaklık (%3), Akarsulardan Uzaklık (%2).
* Tutarlılık Oranı (Consistency Ratio - CR) < 0.10 doğruluk limitleri içerisindedir.

### 2. Gelişmiş CBS Atlas Görünümü (Deck.gl & 3D)
* MapTiler altyapısı ile 3D Terrain (Yükselti) haritası.
* ESRI World Imagery uydu fotoğrafları katmanı.
* **Göz Yormayan Filtreleme:** Atlas üzerindeki raster ve polygon katmanları, haritada göz yormaması amacıyla varsayılan olarak yalnızca **Sınıf 4 (Uygun)** ve **Sınıf 5 (Çok Uygun)** alanları renklendirecek şekilde dinamik filtrelenmektedir.
* Her ilçe için interaktif sınır çizgileri, tıklama ile yakınlaşma (zoom) ve detay kartları.

### 3. Yetki Tabanlı Erişim Kontrolü (RBAC)
* Güvenli JWT (JSON Web Token) tabanlı kimlik doğrulama.
* **Roller:** `Admin`, `Müdür` ve `Analist`.
* **Dinamik Yetkilendirme:** Admin yetkisindeki kullanıcılar, Sistem Yönetimi panelinden hangi rollerin hangi sayfaları (`Atlas`, `Raporlar`, `Santraller`) görüntüleyebileceğini dinamik olarak açıp kapatabilir. Değişiklikler anında hem veritabanında hem de frontend üzerinde uygulanır.

### 4. Raporlama ve Hava Durumu Entegrasyonu
* Open-Meteo API aracılığıyla ilçelerin anlık sıcaklık, rüzgâr hızı, solar radyasyon, bulutluluk değerleri ve 7 günlük tahmin grafikleri.
* İlçelerin kapasite tahmini, kurulu güç potansiyeli ve alan bazlı istatistiklerinin karşılaştırmalı analizi.
* Detaylı PDF rapor çıktısı alabilme.

---

## 🛠️ Teknoloji Yığını

### Backend
* **Python FastAPI:** Yüksek performanslı asenkron API altyapısı.
* **PostgreSQL / PostGIS:** CBS vektör sorguları ve mekânsal analizler için veri tabanı.
* **Rasterio & Shapely & GeoPandas:** TIF formatındaki coğrafi verilerin işlenmesi ve vektörize edilmesi.
* **Rio-Tiler & PIL (Pillow):** Dinamik PNG tile üretimi ve renklendirme.
* **PyJWT & Bcrypt:** Güvenli şifreleme ve token doğrulama.

### Frontend
* **React (ES6+):** Component tabanlı arayüz geliştirme.
* **Deck.gl & Maplibre GL:** WebGL tabanlı yüksek performanslı 3D CBS veri görselleştirme.
* **Vanilla CSS (HSL Renk Sistemi):** Premium karanlık/aydınlık mod şemaları ve yumuşak geçiş efektleri.

---

## 📁 Dizin Yapısı

```text
├── backend/
│   ├── routers/             # API rotaları (ges, res, auth, ahp, santral vb.)
│   ├── main.py              # FastAPI ana uygulama dosyası (port 8003)
│   ├── tile_server.py       # Dinamik TIF raster tile sunucusu
│   ├── database.py          # PostgreSQL bağlantı havuzu
│   ├── calistir.py          # CBS raster verilerini veritabanına aktarma/vektörize etme scripti
│   └── .env                 # Veritabanı bağlantı ayarları
├── frontend/
│   ├── public/              # Statik dosyalar ve logolar
│   ├── src/
│   │   ├── components/      # Arayüz bileşenleri (Map, AdminPanel, Login vb.)
│   │   ├── App.js           # Ana React bileşeni ve sayfa yönlendiricileri
│   │   └── Atlas.css        # Premium tema ve CSS tasarımları
│   └── package.json         # Bağımlılıklar ve proxy yapılandırması (port 3000)
├── data/
│   └── proceed/             # İzmir GES/RES TIF formatında CBS harita verileri
```

---

## ⚙️ Kurulum ve Çalıştırma

### 1. Veritabanı Kurulumu
1. PostgreSQL ve PostGIS eklentisini bilgisayarınıza kurun.
2. `yenilenebilir` adında bir veritabanı oluşturun ve `CREATE EXTENSION postgis;` sorgusunu çalıştırın.
3. `backend/.env` dosyasına veritabanı bilgilerinizi girin:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=yenilenebilir
   DB_USER=postgres
   DB_PASS=şifreniz
   JWT_SECRET=güvenli_anahtarınız
   ```

### 2. Backend Başlatma
1. Gerekli Python bağımlılıklarını yükleyin:
   ```bash
   pip install fastapi uvicorn psycopg2 geopandas rasterio shapely PyJWT bcrypt pillow rio-tiler
   ```
2. Rasterio veri kütüphanesi için çevre değişkenini ayarlayıp sunucuyu başlatın:
   ```powershell
   # Windows PowerShell
   $env:PROJ_DATA = "D:\YENİLENEBİLİR ENERJİ PROJE\.venv\Lib\site-packages\rasterio\proj_data"
   cd backend
   python -m uvicorn main:app --port 8003 --reload
   ```

### 3. Frontend Başlatma
1. Gerekli Node modüllerini yükleyin:
   ```bash
   npm install
   ```
2. Geliştirici sunucusunu başlatın:
   ```bash
   npm start
   ```
   Uygulama otomatik olarak `http://localhost:3000` adresinde açılacaktır.

---

## 👤 Varsayılan Giriş Bilgileri

Uygulamanın yetkilendirme sistemini test etmek için aşağıdaki roller ve varsayılan kullanıcılar kullanılabilir:

* **Yönetici (Admin):**
  * Kullanıcı Adı: `admin`
  * Şifre: `admin123`
* **Müdür (Mudur):**
  * Kullanıcı Adı: `mudur`
  * Şifre: `mudur123`
* **Analist (Analist):**
  * Kullanıcı Adı: `analist1`
  * Şifre: `analist123`
