# Academic Homepage Setup Guide

## 📋 Overview
This is a modern academic personal homepage with glass morphism design, optimized for researchers and Ph.D. students.

## 🎨 Design Features
- **Glass morphism effect**: Frosted glass cards with backdrop blur
- **Compact layout**: Information-dense design inspired by top academic homepages
- **Professional styling**: Clean typography, proper spacing, academic color scheme
- **Responsive design**: Works on desktop, tablet, and mobile devices
- **Publication showcase**: Detailed publication entries with badges and links

## 📁 File Structure
```
/workspace/hyjack-00.github.io/
├── index.html                    # Main homepage
├── css/
│   ├── academic-modern.css       # Main stylesheet (currently used)
│   ├── academic-clean.css        # Alternative clean style
│   └── academic-home.css         # Old style (backup)
├── js/
│   └── main-academic.js          # JavaScript for homepage
├── images/
│   └── backgrounds/
│       └── README.md             # Instructions for background images
├── assets/
│   ├── avatar.jpg                # Profile photo
│   └── lantern-light.png         # Favicon
└── fontawesome/                  # Icons library
```

## 🚀 Quick Start

### 1. Add Your Background Image
1. Place your background image in `/images/backgrounds/`
2. Recommended specs: 1920x1080, JPG/PNG, < 500KB
3. Update CSS at line 63 in `academic-modern.css`:
   ```css
   background: url('/images/backgrounds/your-image.jpg') center/cover no-repeat;
   ```

### 2. Update Personal Information
Edit `index.html` and update:
- **Name**: Line 47 (English and Chinese names)
- **Email**: Line 54
- **GitHub**: Line 57
- **Google Scholar**: Line 60
- **About section**: Lines 70-76
- **Research interests**: Lines 84-89

### 3. Add Publications
When you have publications, uncomment the template at lines 149-173 in `index.html`:
```html
<div class="publication-item">
  <div class="pub-title">Your Paper Title</div>
  <div class="pub-authors"><strong>Yujie Huang</strong>, Co-authors...</div>
  <div class="pub-venue"><strong>CONF 2024</strong> - <em>Full Conference Name</em></div>
  <div class="pub-abstract">Abstract here...</div>
  <div class="pub-links">
    <span class="pub-badge published">Published</span>
    <a href="#" class="pub-link"><i class="fa-solid fa-file-pdf"></i> Paper</a>
    <a href="#" class="pub-link"><i class="fa-brands fa-github"></i> Code</a>
    <a href="#" class="pub-link"><i class="fa-solid fa-link"></i> arXiv</a>
    <a href="#" class="pub-link"><i class="fa-solid fa-bookmark"></i> DOI</a>
    <a href="#" class="pub-link"><i class="fa-solid fa-chalkboard"></i> Slides</a>
  </div>
</div>
```

### 4. Update Awards and Education
- **Awards section**: Lines 184-218 in `index.html`
- **Education section**: Lines 225-251 in `index.html`

## 🎯 Publication Badge Types
The design includes three badge types:
- `pub-badge in-prep` - Yellow badge for "In Prep" papers
- `pub-badge published` - Green badge for published papers
- `pub-badge preprint` - Blue badge for preprints/arXiv papers

## 🎨 Customization

### Adjust Glass Effect Opacity
In `academic-modern.css`:
```css
/* Make background more visible (less opacity) */
.background-overlay {
  background: rgba(255, 255, 255, 0.75); /* Default: 0.85 */
}

/* Make glass cards more transparent */
.glass-card {
  background: rgba(255, 255, 255, 0.65); /* Default: 0.75 */
}
```

### Change Accent Color
In `academic-modern.css`, line 13:
```css
--accent-color: #0066cc; /* Change to your preferred color */
--link-color: #0066cc;
```

### Adjust Spacing (Make More Compact)
Already optimized for compact layout, but you can further reduce:
- Container padding: Line 81 (`padding: 25px 20px`)
- Glass card margins: Line 92 (`margin-bottom: 16px`)
- Section padding: Line 162 (`padding: 18px 24px`)

## 📱 Responsive Breakpoints
- Desktop: > 768px (default layout)
- Tablet: 481px - 768px (adjusted layout)
- Mobile: ≤ 480px (stacked layout)

## 🔗 Link Structure
All publication links use this format:
```html
<a href="URL" class="pub-link" target="_blank">
  <i class="fa-solid fa-ICON"></i> Label
</a>
```

Available icons:
- `fa-file-pdf` - Paper/PDF
- `fa-github` - GitHub Code
- `fa-link` - arXiv/Website
- `fa-bookmark` - DOI
- `fa-chalkboard` - Slides
- `fa-video` - Video

## ✅ Checklist Before Publishing
- [ ] Add your background image
- [ ] Update profile photo (`assets/avatar.jpg`)
- [ ] Update email address
- [ ] Add Google Scholar link
- [ ] Add CV link
- [ ] Update About section
- [ ] Verify all personal information
- [ ] Test on mobile devices
- [ ] Check all links work
- [ ] Add real publications when available

## 🎓 Comparison with Reference Site
This design is inspired by and comparable to [zhihan-jiang.com](https://zhihan-jiang.com/):
- ✅ Similar information density
- ✅ Compact spacing
- ✅ Publication badge system
- ✅ Author name highlighting
- ✅ Multiple link types (Paper/Code/arXiv/DOI)
- ✅ Professional academic tone
- ➕ Added glass morphism effect
- ➕ Added background image support
- ➕ More compact layout option

## 🔧 Troubleshooting

**Background not showing?**
- Check image path in CSS
- Ensure image file exists in `/images/backgrounds/`
- Clear browser cache

**Icons not displaying?**
- Verify Font Awesome files exist in `/fontawesome/`
- Check browser console for errors

**Layout broken on mobile?**
- Test responsive breakpoints
- Check viewport meta tag in HTML

**Glass effect not working?**
- Ensure browser supports backdrop-filter
- Check CSS vendor prefixes (-webkit-backdrop-filter)

## 📝 Notes
- The old homepage with travel map is backed up as `index-old-backup.html`
- Travel map cities include: NYC, Charlotte, Chicago (2024 additions)
- All external links open in new tab automatically
- Smooth scroll enabled for anchor links

## 🆘 Support
For issues or questions, check:
1. Browser console for errors
2. CSS file loaded correctly
3. All paths are absolute (start with `/`)
4. Font Awesome icons loaded

---
Last updated: August 2024
