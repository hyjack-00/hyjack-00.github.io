#!/usr/bin/env bash
set -euo pipefail

readonly IMAGE_LIMIT=500000
readonly REQUIRED_FILES=(
  "index.html"
  "css/main.css"
  "css/article.css"
  "css/vendor/leaflet.css"
  "js/article-renderer.js"
  "js/background-manager.js"
  "js/content-renderer.js"
  "js/travel-map.js"
  "js/vendor/leaflet.js"
  "scripts/generate-background-manifest.mjs"
  "scripts/generate-article-pages.mjs"
  "templates/article.html"
  "data/backgrounds.json"
  "data/content.json"
  "assets/avatar.jpg"
)

failed=0

echo "Checking required homepage files..."
for file in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "  OK  $file"
  else
    echo "  MISSING  $file"
    failed=1
  fi
done

echo "Checking JavaScript and JSON syntax..."
node --check js/background-manager.js
node --check js/article-renderer.js
node --check js/content-renderer.js
node --check js/travel-map.js
node --check scripts/generate-background-manifest.mjs
node --check scripts/generate-article-pages.mjs
node -e "JSON.parse(require('fs').readFileSync('data/content.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('data/backgrounds.json', 'utf8'))"

echo "Checking content data..."
node <<'NODE'
const fs = require('fs');
const path = require('path');
const content = require('./data/content.json');
const manifest = require('./data/backgrounds.json');
const articleTemplate = fs.readFileSync('templates/article.html', 'utf8');

if (content.publications.length !== 7) throw new Error('Expected 7 publications');
if (content.blog.length !== 6) throw new Error('Expected 6 blog posts');
if (content.recommendations.length !== 2) throw new Error('Expected 2 recommendations');
if (content.experience.length !== 2) throw new Error('Expected 2 experience entries');
if (content.travel.cities.length !== 26) throw new Error('Expected 26 travel points');
if (content.stats.papers !== content.publications.length) throw new Error('Paper counter is stale');
if (content.stats.cities !== content.travel.cities.length) throw new Error('City counter is stale');

const education = content.education.map(item => item.period).join(' ');
if (!education.includes('2021-2025') || !education.includes('2025-Present')) {
  throw new Error('Education dates are incorrect');
}

const expectedExperience = [
  'SYSU SuperComputing Team Member',
  'SYSU AeroSwift Team Member'
];
for (const [index, item] of content.experience.entries()) {
  if (`${item.organization} ${item.role}` !== expectedExperience[index]) {
    throw new Error(`Unexpected experience entry at index ${index}`);
  }
  if (item.period !== '2022-2025') throw new Error('Experience dates are incorrect');
  if (!item.icon.startsWith('/assets/experience/') || !fs.existsSync(item.icon.slice(1))) {
    throw new Error(`Missing local experience icon: ${item.icon}`);
  }
}

const everest = content.travel.cities.find(city => city.name === 'Everest North Base Camp');
if (!everest || everest.lat !== 28.14139 || everest.lng !== 86.85139) {
  throw new Error('Everest North Base Camp coordinates are incorrect');
}

for (const post of content.blog) {
  const decodedPath = decodeURIComponent(post.url).replace(/^\//, '');
  const articlePage = path.join(decodedPath, 'index.html');
  if (!fs.existsSync(articlePage)) {
    throw new Error(`Missing blog page for ${post.url}`);
  }
  if (fs.readFileSync(articlePage, 'utf8') !== articleTemplate) {
    throw new Error(`Generated blog page is stale: ${post.url}`);
  }
  if (!post.source || !fs.existsSync(post.source.slice(1))) {
    throw new Error(`Missing blog source for ${post.url}`);
  }
  const source = fs.readFileSync(post.source.slice(1), 'utf8');
  if (!source.includes('article-content markdown-body')) {
    throw new Error(`Blog source has no extractable article body: ${post.source}`);
  }
  if (/<script\b|Hexo Theme Redefine|page-container/.test(source)) {
    throw new Error(`Legacy Hexo framework remains in blog source: ${post.source}`);
  }
}

const removedLegacyPaths = [
  'archives', 'assets/build', 'css/common', 'css/layout', 'css/style.css',
  'fonts/Chillax', 'js/layouts', 'js/libs', 'js/plugins', 'js/tools', 'lib'
];
for (const legacyPath of removedLegacyPaths) {
  if (fs.existsSync(legacyPath)) throw new Error(`Legacy framework path remains: ${legacyPath}`);
}

const diskFiles = fs.readdirSync('images/backgrounds')
  .filter(file => /\.(?:avif|gif|jpe?g|png|webp)$/i.test(file))
  .sort((a, b) => {
    const order = Number(a.split('__')[0]) - Number(b.split('__')[0]);
    return order || a.localeCompare(b, 'en', { numeric: true });
  });

for (const file of diskFiles) {
  const extension = path.extname(file);
  const parts = file.slice(0, -extension.length).split('__');
  if (parts.length !== 4 || !/^\d+$/.test(parts[0]) || parts.slice(1).some(part => !part)) {
    throw new Error(`Invalid background filename: ${file}`);
  }
}

const manifestFiles = manifest.backgrounds.map(item => item.file);
if (JSON.stringify(manifestFiles) !== JSON.stringify(diskFiles)) {
  throw new Error('Background manifest is not synchronized or sorted');
}
if (!manifest.backgrounds[0] || manifest.backgrounds[0].order !== 0) {
  throw new Error('The active background must begin with order 0');
}
NODE

echo "Checking the 500 KB image limit..."
while IFS= read -r -d '' image; do
  size=$(stat -c '%s' "$image")
  if (( size > IMAGE_LIMIT )); then
    echo "  TOO LARGE  $image ($size bytes)"
    failed=1
  fi
done < <(find . -type f \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \
     -o -iname '*.webp' -o -iname '*.gif' -o -iname '*.avif' \) \
  -not -path './.git/*' -print0)

echo "Checking map and background implementations..."
node <<'NODE'
const fs = require('fs');
const mapSource = fs.readFileSync('js/travel-map.js', 'utf8');
const backgroundSource = fs.readFileSync('js/background-manager.js', 'utf8');
const articleSource = fs.readFileSync('js/article-renderer.js', 'utf8');
const rendererSource = fs.readFileSync('js/content-renderer.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/main.css', 'utf8');
const articleTemplate = fs.readFileSync('templates/article.html', 'utf8');

if ((mapSource.match(/L\.map\(/g) || []).length !== 1) throw new Error('Expected one Leaflet map');
if (!mapSource.includes('L.circleMarker')) throw new Error('Travel points are not direct circle markers');
if (/cluster|maplibre|geo\.datav/i.test(mapSource + html + css)) throw new Error('Legacy map implementation remains');
if (!backgroundSource.includes("'/data/backgrounds.json'")) throw new Error('Background manifest is not used');
if (/background-image:\s*url\(['"]?\/images\/backgrounds/i.test(css)) {
  throw new Error('A background image is still hard-coded in CSS');
}
if (!html.includes('id="publications"') || !html.includes('id="blog"')) {
  throw new Error('Dense content sections are missing stable IDs');
}
if (!html.includes('id="experience"') || !html.includes('id="honors"') || !html.includes('id="service"')) {
  throw new Error('Experience, honors, or service is missing a stable ID');
}
if (!html.includes('id="recommendations"') || !rendererSource.includes('renderRecommendations()')) {
  throw new Error('Recommendations section is not rendered');
}
if ((html.match(/content-card--dense/g) || []).length !== 2) {
  throw new Error('Publication and Blog must both use the dense feather layer');
}
if (!rendererSource.includes('class="blog-meta"') ||
    !rendererSource.includes('class="blog-read-more"') ||
    rendererSource.includes('class="blog-category"')) {
  throw new Error('Blog must use the restored title, excerpt, and footer layout');
}
if (!articleSource.includes("querySelector('.article-content.markdown-body')") ||
    !articleSource.includes("image.dataset.src") ||
    !articleTemplate.includes('content-card--dense') ||
    !articleTemplate.includes('class="sidebar"')) {
  throw new Error('The new article reader or feather layer is missing');
}
if (rendererSource.includes("querySelectorAll('.sidebar-section')")) {
  throw new Error('Sidebar rendering still depends on positional selectors');
}
if (/lockBackgroundControl|is-locked|is-replaced/.test(backgroundSource + css)) {
  throw new Error('Legacy locked background control remains');
}
if (!css.includes('--dense-layer-alpha: 0.50') ||
    !css.includes('--pub-copy-line-height: 1.2') ||
    !css.includes('--pub-action-line-height: 1.2') ||
    !css.includes('--pub-action-gap-top: 0.24rem')) {
  throw new Error('Feather or publication density variables are missing');
}
NODE

if (( failed != 0 )); then
  echo "Homepage validation failed."
  exit 1
fi

echo "Homepage validation passed."
