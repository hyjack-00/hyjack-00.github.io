#!/usr/bin/env bash
set -euo pipefail

readonly IMAGE_LIMIT=500000
readonly REQUIRED_FILES=(
  ".nojekyll"
  "index.html"
  "404.html"
  "package.json"
  "package-lock.json"
  "css/main.css"
  "css/article.css"
  "css/vendor/leaflet.css"
  "js/background-manager.js"
  "js/content-renderer.js"
  "js/photography.js"
  "js/travel-map.js"
  "js/vendor/leaflet.js"
  "scripts/generate-background-manifest.mjs"
  "scripts/generate-article-pages.mjs"
  "scripts/generate-photography-manifest.mjs"
  "templates/article.html"
  "templates/post.md"
  "data/backgrounds.json"
  "data/blogs.json"
  "data/photography.json"
  "data/content.json"
  "assets/avatar.jpg"
  "assets/favicon.svg"
)

failed=0

echo "Checking required site files..."
for file in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "  OK  $file"
  else
    echo "  MISSING  $file"
    failed=1
  fi
done

if (( failed != 0 )); then
  echo "Required site files are missing."
  exit 1
fi

echo "Checking JavaScript and JSON syntax..."
node --check js/background-manager.js
node --check js/content-renderer.js
node --check js/photography.js
node --check js/travel-map.js
node --check scripts/generate-background-manifest.mjs
node --check scripts/generate-article-pages.mjs
node --check scripts/generate-photography-manifest.mjs
node -e "JSON.parse(require('fs').readFileSync('data/content.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('data/backgrounds.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('data/blogs.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('data/photography.json', 'utf8'))"

echo "Checking generated Markdown article output..."
node scripts/generate-article-pages.mjs --check
node scripts/generate-photography-manifest.mjs --check

echo "Checking site data and architecture..."
node <<'NODE'
const fs = require('fs');
const path = require('path');
const content = require('./data/content.json');
const backgrounds = require('./data/backgrounds.json');
const blogs = require('./data/blogs.json');
const photography = require('./data/photography.json');
const homepage = fs.readFileSync('index.html', 'utf8');
const notFound = fs.readFileSync('404.html', 'utf8');
const template = fs.readFileSync('templates/article.html', 'utf8');
const renderer = fs.readFileSync('js/content-renderer.js', 'utf8');
const backgroundManager = fs.readFileSync('js/background-manager.js', 'utf8');
const mapSource = fs.readFileSync('js/travel-map.js', 'utf8');
const generator = fs.readFileSync('scripts/generate-article-pages.mjs', 'utf8');
const css = fs.readFileSync('css/main.css', 'utf8');
const articleCss = fs.readFileSync('css/article.css', 'utf8');
const photographyScript = fs.readFileSync('js/photography.js', 'utf8');

if (content.publications.length !== 7) throw new Error('Expected 7 publications');
if ('blog' in content) throw new Error('Blog metadata must come from co-located Markdown, not content.json');
if (blogs.posts.length !== 6) throw new Error('Expected 6 generated blog posts');
if (content.recommendations.length !== 2) throw new Error('Expected 2 recommendations');
if (content.experience.length !== 2) throw new Error('Expected 2 experience entries');
if (content.travel.cities.length !== 26) throw new Error('Expected 26 travel points');
if (content.stats.papers !== content.publications.length) throw new Error('Paper counter is stale');
if (content.stats.cities !== content.travel.cities.length) throw new Error('City counter is stale');
if ('photography' in content) throw new Error('Photography metadata must come from data/photography.json');
if (!Array.isArray(photography.albums) || photography.albums.length !== 2) {
  throw new Error('Photography must contain exactly two albums');
}
const albumIds = new Set();
for (const album of photography.albums) {
  if (!/^[a-z0-9-]+$/.test(album.id) || albumIds.has(album.id)) {
    throw new Error(`Invalid or duplicate photography album ID: ${album.id}`);
  }
  albumIds.add(album.id);
  if (!album.title || !album.description || !Array.isArray(album.photos)) {
    throw new Error(`Incomplete photography album: ${album.id}`);
  }
  if (album.cover !== null && album.cover !== undefined &&
      (typeof album.cover !== 'string' || !/^(?:https?:\/\/|\/)/i.test(album.cover))) {
    throw new Error(`Photography ${album.id} has an invalid cover URL`);
  }
  if (album.oss !== undefined && (typeof album.oss !== 'object' || album.oss === null)) {
    throw new Error(`Photography ${album.id} has an invalid OSS override`);
  }
  if (album.oss?.cover !== undefined &&
      (typeof album.oss.cover !== 'string' || !/^https:\/\//i.test(album.oss.cover))) {
    throw new Error(`Photography ${album.id} has an invalid OSS cover URL`);
  }
  const photoIds = new Set();
  for (const photo of album.photos) {
    if (!photo.id || photoIds.has(photo.id)) throw new Error(`Photography ${album.id} has duplicate photo IDs`);
    photoIds.add(photo.id);
    const hasLocalThumbnail = typeof photo.thumbnail === 'string' && /^(?:https?:\/\/|\/)/i.test(photo.thumbnail);
    if (photo.src !== null && photo.src !== undefined &&
        (typeof photo.src !== 'string' || !/^(?:https?:\/\/|\/)/i.test(photo.src))) {
      throw new Error(`Photography ${album.id} has an invalid local src URL`);
    }
    if (photo.oss !== undefined && (typeof photo.oss !== 'object' || photo.oss === null)) {
      throw new Error(`Photography ${album.id} has an invalid OSS override`);
    }
    for (const key of ['thumbnail', 'src']) {
      if (photo.oss?.[key] !== undefined &&
          (typeof photo.oss[key] !== 'string' || !/^https:\/\//i.test(photo.oss[key]))) {
        throw new Error(`Photography ${album.id} has an invalid OSS ${key} URL`);
      }
    }
    if (!hasLocalThumbnail && !/^https:\/\//i.test(photo.oss?.thumbnail || '')) {
      throw new Error(`Photography ${album.id} has no usable thumbnail URL`);
    }
    if (!photo.title || photo.title === photo.id || !photo.alt ||
        (photo.width !== undefined && (!Number.isInteger(photo.width) || photo.width <= 0)) ||
        (photo.height !== undefined && (!Number.isInteger(photo.height) || photo.height <= 0))) {
      throw new Error(`Photography ${album.id} has incomplete photo metadata`);
    }
  }
}

const education = content.education.map(item => item.period).join(' ');
if (!education.includes('2021-2025') || !education.includes('2025-Present')) {
  throw new Error('Education dates are incorrect');
}

const experienceLabels = content.experience.map(item =>
  `${item.organization}${item.role ? ` ${item.role}` : ''}`);
if (JSON.stringify(experienceLabels) !== JSON.stringify([
  'SYSU SuperComputing Team',
  'SYSU AeroSwift Team Member'
])) {
  throw new Error('Experience labels are incorrect');
}
for (const item of content.experience) {
  if (item.period !== '2022-2025') throw new Error('Experience dates are incorrect');
  if (!item.icon.startsWith('/assets/experience/') || !fs.existsSync(item.icon.slice(1))) {
    throw new Error(`Missing local experience icon: ${item.icon}`);
  }
}

const everest = content.travel.cities.find(city => city.name === 'Everest North Base Camp');
if (!everest || everest.lat !== 28.14139 || everest.lng !== 86.85139) {
  throw new Error('Everest North Base Camp coordinates are incorrect');
}

function markdownSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownSources(entryPath);
    return entry.name === 'index.md' ? [entryPath] : [];
  });
}

const sources = fs.readdirSync('.', { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^\d{4}$/.test(entry.name))
  .flatMap(entry => markdownSources(entry.name));
if (sources.length !== blogs.posts.length) throw new Error('Blog manifest and Markdown source counts differ');

for (const post of blogs.posts) {
  const articleDirectory = decodeURIComponent(new URL(post.url, 'https://local.test').pathname)
    .replace(/^\/+|\/+$/g, '');
  const markdownPath = path.join(articleDirectory, 'index.md');
  const htmlPath = path.join(articleDirectory, 'index.html');
  if (!fs.existsSync(markdownPath)) throw new Error(`Missing Markdown source: ${markdownPath}`);
  if (!fs.existsSync(htmlPath)) throw new Error(`Missing generated article: ${htmlPath}`);
  const article = fs.readFileSync(htmlPath, 'utf8');
  if (!article.includes('Generated from the co-located index.md file') ||
      !article.includes('background-open-button--floating') ||
      !article.includes('/assets/favicon.svg') ||
      article.includes('article-renderer.js') ||
      /\{\{ARTICLE_[A-Z_]+\}\}/.test(article)) {
    throw new Error(`Generated article is incomplete: ${htmlPath}`);
  }
}

const removedPaths = [
  'archives', 'assets/avatar.jpg.bak0', 'assets/build', 'css/common', 'css/layout',
  'css/style.css', 'data/blog-source', 'fonts/Chillax', 'js/article-renderer.js',
  'js/layouts', 'js/libs', 'js/plugins', 'js/tools', 'lib'
];
for (const removedPath of removedPaths) {
  if (fs.existsSync(removedPath)) throw new Error(`Legacy path remains: ${removedPath}`);
}

const diskBackgrounds = fs.readdirSync('images/backgrounds')
  .filter(file => /\.(?:avif|gif|jpe?g|png|webp)$/i.test(file))
  .sort((left, right) => {
    const order = Number(left.split('__')[0]) - Number(right.split('__')[0]);
    return order || left.localeCompare(right, 'en', { numeric: true });
  });
for (const file of diskBackgrounds) {
  const extension = path.extname(file);
  const parts = file.slice(0, -extension.length).split('__');
  if (parts.length !== 4 || !/^\d+$/.test(parts[0]) || parts.slice(1).some(part => !part)) {
    throw new Error(`Invalid background filename: ${file}`);
  }
}
if (JSON.stringify(backgrounds.backgrounds.map(item => item.file)) !== JSON.stringify(diskBackgrounds)) {
  throw new Error('Background manifest is not synchronized or sorted');
}
if (!backgrounds.backgrounds[0] || backgrounds.backgrounds[0].order !== 0) {
  throw new Error('The active background must begin with order 0');
}

if ((mapSource.match(/L\.map\(/g) || []).length !== 1 || !mapSource.includes('L.circleMarker')) {
  throw new Error('Expected one direct-marker Leaflet map');
}
if (/cluster|maplibre|geo\.datav/i.test(mapSource + homepage + css)) {
  throw new Error('Legacy map implementation remains');
}
if (!backgroundManager.includes("'/data/backgrounds.json'") ||
    /background-image:\s*url\(['"]?\/images\/backgrounds/i.test(css)) {
  throw new Error('Background selection is not manifest-driven');
}
if (!homepage.includes('id="publications"') || !homepage.includes('id="blog"') ||
    !homepage.includes('id="experience"') || !homepage.includes('id="honors"') ||
    !homepage.includes('id="service"') || !homepage.includes('id="recommendations"')) {
  throw new Error('A homepage section is missing its stable ID');
}
if ((homepage.match(/content-card--dense/g) || []).length !== 2) {
  throw new Error('Publication and Blog must both use the dense feather layer');
}
if (!renderer.includes("fetch('/data/blogs.json')") || !renderer.includes('renderRecommendations()') ||
    !renderer.includes('class="blog-meta"') || !renderer.includes('class="blog-read-more"')) {
  throw new Error('Generated blog metadata or homepage sections are not rendered');
}
if (!homepage.includes('id="photoGallery"') || !homepage.includes('id="photoLightbox"') ||
    !homepage.includes('/js/photography.js') || !renderer.includes("fetch('/data/photography.json')") ||
    !photographyScript.includes('photo-album-card') || !photographyScript.includes('photo-thumb') ||
    !photographyScript.includes("item?.oss?.[key]")) {
  throw new Error('Photography album and lightbox wiring is incomplete');
}
if (!template.includes('{{ARTICLE_BODY}}') || !template.includes('{{ARTICLE_NAVIGATION}}') ||
    !template.includes('content-card--dense') || !template.includes('class="sidebar"')) {
  throw new Error('The static Markdown article template is incomplete');
}
if (!template.includes('background-open-button--floating') || !template.includes('id="backgroundOverlay"') ||
    !notFound.includes('background-open-button--floating') || !notFound.includes('id="backgroundOverlay"')) {
  throw new Error('A secondary page is missing the full-background control');
}
for (const page of [homepage, notFound, template]) {
  if (!page.includes('/assets/favicon.svg') || /rel="icon"[^>]+avatar\.jpg/.test(page)) {
    throw new Error('A page still uses the profile avatar as its favicon');
  }
}
if (!backgroundManager.includes("document.querySelector('.main-content, .error-main')") ||
    !backgroundManager.includes("sidebar?.classList.add('is-background-hidden')")) {
  throw new Error('The full-background manager does not support every page layout');
}
if (renderer.includes("querySelectorAll('.sidebar-section')") ||
    /lockBackgroundControl|is-locked|is-replaced/.test(backgroundManager + css)) {
  throw new Error('A legacy positional renderer or background control remains');
}
if (!generator.includes('html: false') || !generator.includes('stable_heading_ids') ||
    !generator.includes('standalone_scaled_images') || !generator.includes('highlight-container') ||
    !articleCss.includes('.article-body .highlight-container')) {
  throw new Error('Markdown safety, stable anchors, or legacy code-block visuals are missing');
}
if (!css.includes('--avatar-scale: 1') || !css.includes('--avatar-focus-y: 50%') ||
    !css.includes('--dense-layer-alpha: 0.50') || !css.includes('--pub-copy-line-height: 1.2') ||
    !css.includes('--pub-action-line-height: 1.2') || !css.includes('--pub-action-gap-top: 0.24rem')) {
  throw new Error('Avatar, feather, or publication density variables are incorrect');
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
  -not -path './.git/*' -not -path './node_modules/*' -print0)

if (( failed != 0 )); then
  echo "Site validation failed."
  exit 1
fi

echo "Site validation passed."
