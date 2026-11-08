# biliarDino brand guide

The logo, colours and typeface of the app, and how to use them. The logo files are generated from code in [`design/logo/`](../design/logo/README.md); never edit the SVGs by hand.

## The logo

A baby dinosaur hatching out of a football, next to the name **biliarDino**.

| File | Use |
| --- | --- |
| `public/brand/logo-light.svg` | horizontal logo on light backgrounds (the app header) |
| `public/brand/logo-dark.svg` | horizontal logo on dark backgrounds |
| `public/brand/mark.svg` | the dino alone |
| `public/icon.svg`, `public/favicon.ico` | browser tab (simplified mark) |
| `public/apple-touch-icon.png`, `public/icon-*.png` | phone home screen (iOS square, Android rounded and maskable) |

More variants (one colour, reversed on celeste, stacked, night icon) come out of `design/logo/build-app-assets.sh` in `design/logo/out/`.

**Construction.** Everything sits on a 96 × 96 grid: the football shell is a circle of diameter 60; the crack has three teeth; the head is symmetric on the centre line, with the eyes set low and wide; three spikes on top; two paws grip the rim; a 2.6-unit cut separates head, paws and shell so the mark also works in one colour.

**Small sizes.** At 32 px and below use the simplified mark (already used by the favicon): one spike, larger eyes without highlight, no snout details, no seams on the ball, thicker rim.

**Clear space.** Keep free space around the logo equal to half the height of the dino mark. **Minimum size.** Horizontal logo 24 px tall; mark 16 px.

**Don't** outline the mark, add shadows or gradients, rotate it, change its colours, or set the name in another typeface.

## Colours

| Role | Light theme | Dark theme |
| --- | --- | --- |
| Page background | `#F0F5F9` | `#0A1621` |
| Cards | `#FFFFFF` | `#112231` |
| Borders | `#DCE7EF` | `#22384B` |
| Text | `#0A1621` | `#F0F5F9` |
| Muted text | `#52667A` | `#94AABD` |
| Logo: dino head, "biliar" | `#1597D3` | `#7FD3F5` |
| Logo: football, spikes, "Dino" | `#0B6896` | `#D6F1FC` (ball) / `#45BAEC` (spikes) |
| Buttons (white text) | `#0A78AD` | `#0A78AD` |
| Links | `#0A78AD` | `#7FD3F5` |
| Win, +rating | `#15803D` | `#4ADE80` |
| Loss, errors | `#C62828` | `#F87171` |
| Highlight ("sole") | `#F2A20C` | `#FFC24D` |

Every text colour meets WCAG 2.2 AA contrast (4.5:1, or 3:1 for large text) on its background. In code: `tailwind.config.js` (the celeste scale also answers to `blue-*` and `sky-*`) and the CSS variables at the top of `src/styles/globals.css` for the colours that change with the theme.

## Typeface

[Outfit](https://github.com/Outfitio/Outfit-Fonts) (SIL Open Font Licence 1.1): the wordmark ("biliar" Regular 400, "Dino" SemiBold 600) and the headings in the app. It's bundled with the app (`src/fonts/`, Latin characters only, 33 kB), so no request goes to Google. Body text uses the device's system font.

## Sources

- Cuteness and the baby schema (big head, large low-set eyes, small nose and mouth): [Glocker et al., University of Pennsylvania](https://repository.upenn.edu/entities/publication/2bfa14b1-140d-43bc-94ac-6dbffa99194a)
- Mascot shapes and eyes: [10 tips for kawaii character design](https://www.creativebloq.com/character-design/10-tips-kawaii-character-design-514833)
- Small-size logos and favicons: [What makes a logo work at 16×16 pixels](https://dev.to/alphashark/what-makes-a-logo-work-at-16x16-pixels-c4i)
- Contrast: [WCAG 2.2, contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- Maskable icons (safe zone): [web.dev](https://web.dev/articles/maskable-icon)
