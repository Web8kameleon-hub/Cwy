const sharp = require('sharp');
const fs = require('fs');

async function convertIcon() {
  try {
    const svgBuffer = fs.readFileSync('icon.svg');
    
    await sharp(svgBuffer)
      .resize(128, 128)
      .png()
      .toFile('icon.png');
    
    console.log('✓ Icon converted: icon.png (128x128)');
  } catch (err) {
    console.error('✗ Failed to convert icon:', err.message);
    console.log('\nAlternative: Convert manually at https://convertio.co/svg-png/');
  }
}

convertIcon();
