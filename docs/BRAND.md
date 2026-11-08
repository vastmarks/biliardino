# biliardino brand guide

The logo, colours and typeface of the app, and how to use them. The logo files are generated from code in [`design/logo/`](../design/logo/README.md); never edit the SVGs by hand.

## The logo

The name **biliardino**, always lowercase and in one word, set in Geist SemiBold. The dots of its three i's are **players on a foosball rod**: a thin rod runs through them across the whole word, the way a rod crosses the table. The app icon takes the **b** of the name with the rod at the top of its stem and one player beside it.

| File | Use |
| --- | --- |
| `public/brand/logo-light.svg` | the logo on light backgrounds (the app header) |
| `public/brand/logo-dark.svg` | the logo on dark backgrounds |
| `public/brand/mark.svg` | the icon's drawing without its square (b, rod, player) |
| `public/icon.svg`, `public/favicon.ico` | browser tab: the icon with a thicker rod, so it survives 16 px |
| `public/apple-touch-icon.png`, `public/icon-*.png` | phone home screen: iOS square (iOS rounds it), Android rounded, and maskable (drawing inside the safe zone) |

One-colour (`logo-mono`) and reversed (`logo-reverse`, white on celeste) versions come out of `design/logo/build-app-assets.sh` in `design/logo/out/`.

**Construction.** The players are a little bigger than ordinary i-dots (radius 0.105 of the font size) and sit exactly where the dots were. The rod is thin (0.032 of the font size), lighter than the players, runs behind the letters and reaches just past both ends of the word. The icon uses the same b and the same proportions on a 96 × 96 grid.

**Colours and sizes.** The icon has three tones only: celeste background, white b and player, navy rod. It was chosen because it stays clear in both light and dark browser tabs; colours that are close together blur into one at a few pixels, so the small icons don't use more.

**Clear space.** Keep free space around the logo equal to the height of the letter b. **Minimum size.** Logo 20 px tall; icon 16 px.

**Don't** add shadows or gradients, change the colours, move the players off the i's, or set the name in another typeface.

## Colours

| Role | Light theme | Dark theme |
| --- | --- | --- |
| Page background | `#F0F5F9` | `#0A1621` |
| Cards | `#FFFFFF` | `#112231` |
| Borders | `#DCE7EF` | `#22384B` |
| Text | `#0A1621` | `#F0F5F9` |
| Muted text | `#52667A` | `#94AABD` |
| Logo: letters | `#0A1621` | `#F0F5F9` |
| Logo: players | `#0A78AD` | `#45BAEC` |
| Logo: rod | `#45BAEC` | `#7FD3F5` |
| Icon | background `#0A78AD`, b and player `#FFFFFF`, rod `#0A1621` | same |
| Buttons (white text) | `#0A78AD` | `#0A78AD` |
| Links | `#0A78AD` | `#7FD3F5` |
| Win, +rating | `#15803D` | `#4ADE80` |
| Loss, errors | `#C62828` | `#F87171` |
| Highlight ("sole") | `#F2A20C` | `#FFC24D` |

Every text colour meets WCAG 2.2 AA contrast (4.5:1, or 3:1 for large text) on its background. In code: the `@theme` block at the top of `src/styles/globals.css` (the celeste scale also answers to `blue-*` and `sky-*`), followed by the colours that change with the theme.

## Typeface

- **The app: [Geist](https://vercel.com/font)** (by Vercel, SIL Open Font Licence 1.1) for all text, headings included. Chosen from Geist, Gantari, Inter and Plus Jakarta Sans by comparing them on the real pages: crisp and modern, and it has same-width digits, so scores and ratings line up in columns (`tabular-nums`). Bundled with the app (`src/fonts/`, Latin characters only, 28 kB): no request to Google, and the same look on every device instead of each system's own font.
- **The logo** uses the same Geist, SemiBold 600; the logo files contain the letters as outlines.

## Sources

- Small-size logos and favicons: [What makes a logo work at 16×16 pixels](https://dev.to/alphashark/what-makes-a-logo-work-at-16x16-pixels-c4i), [Favicon design: contrast, colour and what works at 16 px](https://wildandfreetools.com/blog/favicon-design-contrast-readability)
- Which favicon files and tags: [How to favicon (Evil Martians)](https://evilmartians.com/chronicles/how-to-favicon-in-six-files-that-fit-most-needs)
- Contrast: [WCAG 2.2, contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- Maskable icons (safe zone): [web.dev](https://web.dev/articles/maskable-icon)
