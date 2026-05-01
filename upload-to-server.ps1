#################################################
# CWY Backend Upload Script (Windows PowerShell)
# Run this from your PC to upload files to server
#################################################

Write-Host "📦 CWY Backend Upload Script" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Server details
$SERVER = "root@cwy.clisonix.com"
$SERVER_IP = "62.238.21.125"

# Check if backend folder exists
if (-not (Test-Path "backend")) {
    Write-Host "❌ Backend folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the CWY project root directory" -ForegroundColor Yellow
    exit 1
}

# Compress backend folder
Write-Host "📦 Compressing backend folder..." -ForegroundColor Yellow
if (Test-Path "cwy-backend.zip") {
    Remove-Item "cwy-backend.zip" -Force
}
Compress-Archive -Path backend -DestinationPath cwy-backend.zip
Write-Host "✅ Backend compressed ($(Get-Item cwy-backend.zip | Select-Object -ExpandProperty Length) bytes)" -ForegroundColor Green

# Upload to server
Write-Host ""
Write-Host "📤 Uploading to server..." -ForegroundColor Yellow
scp cwy-backend.zip "${SERVER}:/root/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Upload successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    exit 1
}

# Upload landing page
if (Test-Path "landing-page.html") {
    Write-Host ""
    Write-Host "📤 Uploading landing page..." -ForegroundColor Yellow
    scp landing-page.html "${SERVER}:/tmp/index.html"
    Write-Host "✅ Landing page uploaded!" -ForegroundColor Green
}

# Upload deployment scripts
Write-Host ""
Write-Host "📤 Uploading deployment scripts..." -ForegroundColor Yellow
scp deploy-auto.sh setup-backend.sh setup-nginx.sh setup-ssl.sh "${SERVER}:/root/"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ ALL FILES UPLOADED!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SSH to server:" -ForegroundColor White
Write-Host "   ssh $SERVER" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run automated deployment:" -ForegroundColor White
Write-Host "   chmod +x *.sh" -ForegroundColor Gray
Write-Host "   ./deploy-auto.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Setup backend:" -ForegroundColor White
Write-Host "   ./setup-backend.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Configure Nginx:" -ForegroundColor White
Write-Host "   ./setup-nginx.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Install SSL:" -ForegroundColor White
Write-Host "   ./setup-ssl.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏱️  Total deployment time: ~10 minutes" -ForegroundColor Yellow
Write-Host "🎯 Result: https://cwy.clisonix.com" -ForegroundColor Green
