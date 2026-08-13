#!/usr/bin/env bash
set -euo pipefail

readonly IMAGE_LIMIT=500000
readonly REQUIRED_FILES=(
  "index.html"
  "css/main.css"
  "css/vendor/maplibre-gl.css"
  "js/content-renderer.js"
  "js/travel-map.js"
  "js/vendor/maplibre-gl.js"
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
node --check js/content-renderer.js
node --check js/travel-map.js
node -e "JSON.parse(require('fs').readFileSync('data/content.json', 'utf8'))"

echo "Checking content counters..."
node <<'NODE'
const content = require('./data/content.json');
if (content.stats.papers !== content.publications.length) {
  throw new Error(`stats.papers is ${content.stats.papers}, expected ${content.publications.length}`);
}
if (content.stats.cities !== content.travel.cities.length) {
  throw new Error(`stats.cities is ${content.stats.cities}, expected ${content.travel.cities.length}`);
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

echo "Checking map implementation..."
node <<'NODE'
const fs = require('fs');
const source = fs.readFileSync('js/travel-map.js', 'utf8');
const mapInstances = (source.match(/new maplibregl\.Map/g) || []).length;
const geojsonSources = (source.match(/type: 'geojson'/g) || []).length;

if (mapInstances !== 1) {
  throw new Error(`Expected one map instance, found ${mapInstances}`);
}
if (geojsonSources !== 1) {
  throw new Error(`Expected one GeoJSON source, found ${geojsonSources}`);
}
if (!source.includes('cluster: false')) {
  throw new Error('Travel points are not explicitly unclustered');
}
if (/geo\.datav|loadChinaBoundaries|loadDetailedCityBoundaries/.test(source)) {
  throw new Error('Legacy boundary loading is still present');
}
if (/unpkg\.com\/maplibre/.test(source)) {
  throw new Error('MapLibre runtime still depends on unpkg');
}
NODE

if (( failed != 0 )); then
  echo "Homepage validation failed."
  exit 1
fi

echo "Homepage validation passed."
