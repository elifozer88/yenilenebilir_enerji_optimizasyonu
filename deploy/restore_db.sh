#!/bin/bash
# Sunucuda DB backup'ı restore eder
# Kullanım: bash deploy/restore_db.sh /opt/yeatlas/yeatlas_backup.sql

set -e
BACKUP_FILE="${1:-/opt/yeatlas/yeatlas_backup.sql}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "HATA: Backup dosyası bulunamadı: $BACKUP_FILE"
  exit 1
fi

echo "=== Sadece DB servisi başlatılıyor ==="
cd /opt/yeatlas
docker compose up -d db
echo "DB hazır olana kadar bekleniyor..."
sleep 10

echo "=== Veritabanı oluşturuluyor ==="
docker exec ye_db psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='yenilenebilir'" | grep -q 1 || \
  docker exec ye_db psql -U postgres -c "CREATE DATABASE yenilenebilir;"

echo "=== PostGIS eklentisi etkinleştiriliyor ==="
docker exec ye_db psql -U postgres yenilenebilir -c "CREATE EXTENSION IF NOT EXISTS postgis;"

echo "=== Backup restore ediliyor (büyük dosya, birkaç dakika sürebilir) ==="
docker exec -i ye_db psql -U postgres yenilenebilir < "$BACKUP_FILE"

echo "=== DB restore tamamlandı ==="
