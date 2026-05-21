#!/bin/bash
# Hetzner sunucusunda bir kez çalıştırılacak kurulum scripti
# Kullanım: bash setup_server.sh

set -e

echo "=== Docker kuruluyor ==="
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

echo "=== UFW güvenlik duvarı ayarlanıyor ==="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== Proje klasörü oluşturuluyor ==="
mkdir -p /opt/yeatlas/data/proceed

echo "=== Git repo klonlanıyor ==="
if [ ! -d "/opt/yeatlas/.git" ]; then
  git clone https://github.com/elifozer88/yenilenebilir_enerji_optimizasyonu.git /opt/yeatlas
else
  cd /opt/yeatlas && git pull
fi

echo ""
echo "=== KURULUM TAMAMLANDI ==="
echo ""
echo "Sonraki adımlar:"
echo "  1. Data dosyalarını upload edin (bkz: upload_data.ps1)"
echo "  2. /opt/yeatlas/.env dosyasını oluşturun (bkz: env.example)"
echo "  3. DB backup'ı restore edin (bkz: deploy/restore_db.sh)"
echo "  4. docker compose up -d --build"
