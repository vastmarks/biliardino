# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.11.0] - 2026-11-08

### Changed

- **New logo**: the name **biliardino**, all lowercase, with the dots of its three i's turned into players on a foosball rod. The app icon is the b of the name with the rod and one player (celeste, white, navy). It replaces the dino.
- Icons with few colours so they stay clear in browser tabs, light and dark

### Fixed

- On a player's page the rating chart overlapped the Partners and Opponents tables on wide screens
- Browsers that had visited the app before kept showing the old Hilde icon in the tab: the icon addresses now carry a version (`?v=3`), so every browser fetches the new one

## [0.10.0] - 2026-11-08

### Changed

- Everything brought up to date: **Next.js 16**, **Prisma 7**, **Tailwind CSS 4**, **ESLint 10** (8 and 9 are no longer supported), Jest 30, and the latest tRPC, TanStack Query and zustand. The app looks and behaves the same: 8 pages were compared pixel by pixel in light and dark, on phone and desktop.
- A clean install prints one warning instead of four (`prebuild-install`, which comes with the SQLite driver and goes away with a future Prisma version)
- Seasons page (admin): **Start season N** creates the next season and makes it current in one step; each season shows its dates (first and last match) and number of matches; clear dialogs for _Make current_ and _Delete_
- Hall of Fame: each season shows the months it was played
- **New typeface: Geist** for all text, bundled with the app, so biliarDino looks the same on every computer and phone (before, body text used each device's own system font). Scores in match lists use it too, with same-width digits.

### Fixed

- Deleting a season did nothing: the server refused seasons with matches but the page showed no error. Any season except the current one can now be deleted; one with matches is deleted together with its matches, team ratings and achievements, after typing its number.

### Technical

- `src/middleware.ts` is now `src/proxy.ts` (the Next.js 16 name)
- Database settings in `prisma.config.ts`; the Prisma client is generated into `src/generated/prisma` (created by `npm install`, not in git)
- ESLint configured in `eslint.config.mjs` and run with `eslint .` (`next lint` no longer exists)
- Tailwind theme (colours, fonts) moved from `tailwind.config.js` to `src/styles/globals.css`

## [0.9.0] - 2026-11-08

### Added

- **Hall of Fame** (`/hall-of-fame`) replaces the Leaderboards page: all-time records (highest rating, longest win streak, most wins, biggest win, biggest upset, marathon day) and the champion and best pair of every season. The old `/leaderboards` address redirects there.
- Matches page filters: format (All / 1v1 / 2v2), player, and season including "All seasons". The filters are kept in the address, e.g. `/matches?player=anna&format=2v2`.

### Changed

- Every player name links to the player's profile: in match lists (each name of a pair separately), on team pages, in the Hall of Fame and under Manage players
- Player slots in the match entry have a single border per state: dashed when empty, solid celeste while picking, team colour when filled
- The season selector in the header is a small pill, aligned with the logo's lettering

### Removed

- The Leaderboards page and its "Team 1 / Team 2" filters on the Matches page

## [0.8.0] - 2026-11-08

### Added

- New identity: the biliarDino logo (a baby dinosaur hatching from a football) in the header, the browser tab and on the phone home screen, with light and dark versions
- `docs/BRAND.md`, the brand guide; `design/logo/`, the logo as code with a script that regenerates every logo file and app icon

### Changed

- Celeste colour palette for light and dark themes; muted text, wins, losses and links now meet WCAG AA contrast in both themes
- Headings use the Outfit typeface, bundled with the app (no request to Google)
- Android maskable icon is now a separate file with the mark inside the safe zone

## [0.7.1] - 2026-11-08

### Changed

- Renamed from Hilde to **Biliardino** (app name, icons, Docker image, compose files, docs). An existing `hilde.db` in the data folder is renamed to `biliardino.db` automatically on the first start. Compose setting `HILDE_PORT` is now `BILIARDINO_PORT`. Credit to the original project is kept in the README, the footer and the LICENSE.

### Added

- `docs/LOCAL.md`: running it on a Mac with Docker, every command explained
- `docs/ARCHITECTURE.md`: how the app is built, for newcomers to the code

## [0.7.0] - 2026-11-07

### Added

- Edit and delete matches: anyone within 24 hours of entry, the admin always (**✎ Edit** on every match)
- Rename, archive and delete players (**Players** page); deleting a player who has matches is admin-only with a typed-name confirmation
- Type-ahead player search on the home page (keyboard friendly on mobile), with "add new player" for unknown names
- **Home** tab in the navigation, and an _Admin_ link in the footer
- Database migration adding `player.archived` (applied automatically on start)

### Changed

- Teams page: **Singles (1v1) / Pairs (2v2)** tabs replace the confusing team-size filter

### Fixed

- The match note could not be closed once opened; it now has a remove button, is trimmed and saved with the match

## [0.6.0] - 2026-11-05

### Fixed

- Deleting a match no longer corrupts team ratings (the loser's rating was lowered instead of restored); deleting a match, team or achievement now recalculates the whole season from the remaining matches
- Deleting a team corrected nobody else's rating; removing an achievement took the points from the wrong season
- Two matches saved at the same moment could overwrite each other's team ratings: all writes are now transactional
- Team ratings now treat a draw as half a win (like the player ratings) instead of a loss for both
- Leaderboards page showed "Infinity" matches per day on a season's first day
- The current season (or one with matches) could be deleted; a duplicate season number gave a server error
- Docker build failed: `npm ci` ran `prisma generate` before the schema was copied; runtime image lacked OpenSSL for the Prisma CLI

### Changed

- `NEXTAUTH_URL` is optional in Docker (`AUTH_TRUST_HOST`); the image can run as any user (e.g. TrueNAS `568:568`) and explains clearly when the data folder isn't writable; `/api/health` for the healthcheck
- Admin password check is constant-time and slows down wrong guesses
- Input limits on every API call (e.g. max. 2 players per side, scores 0-99); Zod 4
- Dockge stack uses the image GitHub publishes on release; CI builds the Docker image on every push
- Removed unused code and dependencies (`date-fns`, `ts-node`, the old match form)

### Added

- `docs/DEPLOY.md`: step-by-step guide (GitHub, releases, TrueNAS + Dockge, updates, troubleshooting)
- API integration tests on a temporary database, team-stats tests, browser tests in `e2e/`; `npm run check`

## [0.5.0] - 2026-11-05

### Added

- Home page dashboard: mobile-first match entry (player chips, numeric keypad), leaderboard with period tabs / form / rank movement, top pairs, highlight tiles, recent matches; server-rendered
- Web app manifest and icons, `TZ` setting, `npm run db:seed-demo`

### Changed

- First Load JS of the home page 285 kB -> 146 kB (gzip): removed Nivo, react-toastify, react-tooltip, auto-animate, react-hook-form, react-icons and the next-auth client; own SVG chart and toast
- Responsive match list replaces the table; `/matches` defaults to the current season

### Fixed

- Season-less pages defaulting to season 1

## [0.4.0] - 2026-10-31

### Added

- Players are defined on the Players page; matches are entered by choosing 1v1/2v2 and picking players (teams are built from the players, so order never matters)
- Per-player statistics: `/players` leaderboard and `/players/<name>` profiles (rating history, partners, opponents, formats, streaks)
- `.env.example`, environment validation for `ADMIN_PASSWORD` / `NEXTAUTH_SECRET`

### Changed

- Next.js 15, React 19, tRPC 11, TanStack Query 5, Prisma 6, TypeScript 5.9, Node 22
- Database switched from MySQL to SQLite (new initial migration, no automatic data migration)
- Docker image rebuilt (multi-stage, non-root, runs migrations on start); CI publishes to GHCR
- `next-seo` replaced by `next/head`

### Fixed

- A new installation had no active season, so matches could not be entered in the UI (season 1 is now created by the migration)
- Deleting matches, teams and achievements required no authentication, now admin only
- No more default admin password / session secret
- Placeholder `id: 0` on team creation (only worked on MySQL)

## [0.3.1] - 2023-16-01

### Fixed

- Fixed first match achievement condition

## [0.3.0] - 2023-15-01

### Added

- Added season management
- Added achievement deletion
- Added duplicate match prevention
- Added achievement tests
- Added season selector

### Changed

- Improved match deletion

### Fixed

- Fix Underdog and similar achievements

## [0.2.0] - 2022-12-21

### Added

- Added seasons
- Added team profiles
- Added achievements
- Added dark mode
- Added match table filtering
- Added animations
- Added tRPC
- Added CHANGELOG
- Added README
- Added LICENSE
- Added GitHub workflow
- Added utility scripts (`utils:migrate-sqlite` and `teams:recalculate-ratings`)

### Changed

- Switched from SQLite to MySQL
- Improved React component structure
- Changed elo `k` factor to be dynamic

### Fixed

- Fixed OpenSSL alpine docker issue (by using `alpine:3.16` instead of `alpine:latest`)

### Removed

- Removed old Statistics page
- Removed monthly leaderboards (for now)

## [0.1.0] - 2022-04-27

### Added

- Initial Release
