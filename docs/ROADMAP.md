# Roadmap

Ideas that are not built yet, with the reasoning, so a later decision does not start from zero. Nothing here is promised. Items move to the [changelog](../CHANGELOG.md) when they ship.

## Access control

Today anybody on the network can add, edit and delete matches, players and teams; only the admin pages ask for the password. That is deliberate: recording a result must stay one tap.

The realistic risk in an office is a mistake or a prank, not an attacker. The usual advice for this case (OWASP calls it proportionate access control with logging) is to make damage hard and, above all, reversible. The options below are ordered by how much protection they give for how little friction.

1. **Keep it off the internet.** Reachable from the office network only. For access from outside, use a VPN (Tailscale or WireGuard), never a port-forward on the router. No code, no friction.
2. **Snapshots of the data.** A scheduled ZFS snapshot of the dataset that holds the database (daily, kept 30 days) on TrueNAS. Vandalism or a wrong bulk edit is undone by a rollback. No code.
3. **Admin or PIN for edit and delete.** Adding a match stays open. Editing or deleting an existing match, or renaming a player, needs the admin login or a short office PIN. Results are added far more often than they are fixed, so daily use does not change.
4. **Office PIN remembered per device.** Everyone types the PIN once and the browser remembers it for months. It keeps out casual visitors on the Wi-Fi, not a determined colleague, which matches the threat.
5. **Rate limit and audit trail.** Limit how many matches one device can add per minute, and store who created, edited or deleted what and when. A flood of fake results is easy to spot and to undo.

Suggested order: 1 and 2 first (infrastructure only), then 3 and 5 in the app, and 4 only if misuse is actually seen.

## Seasons

- A free-text name for a season ("Autumn cup") next to its number.
- A scheduled start of a new season (for example every quarter) instead of the manual button.

## Product

- More team achievements for pairs, if people want them (the first set is small on purpose).
- Export of all matches as CSV from the admin pages.

## Technical upkeep

- TypeScript 7 once its first stable minor releases (planned for late November 2026).
- Drop the `prebuild-install` warning when Prisma's SQLite adapter supports better-sqlite3 13.
- Reconsider next-auth 4 (Auth.js, Better Auth) when the admin login needs more than a password.
- Run `docker compose build` and `prisma migrate deploy` in CI; today they are first exercised on the NAS.
