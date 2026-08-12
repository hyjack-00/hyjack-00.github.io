# Background Images Folder

This folder contains background images for the academic homepage.

## How to Add Background Images

1. Place your background image in this folder
2. Recommended image specifications:
   - Format: JPG, PNG, or WebP
   - Resolution: At least 1920x1080 (Full HD)
   - File size: Keep under 500KB for optimal loading
   - Aspect ratio: 16:9 or wider

3. Update the CSS file at `/css/academic-modern.css`:
   - Find the `.background` section
   - Update the `background` property with your image filename:
     ```css
     background: url('/images/backgrounds/your-image-name.jpg') center/cover no-repeat;
     ```

## Suggested Image Types

For an academic homepage, consider:
- Minimalist geometric patterns
- Soft gradient backgrounds
- Campus or lab photos (slightly blurred)
- Abstract textures (concrete, paper, fabric)
- Nature scenes (mountains, sky, water) with muted colors

## Current Setup

The default background uses a placeholder path:
- `/images/backgrounds/academic-bg.jpg`

The glass overlay effect (white with 85% opacity) ensures text remains readable regardless of the background image you choose.

## Tips

- Test your background with both light and dark images
- The glass effect works best with images that have some visual interest but aren't too busy
- If your image is too prominent, adjust the overlay opacity in CSS:
  - Look for `.background-overlay` in `academic-modern.css`
  - Increase `rgba(255, 255, 255, 0.85)` to make it more opaque (0.90 or 0.95)
