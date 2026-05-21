const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'src', 'environments', 'environment.ts');
let envConfig = fs.readFileSync(envPath, 'utf8');

// Replace unique placeholders with Vercel Environment Variables
envConfig = envConfig.replace('V_PRIMARY_KEY', process.env.YOUTUBE_API_KEY || '');
envConfig = envConfig.replace('V_BACKUP_KEY', process.env.YOUTUBE_API_KEY_BACKUP || '');

fs.writeFileSync(envPath, envConfig);
console.log('Vercel: Environment variables injected successfully.');
