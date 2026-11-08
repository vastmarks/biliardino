# Logo sources

The biliardino logo is drawn by code, so it can be changed precisely and regenerated in every format. The guide to using it is [docs/BRAND.md](../../docs/BRAND.md).

| File | What it does |
| --- | --- |
| `word.py` | turns text into outlines with Geist, the app's own font (`src/fonts/`) |
| `logo.py` | the logo (the name with the players on a rod, light/dark/mono/reverse), the icon drawing, the app icons and the favicon |
| `build-app-assets.sh` | regenerates everything and copies the app's files into `public/` |

## Regenerating

1. Install the tools once (macOS): `brew install librsvg imagemagick` and `pip3 install fonttools brotli uharfbuzz`.
2. From the repository root: `sh design/logo/build-app-assets.sh`. All variants land in `design/logo/out/` (not committed); the app's icons and header logos are updated in `public/`.
3. If the icons changed, raise the `?v=` number on the icon links in `src/pages/_document.tsx` and `public/manifest.webmanifest`, so browsers fetch the new ones.

The earlier dino logo (0.8.0–0.10.0) is in the git history of this folder.
