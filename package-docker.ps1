#################################################
# CWY Docker Package & Upload Script
# Run from PC to package and upload to server
#################################################

Write-Host "🐋 CWY Docker Deployment Package" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$SERVER = "root@cwy.clisonix.com"

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

# Create temp directory
$tempDir = "cwy-deploy-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files
Copy-Item -Recurse "backend" "$tempDir/"
Copy-Item "Dockerfile" "$tempDir/"
Copy-Item "docker-compose.yml" "$tempDir/"
Copy-Item -Recurse "nginx" "$tempDir/"
Copy-Item "landing-page.html" "$tempDir/web/index.html"
Copy-Item "deploy-docker.sh" "$tempDir/"

# Create .env if not exists
if (-not (Test-Path "$tempDir/backend/.env")) {
    @"
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_PRO=price_1Sy88IJQa06Hh2HGw2nKvsVP
STRIPE_PRICE_ID_ENTERPRISE=price_1SynwsJQa06Hh2HGPWzx00N0
CWY_LICENSE_SECRET=CWY_SECRET_2024
CWY_DB_PATH=/data/licenses.db
PORT=8000
"@ | Out-File -FilePath "$tempDir/backend/.env" -Encoding utf8
}

# Create tarball (using WSL or 7-Zip)
Write-Host "📦 Compressing..." -ForegroundColor Yellow

if (Test-Path "cwy-deploy.tar.gz") {
    Remove-Item "cwy-deploy.tar.gz" -Force
}

# Try WSL tar
try {
    wsl tar -czf cwy-deploy.tar.gz -C $tempDir .
    Write-Host "✅ Package created with WSL tar" -ForegroundColor Green
}
catch {
    # Fallback to zip
    Compress-Archive -Path "$tempDir\*" -DestinationPath "cwy-deploy.zip"
    Write-Host "✅ Package created (zip format)" -ForegroundColor Green
}

# Cleanup temp
Remove-Item -Recurse -Force $tempDir

# Upload to server
Write-Host ""
Write-Host "📤 Uploading to server..." -ForegroundColor Yellow

if (Test-Path "cwy-deploy.tar.gz") {
    scp cwy-deploy.tar.gz "${SERVER}:/root/"
}
else {
    scp cwy-deploy.zip "${SERVER}:/root/"
}

scp deploy-docker.sh "${SERVER}:/root/"

Write-Host "✅ Upload complete!" -ForegroundColor Green

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SSH to server:" -ForegroundColor White
Write-Host "   ssh $SERVER" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run deployment:" -ForegroundColor White
Write-Host "   chmod +x deploy-docker.sh" -ForegroundColor Gray
Write-Host "   ./deploy-docker.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏱️  Deployment time: ~8 minutes" -ForegroundColor Yellow
Write-Host "🎯 Result: https://cwy.clisonix.com" -ForegroundColor Green
