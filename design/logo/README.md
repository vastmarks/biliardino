# Logo sources

The biliarDino logo is drawn by code: every shape is defined on a 96 × 96 grid in these Python files, so it can be changed precisely and regenerated in every format. The guide to using the logo is [docs/BRAND.md](../../docs/BRAND.md).

| File | What it draws |
| --- | --- |
| `mark.py` | the football eggshell: circle, crack, cut between head and shell |
| `ball.py` | the football pattern (centre pentagon, seams, rim pentagons) |
| `puppy.py` | shared crack helper |
| `front.py` | the baby dino: head, spikes, eyes, snout, paws; normal and small versions |
| `word.py` | sets the wordmark in Outfit and turns the letters into outlines |
| `brand.py` | colours per theme, logo layouts (horizontal, stacked), app icons, construction drawing |
| `build-app-assets.sh` | regenerates everything and copies the app's files into `public/` |

## Regenerating

1. Install the tools once (macOS): `brew install librsvg imagemagick` and `pip3 install fonttools uharfbuzz`.
2. Download the Outfit variable font into `design/logo/fonts/`:

   ```sh
   mkdir -p design/logo/fonts
   curl -L -o "design/logo/fonts/Outfit[wght].ttf" \
     "https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/Outfit%5Bwght%5D.ttf"
   ```

3. From the repository root: `sh design/logo/build-app-assets.sh`. All logo variants land in `design/logo/out/` (not committed); the app's icons and header logos are updated in `public/`.
