import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const width = 800;
const height = 1100;

const svgPoster = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)" />

  <!-- Decorative border -->
  <rect x="25" y="25" width="${width - 50}" height="${height - 50}" fill="none" stroke="#4338ca" stroke-width="2" rx="16" />
  <rect x="35" y="35" width="${width - 70}" height="${height - 70}" fill="none" stroke="#6366f1" stroke-width="1" stroke-opacity="0.4" rx="12" />

  <!-- Badge / Category -->
  <rect x="260" y="80" width="280" height="38" rx="19" fill="#4f46e5" fill-opacity="0.25" stroke="#6366f1" stroke-width="1.5" />
  <text x="400" y="105" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" fill="#818cf8" letter-spacing="3">ACADEMIC TECH CLUB PRESENTS</text>

  <!-- Main Title -->
  <text x="400" y="190" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="1">CAMPUS BUILD NIGHT</text>
  <text x="400" y="240" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="900" fill="#a5b4fc" letter-spacing="4">2026</text>

  <!-- Subtitle -->
  <text x="400" y="290" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#cbd5e1">24 Hours of Pure Innovation, Mentorship &amp; Demos</text>

  <!-- Separator Line -->
  <line x1="120" y1="330" x2="680" y2="330" stroke="#4338ca" stroke-width="2" stroke-linecap="round" />

  <!-- Official Details Grid Cards -->

  <!-- Card 1: Event Date -->
  <g transform="translate(80, 370)">
    <rect width="640" height="110" rx="14" fill="#1e293b" fill-opacity="0.85" stroke="#334155" stroke-width="1.5" />
    <circle cx="55" cy="55" r="30" fill="#4f46e5" fill-opacity="0.2" />
    <text x="55" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#a5b4fc">📅</text>
    <text x="110" y="44" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#94a3b8" letter-spacing="1.5">DATE</text>
    <text x="110" y="78" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">Saturday, November 1, 2026</text>
  </g>

  <!-- Card 2: Start Time -->
  <g transform="translate(80, 510)">
    <rect width="640" height="110" rx="14" fill="#1e293b" fill-opacity="0.85" stroke="#334155" stroke-width="1.5" />
    <circle cx="55" cy="55" r="30" fill="#4f46e5" fill-opacity="0.2" />
    <text x="55" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#a5b4fc">⏰</text>
    <text x="110" y="44" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#94a3b8" letter-spacing="1.5">START TIME</text>
    <text x="110" y="78" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">10:00 AM IST</text>
    <text x="320" y="77" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#94a3b8">(Doors open 9:30 AM)</text>
  </g>

  <!-- Card 3: Venue -->
  <g transform="translate(80, 650)">
    <rect width="640" height="110" rx="14" fill="#1e293b" fill-opacity="0.85" stroke="#334155" stroke-width="1.5" />
    <circle cx="55" cy="55" r="30" fill="#4f46e5" fill-opacity="0.2" />
    <text x="55" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#a5b4fc">📍</text>
    <text x="110" y="44" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#94a3b8" letter-spacing="1.5">VENUE</text>
    <text x="110" y="78" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">Main Auditorium, Campus Center</text>
  </g>

  <!-- Card 4: Registration Deadline -->
  <g transform="translate(80, 790)">
    <rect width="640" height="110" rx="14" fill="#1e293b" fill-opacity="0.85" stroke="#dc2626" stroke-opacity="0.4" stroke-width="1.5" />
    <circle cx="55" cy="55" r="30" fill="#dc2626" fill-opacity="0.15" />
    <text x="55" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#f87171">⏳</text>
    <text x="110" y="44" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#f87171" letter-spacing="1.5">REGISTRATION DEADLINE</text>
    <text x="110" y="78" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="#fef2f2">October 31, 2026 at 6:00 PM</text>
  </g>

  <!-- Footer Banner -->
  <g transform="translate(80, 930)">
    <rect width="640" height="85" rx="12" fill="url(#accentGradient)" />
    <text x="320" y="40" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">REGISTER FREE AT CAMPUSBUILD.EDU</text>
    <text x="320" y="66" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#e0e7ff">Free food, hack swag, API credits, and certificates provided</text>
  </g>

  <!-- Bottom small text -->
  <text x="400" y="1055" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#64748b">Organized by College Computing Council • Powered by Appwrite Databases</text>
</svg>
`;

async function generate() {
  const fixturesDir = path.resolve('test/fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const outputPath = path.join(fixturesDir, 'campus_build_night_poster.png');
  await sharp(Buffer.from(svgPoster))
    .png({ quality: 95 })
    .toFile(outputPath);

  console.log(`✓ Realistic poster successfully generated at: ${outputPath}`);
  const stats = fs.statSync(outputPath);
  console.log(`✓ Size: ${(stats.size / 1024).toFixed(1)} KB`);
}

generate().catch(console.error);
