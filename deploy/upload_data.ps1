# Windows PowerShell'de çalıştırın
# Kullanım: .\deploy\upload_data.ps1 -ServerIP "1.2.3.4"
param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP
)

$LocalProject = "D:\YENİLENEBİLİR ENERJİ PROJE"
$RemoteBase   = "root@${ServerIP}:/opt/yeatlas"

Write-Host "=== gadm41_TUR_2.json gönderiliyor ===" -ForegroundColor Cyan
scp "$LocalProject\gadm41_TUR_2.json" "${RemoteBase}/gadm41_TUR_2.json"

Write-Host "=== TIF raster dosyaları gönderiliyor (8+ GB, sabır gerekli) ===" -ForegroundColor Cyan
scp -r "$LocalProject\data\proceed\" "${RemoteBase}/data/proceed/"

Write-Host "=== DB backup alınıyor ===" -ForegroundColor Cyan
$PgDump = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
if (-not (Test-Path $PgDump)) {
    $PgDump = "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
}
& $PgDump -U postgres -h localhost -p 5432 yenilenebilir > "$env:USERPROFILE\yeatlas_backup.sql"

Write-Host "=== DB backup gönderiliyor ===" -ForegroundColor Cyan
scp "$env:USERPROFILE\yeatlas_backup.sql" "${RemoteBase}/yeatlas_backup.sql"

Write-Host ""
Write-Host "=== Upload tamamlandi! ===" -ForegroundColor Green
Write-Host "Sunucuda calistirin: bash /opt/yeatlas/deploy/restore_db.sh"
