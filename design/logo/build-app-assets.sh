#!/bin/sh
# Regenerates the logo files and the app's icons from logo.py.
# Needs: python3 with fonttools, brotli and uharfbuzz; rsvg-convert (librsvg) and ImageMagick.
# Run from the repository root:  sh design/logo/build-app-assets.sh
set -e
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/out"
python3 "$here/logo.py" "$out"
cp "$out/logo-light.svg" public/brand/logo-light.svg
cp "$out/logo-dark.svg" public/brand/logo-dark.svg
cp "$out/mark-light.svg" public/brand/mark.svg
cp "$out/favicon.svg" public/icon.svg
rsvg-convert -w 192 "$out/app-icon.svg" -o public/icon-192.png
rsvg-convert -w 512 "$out/app-icon.svg" -o public/icon-512.png
rsvg-convert -w 512 "$out/app-icon-maskable.svg" -o public/icon-maskable-512.png
rsvg-convert -w 180 "$out/app-icon-square.svg" -o public/apple-touch-icon.png
for s in 16 32 48; do rsvg-convert -w $s "$out/favicon.svg" -o "$out/fav$s.png"; done
convert "$out/fav16.png" "$out/fav32.png" "$out/fav48.png" public/favicon.ico
echo "App assets updated."
