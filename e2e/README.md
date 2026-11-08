# Browser tests

End-to-end checks in real browsers (mobile and desktop sizes). They're not part of `npm test` because they need a running server and local browsers.

1. Start the app on port 3111 with demo data (`npm run db:seed-demo` on an empty database, `ADMIN_PASSWORD=testpassword123`).
2. `npm i -D puppeteer-core` (not a project dependency) and set the browser paths at the top of the scripts.
3. `node e2e/browser-e2e.mjs chrome|firefox [width height]` - type-ahead match entry, note, editing and deleting a match, rename/archive a player, Teams tabs, navigation, no layout overflow, no console errors.
4. `node e2e/admin-e2e.mjs chrome|firefox` - admin login (via 127.0.0.1, so it also checks that no NEXTAUTH_URL is needed), editing an old match, deleting a match and deleting a player with matches (typed-name confirmation).

Run each script against a fresh database: saving the same result twice within 5 minutes is refused on purpose.
