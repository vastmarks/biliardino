// Run against a seeded server (npm run db:seed-demo): node e2e/browser-e2e.mjs chrome|firefox [width height]
// Needs puppeteer-core and a local Chrome/Firefox; adjust the executable paths below.
import puppeteer from "puppeteer-core";
const which = process.argv[2];
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
const exe = which === "firefox" ? "/tmp/claude-0/mm/ff/bin/firefox" : "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
process.env.MOZ_HEADLESS = "1";
const browser = await puppeteer.launch({
  browser: which === "firefox" ? "firefox" : "chrome",
  executablePath: exe, headless: true,
  args: which === "firefox" ? [] : ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
const errors = [];
page.on("console", m => { if (["error", "warning"].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", e => errors.push("pageerror: " + e.message));
const fails = [];
const check = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) fails.push(msg); };
const clickText = async (scope, text) => {
  const ok = await page.evaluate((scope, text) => {
    const root = document.querySelector(scope) || document;
    const el = [...root.querySelectorAll("button")].find(b => b.textContent.trim() === text);
    if (!el) return false; el.click(); return true;
  }, scope, text);
  if (!ok) throw new Error(`no button "${text}" in ${scope}`);
};
const shot = n => page.screenshot({ path: `/tmp/claude-0/shots/${which}-${W}-${n}.png`, fullPage: true });

const t0 = Date.now();
await page.goto("http://localhost:3111/", { waitUntil: "load" });
await page.waitForSelector("form");
console.log(which, "load+form ms:", Date.now() - t0);
await new Promise(r => setTimeout(r, 800));

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check(overflow <= 0, `no horizontal overflow (${overflow})`);
const txt = await page.evaluate(() => document.body.innerText);
for (const s of ["Leaderboard", "Top pairs", "Recent matches"]) check(txt.includes(s), `page shows "${s}"`);
const firstH = await page.evaluate(() => document.querySelector("main > div > :first-child")?.tagName);
check(firstH === "FORM", "match entry is the first block on the page");
await shot("home");

// ---- 2v2 entry by tapping chips
await clickText('[aria-label="Players"]', "Elena");
await clickText('[aria-label="Players"]', "Chiara");
await clickText('[aria-label="Players"]', "Luca");
await clickText('[aria-label="Players"]', "Sara");
const slots = await page.evaluate(() => [...document.querySelectorAll('form button[aria-label^="Team"]')].map(b => b.textContent));
check(JSON.stringify(slots) === JSON.stringify(["Elena", "Chiara", "Luca", "Sara"]), "chips fill slots in order " + slots);
const saveDisabled = await page.evaluate(() => document.querySelector('button[type=submit]').disabled);
check(saveDisabled, "Save disabled without scores");
await page.type('input[aria-label="Team 1 score"]', "10");
await page.type('input[aria-label="Team 2 score"]', "6");
await shot("filled");
const before = await page.evaluate(() => document.querySelector("ul.divide-y li")?.innerText);
await page.click('button[type=submit]');
await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.includes("Saved"), { timeout: 8000 });
check(true, "match saved, status shown");
await page.waitForFunction(b => document.querySelector("ul.divide-y li")?.innerText !== b, { timeout: 8000 }, before);
const after = await page.evaluate(() => document.querySelector("ul.divide-y li").innerText.replace(/\s+/g, " "));
check(/Chiara & Elena/i.test(after) && /10.*6/.test(after) && /Luca & Sara/i.test(after), "recent feed shows new match first: " + after);
const scoresCleared = await page.evaluate(() => document.querySelector('input[aria-label="Team 1 score"]').value === "");
check(scoresCleared, "scores cleared, players kept");
const kept = await page.evaluate(() => [...document.querySelectorAll('form button[aria-label^="Team"]')].map(b => b.textContent).join());
check(kept === "Elena,Chiara,Luca,Sara", "players kept for rematch");

// ---- reversed pair order is the same team (rematch with sides swapped inside a team)
await clickText("form", "⇄ Swap");
await page.type('input[aria-label="Team 1 score"]', "3");
await page.type('input[aria-label="Team 2 score"]', "10");
await page.click('button[type=submit]');
await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.includes("Saved 3"), { timeout: 8000 });
check(true, "second match (swapped sides) saved");

// ---- 1v1 + persistence
await clickText("form", "1v1");
const slots1 = await page.evaluate(() => document.querySelectorAll('form button[aria-label^="Team"]').length);
check(slots1 === 2, "1v1 shows 2 slots");
await page.reload({ waitUntil: "load" });
await page.waitForSelector("form");
await new Promise(r => setTimeout(r, 500));
const fmt = await page.evaluate(() => document.querySelector('[role=radio][aria-checked=true]')?.textContent);
check(fmt === "1v1", "format persisted across reload: " + fmt);

// ---- leaderboard tabs
for (const t of ["Today", "7 days", "30 days", "Season"]) {
  await clickText('[role=tablist]', t);
  const rows = await page.evaluate(() => document.querySelectorAll("section ol li").length);
  console.log(`  tab ${t}: ${rows} li`);
}
await clickText('[role=tablist]', "Today");
const today = await page.evaluate(() => document.querySelector("section ol")?.innerText.replace(/\s+/g, " "));
check(/Elena|Chiara|Luca|Sara/.test(today || ""), "Today board lists today's players: " + today);
await shot("today");

// ---- dark mode via toggle
await clickText("footer", "◐ Theme");
await new Promise(r => setTimeout(r, 300));
const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
const darkOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
await shot("dark");
console.log("  dark class:", dark, "overflow:", darkOverflow);

// ---- other pages
for (const p of ["/matches", "/players", "/teams", "/leaderboards", "/players/elena", "/teams/chiara%2Celena"]) {
  await page.goto("http://localhost:3111" + p, { waitUntil: "load" });
  await new Promise(r => setTimeout(r, 900));
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const body = await page.evaluate(() => document.body.innerText.length);
  check(o <= 0 && body > 80, `${p}: no overflow (${o}), content ${body} chars`);
  await shot("page" + p.replace(/\W/g, "_"));
}
console.log("console issues:", errors.length ? errors : "none");
check(errors.length === 0, "no console errors/warnings");
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
