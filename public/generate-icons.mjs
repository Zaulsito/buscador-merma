import fs from 'fs';

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#111827"/>
  <text x="256" y="320" font-size="280" text-anchor="middle" font-family="serif">🍽️</text>
  <text x="256" y="440" font-size="60" text-anchor="middle" font-family="sans-serif" fill="white">MERMA</text>
</svg>`;

fs.writeFileSync('public/icon-192.png', svgIcon);
fs.writeFileSync('public/icon-512.png', svgIcon);
console.log('Íconos creados!');