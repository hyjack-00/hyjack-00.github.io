#!/bin/bash
# Quick validation script for academic homepage

echo "================================"
echo "Academic Homepage Validation"
echo "================================"
echo ""

# Check if main files exist
echo "📁 Checking main files..."
files=(
  "index.html"
  "css/academic-modern.css"
  "js/main-academic.js"
  "assets/avatar.jpg"
  "fontawesome/fontawesome.min.css"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
  fi
done

echo ""
echo "📊 File sizes..."
du -h index.html css/academic-modern.css js/main-academic.js 2>/dev/null

echo ""
echo "🖼️  Background images folder..."
if [ -d "images/backgrounds" ]; then
  echo "  ✓ Folder exists"
  echo "  Files:"
  ls -lh images/backgrounds/ 2>/dev/null | tail -n +2 || echo "    (empty - add your background image)"
else
  echo "  ✗ Folder missing"
fi

echo ""
echo "🔍 HTML Structure Check..."
grep -c "section class=\"section glass-card\"" index.html | xargs echo "  Number of sections:"
grep -c "pub-link" index.html | xargs echo "  Publication link placeholders:"
grep -c "award-item" index.html | xargs echo "  Award entries:"

echo ""
echo "🎨 CSS Check..."
grep -c "\.glass-card" css/academic-modern.css | xargs echo "  Glass card styles:"
grep -c "\.pub-" css/academic-modern.css | xargs echo "  Publication styles:"
grep -c "@media" css/academic-modern.css | xargs echo "  Responsive breakpoints:"

echo ""
echo "✅ Validation complete!"
echo ""
echo "Next steps:"
echo "  1. Add your background image to images/backgrounds/"
echo "  2. Update personal information in index.html"
echo "  3. Replace avatar.jpg with your photo"
echo "  4. Test in browser: open index.html"
echo ""
