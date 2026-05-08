/**
 * Generate Apple Client Secret for Supabase Sign In with Apple
 * This JWT is valid for 6 months (maximum allowed by Apple)
 */
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Apple Developer credentials
const TEAM_ID = '5ZT3TPR84F';
const KEY_ID = '794JJZ27TL';
const CLIENT_ID = 'com.iurexia.web'; // Services ID

// Read the .p8 private key
const privateKeyPath = path.join(process.env.USERPROFILE, 'Downloads', 'AuthKey_794JJZ27TL.p8');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// Generate JWT (Apple Client Secret)
const now = Math.floor(Date.now() / 1000);
const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + (86400 * 180), // 180 days (6 months max)
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
};

const secret = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
        alg: 'ES256',
        kid: KEY_ID,
    },
});

console.log('=== Apple Client Secret (JWT) ===');
console.log(secret);
console.log('\n=== Configuration Summary ===');
console.log(`Team ID: ${TEAM_ID}`);
console.log(`Key ID: ${KEY_ID}`);
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Expires: ${new Date((now + 86400 * 180) * 1000).toISOString()}`);
