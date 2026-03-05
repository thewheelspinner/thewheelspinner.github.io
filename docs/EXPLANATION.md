# TheWheelSpinner One-Page App

## What was updated
- Rebuilt the page into a one-page app with a sticky navigation bar (`Play`, `How it works`, `Customize`).
- Added a customizable spinner interface with:
  - editable entries (one per line)
  - theme presets
  - spin duration control
  - min/max round controls
  - shuffle entries action
- Added social preview metadata for Open Graph and Twitter.
- Added generated OG media:
  - `assets/og/og-image.png`
  - `assets/og/spinner-preview.mp4`

## Tailwind usage
- Tailwind CSS is loaded through CDN.
- Typography plugin is enabled with `https://cdn.tailwindcss.com?plugins=typography`.
- Text and buttons are styled using Tailwind utility classes and `prose` typography classes.

## Source-generation split (public repo safety)
To keep generation scripts out of this public repo, all source scripts for OG media live in a separate repo:
- Source repo: `https://github.com/thewheelspinner/thewheelspinner-source-data`
- Script: `scripts/generate-media.js`
- Build command: `npm run build:media`

Only generated media files are copied into this public site repo.
