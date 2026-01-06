# CWY Icon Generation Script
# Creates a simple 128x128 icon for VS Code extension

# Note: This requires ImageMagick or similar tool installed
# Alternative: Use online converter at https://convertio.co/svg-png/

Write-Host "Icon created: icon.svg"
Write-Host ""
Write-Host "To convert to PNG (required for VS Code Marketplace):"
Write-Host "1. Option A - Install ImageMagick:"
Write-Host "   choco install imagemagick"
Write-Host "   magick icon.svg -resize 128x128 icon.png"
Write-Host ""
Write-Host "2. Option B - Use online converter:"
Write-Host "   Visit: https://convertio.co/svg-png/"
Write-Host "   Upload: icon.svg"
Write-Host "   Download: icon.png"
Write-Host ""
Write-Host "3. Option C - Use VS Code extension:"
Write-Host "   Install: 'SVG Previewer' extension"
Write-Host "   Right-click icon.svg -> Export PNG"
Write-Host ""
Write-Host "Then update package.json:"
Write-Host '   "icon": "icon.png"'
