#!/usr/bin/env node

/**
 * Pinata configuration check script
 * Usage: node scripts/check-pinata-config.js
 */

const fs = require('fs');
const path = require('path');

console.info('🔍 Checking Pinata configuration...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    console.info('   Create it from .env.local.example\n');
    process.exit(1);
}

console.info('✅ .env.local file found');

// Read contents
const envContent = fs.readFileSync(envPath, 'utf8');

// Check PINATA_JWT
if (!envContent.includes('PINATA_JWT')) {
    console.error('❌ PINATA_JWT is not defined in .env.local');
    console.info('   Add: PINATA_JWT=your_jwt_here\n');
    process.exit(1);
}

const jwtMatch = envContent.match(/PINATA_JWT=(.+)/);
if (!jwtMatch || !jwtMatch[1] || jwtMatch[1].trim() === 'your_pinata_jwt_here') {
    console.error('❌ PINATA_JWT is set but empty or not configured');
    console.info('   Replace "your_pinata_jwt_here" with your real Pinata JWT');
    console.info('   Get it from: https://app.pinata.cloud/developers/api-keys\n');
    process.exit(1);
}

console.info('✅ PINATA_JWT is defined');

// Check that 'pinata' package is installed
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.dependencies || !packageJson.dependencies.pinata) {
    console.error('❌ The "pinata" package is not installed');
    console.info('   Run: npm install pinata\n');
    process.exit(1);
}

console.info('✅ "pinata" package installed');

// Check that 'thirdweb' is not present
if (packageJson.dependencies && packageJson.dependencies.thirdweb) {
    console.warn('⚠️ The "thirdweb" package is still installed');
    console.info('   You may remove it: npm uninstall thirdweb\n');
}

console.info('\n✅ Pinata configuration OK!');
console.info('\n📝 Next steps:');
console.info('   1. Start the server: npm run dev');
console.info('   2. Test uploading a file in your application');
console.info('   3. Check the logs for "✅ Pinata upload result"\n');
console.info('📚 Documentation: see PINATA_SETUP.md\n');

