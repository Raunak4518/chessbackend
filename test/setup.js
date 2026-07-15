const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals !== -1) {
      const key = trimmed.slice(0, firstEquals).trim();
      const value = trimmed.slice(firstEquals + 1).trim();
      // Only set if not already set by system environment
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}
