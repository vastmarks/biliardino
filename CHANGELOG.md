# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
