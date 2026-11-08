// Run against a fresh seeded server: node e2e.mjs chrome|firefox [width height]
import puppeteer from "puppeteer-core";
const which = process.argv[2];
const W = +(process.argv[3] || 390),
  H = +(process.argv[4] || 844);
const exe =
  which === "firefox"
    ? "/tmp/claude-0/mm/ff/bin/firefox"
    : "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
process.env.MOZ_HEADLESS = "1";
const browser = await puppeteer.launch({
  browser: which === "firefox" ? "firefox" : "chrome",
  executablePath: exe,
  headless: true,
  args: which === "firefox" ? [] : ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
const errors = [];
page.on("console", m => {
  if (["error", "warning"].includes(m.type()))
    errors.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("dialog", d => d.accept()); // window.confirm
const fails = [];
const check = (ok, msg) => {
  console.log((ok ? "PASS " : "FAIL ") + msg);
  if (!ok) fails.push(msg);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = "http://localhost:3111";
const clickText = async (scope, text) => {
  const ok = await page.evaluate(
    (scope, text) => {
      const root = document.querySelector(scope) || document;
      const el = [...root.querySelectorAll("button")].find(
        b => b.textContent.trim() === text,
      );
      if (!el) return false;
      el.click();
      return true;
    },
    scope,
    text,
  );
  if (!ok) throw new Error(`no button "${text}" in ${scope}`);
};
const shot = n =>
  page.screenshot({
    path: `/tmp/claude-0/shots/${which}-${W}-${n}.png`,
    fullPage: true,
  });
const overflow = () =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
const firstRow = () =>
  page.evaluate(() =>
    document.querySelector("ul.divide-y li")?.innerText.replace(/\s+/g, " "),
  );
const slots = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('form button[aria-label^="Team"]')].map(
      b => b.textContent,
    ),
  );
const SEARCH = 'input[aria-label="Find a player"]';
const typeName = async text => {
  await page.click(SEARCH);
  await page.type(SEARCH, text);
};
const pick = async text => {
  await typeName(text);
  await page.keyboard.press("Enter");
  await sleep(120);
};
const waitStatus = s =>
  page.waitForFunction(
    s => document.querySelector("[role=status]")?.textContent.includes(s),
    { timeout: 8000 },
    s,
  );
const setValue = async (sel, v) => {
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  if (v !== "") await page.type(sel, v);
};

await page.goto(BASE + "/", { waitUntil: "load" });
await page.waitForSelector("form");
await sleep(800);
check((await overflow()) <= 0, "home: no horizontal overflow");
for (const s of ["Leaderboard", "Top pairs", "Recent matches"])
  check(
    (await page.evaluate(() => document.body.innerText)).includes(s),
    `page shows "${s}"`,
  );
check(
  (await page.evaluate(
    () => document.querySelector("main > div > :first-child")?.tagName,
  )) === "FORM",
  "match entry is the first block",
);
const nav = await page.evaluate(() =>
  [...document.querySelectorAll("nav a")].map(
    a => a.textContent + (a.getAttribute("aria-current") ? "*" : ""),
  ),
);
check(
  nav.join() === "Home*,Matches,Teams,Players,Leaderboards",
  "nav has a Home tab, active on /: " + nav,
);
await shot("home");

// ---- type-ahead picker
const initial = await page.evaluate(() =>
  [...document.querySelectorAll("[role=option]")].map(b => b.textContent),
);
check(
  initial.length === 8,
  "empty search offers the 8 most recent players: " + initial.length,
);
await typeName("chi");
const filtered = await page.evaluate(() =>
  [...document.querySelectorAll("[role=option]")].map(b => b.textContent),
);
check(
  filtered[0] === "Chiara" &&
    filtered.length === 2 &&
    filtered[1].includes("Add"),
  "typing 'chi' puts Chiara first, then the add-new option: " + filtered,
);
await page.keyboard.press("Enter");
await sleep(120);
await pick("fab");
await pick("luc");
await pick("sar");
check(
  JSON.stringify(await slots()) ===
    JSON.stringify(["Chiara", "Elena", "Luca", "Sara"]),
  "Enter picks into the slots in order: " + (await slots()),
);
check(
  (await page.evaluate(() =>
    document.activeElement?.getAttribute("aria-label"),
  )) === "Team 1 score",
  "focus moves to the score when everybody is picked",
);
check(
  await page.evaluate(
    () => document.querySelector("button[type=submit]").disabled,
  ),
  "Save disabled without scores",
);

// ---- note: open, close (clears), open again, save
await clickText("form", "+ Note");
await page.type('input[aria-label="Note"]', "should vanish");
await page.click('button[aria-label="Remove note"]');
check(!(await page.$('input[aria-label="Note"]')), "note can be closed again");
await clickText("form", "+ Note");
await page.type('input[aria-label="Note"]', "Friday cup final");
const lose = String(Date.now() % 9);
await page.type('input[aria-label="Team 1 score"]', "10");
await page.type('input[aria-label="Team 2 score"]', lose);
await shot("filled");
await page.click("button[type=submit]");
await waitStatus("Saved");
await page.waitForFunction(
  () =>
    document
      .querySelector("ul.divide-y li")
      ?.innerText.includes("Friday cup final"),
  { timeout: 8000 },
);
const row = await firstRow();
check(
  /Chiara & Elena/.test(row) &&
    /Luca & Sara/.test(row) &&
    row.includes("Friday cup final"),
  "match saved with its note, shown first in the feed: " + row,
);
check(
  (await page.$('input[aria-label="Note"]')) === null,
  "note field closed after saving",
);
check(
  JSON.stringify(await slots()) ===
    JSON.stringify(["Chiara", "Elena", "Luca", "Sara"]),
  "players kept for the rematch",
);

// ---- same result again is refused
await page.type('input[aria-label="Team 1 score"]', "10");
await page.type('input[aria-label="Team 2 score"]', lose);
await page.click("button[type=submit]");
await page.waitForFunction(
  () => document.body.innerText.includes("just saved"),
  { timeout: 8000 },
);
check(true, "double entry refused with a message");

// ---- add a brand new player from the picker
await page.click('button[aria-label^="Team 2 player 2"]'); // clears Sara, makes the slot active
await typeName("Newbie");
const offer = await page.evaluate(() =>
  [...document.querySelectorAll("[role=option]")].map(b => b.textContent),
);
check(
  offer.length === 1 && offer[0].includes("Add") && offer[0].includes("Newbie"),
  "unknown name offers to add a new player: " + offer,
);
await page.keyboard.press("Enter");
await page.waitForFunction(
  () =>
    [...document.querySelectorAll('form button[aria-label^="Team"]')].some(
      b => b.textContent === "Newbie",
    ),
  { timeout: 8000 },
);
check(true, "new player created and picked in one step");
await setValue('input[aria-label="Team 1 score"]', String((+lose + 2) % 9));
await setValue('input[aria-label="Team 2 score"]', "10");
await page.click("button[type=submit]");
await waitStatus(" : 10");

// ---- correct a match
const before = await firstRow();
await clickText("ul.divide-y li", "✎ Edit");
await page.waitForSelector("dialog[open]");
check((await overflow()) <= 0, "edit dialog: no horizontal overflow");
await shot("edit");
await setValue('dialog[open] input[aria-label="Team 2 score"]', "7");
await clickText("dialog[open]", "Save");
await page.waitForFunction(
  b =>
    document.querySelector("ul.divide-y li")?.innerText.replace(/\s+/g, " ") !==
    b,
  { timeout: 8000 },
  before,
);
check(
  /10\s*:\s*7|:\s*7/.test(await firstRow()),
  "corrected score shows in the feed: " + (await firstRow()),
);
const rowsBefore = await page.evaluate(
  () => document.querySelectorAll("ul.divide-y li").length,
);
const firstBefore = await firstRow();
await clickText("ul.divide-y li", "✎ Edit");
await page.waitForSelector("dialog[open]");
await clickText("dialog[open]", "Delete");
await page.waitForFunction(
  f =>
    document.querySelector("ul.divide-y li")?.innerText.replace(/\s+/g, " ") !==
    f,
  { timeout: 8000 },
  firstBefore,
);
check(true, "match deleted from the dialog (confirm accepted)");

// ---- 1v1 + persistence
await clickText("form", "1v1");
check(
  (await page.evaluate(
    () => document.querySelectorAll('form button[aria-label^="Team"]').length,
  )) === 2,
  "1v1 shows 2 slots",
);
await page.reload({ waitUntil: "load" });
await page.waitForSelector("form");
await sleep(500);
check(
  (await page.evaluate(
    () =>
      document.querySelector("[role=radio][aria-checked=true]")?.textContent,
  )) === "1v1",
  "format persisted across reload",
);

// ---- leaderboard tabs
for (const t of ["Today", "7 days", "30 days", "Season"])
  await clickText("[role=tablist]", t);
await shot("dark-prep");

// ---- other pages
await page.goto(BASE + "/teams", { waitUntil: "load" });
await sleep(900);
const tabs = await page.evaluate(() =>
  [...document.querySelectorAll("[role=tab]")].map(t =>
    t.textContent.replace(/\s+/g, " "),
  ),
);
check(
  tabs.join("|") === "Singles (1v1)|Pairs (2v2)",
  "teams: Singles / Pairs tabs, no 3 or 4: " + tabs,
);
await clickText("[role=tablist]", "Pairs (2v2)");
await sleep(500);
check(
  (await page.evaluate(() => document.body.innerText)).includes("&"),
  "pairs tab lists pairs",
);
check((await overflow()) <= 0, "teams: no horizontal overflow");
await shot("teams");

await page.goto(BASE + "/players", { waitUntil: "load" });
await sleep(900);
check(
  (await page.evaluate(() => document.body.innerText)).includes(
    "Manage players",
  ),
  "players: management section",
);
await page.evaluate(() => {
  const li = [...document.querySelectorAll("section li")].find(l =>
    l.innerText.includes("Newbie"),
  );
  [...li.querySelectorAll("button")]
    .find(b => b.textContent === "Rename")
    .click();
});
await page.waitForSelector("dialog[open]");
await setValue('dialog[open] input[aria-label="New name"]', "Newbie Two");
await clickText("dialog[open]", "Save");
await page.waitForFunction(
  () => document.body.innerText.includes("Newbie Two"),
  { timeout: 8000 },
);
check(true, "player renamed");
await page.evaluate(() => {
  const li = [...document.querySelectorAll("section li")].find(l =>
    l.innerText.includes("Newbie Two"),
  );
  [...li.querySelectorAll("button")]
    .find(b => b.textContent === "Archive")
    .click();
});
await page.waitForFunction(() => document.body.innerText.includes("archived"), {
  timeout: 8000,
});
check(true, "player archived");
const elenaDelete = await page.evaluate(() => {
  const li = [...document.querySelectorAll("section li")].find(l =>
    l.innerText.startsWith("Elena"),
  );
  return [...li.querySelectorAll("button")].some(
    b => b.textContent === "Delete",
  );
});
check(!elenaDelete, "no Delete button for a player with matches (not admin)");
await shot("players");

await page.goto(BASE + "/matches", { waitUntil: "load" });
await sleep(900);
const counts = await page.evaluate(() => ({
  rows: document.querySelectorAll("ul.divide-y li").length,
  edit: [...document.querySelectorAll("ul.divide-y li button")].length,
}));
check(
  counts.edit < counts.rows,
  `matches: old matches are locked for non-admin (${counts.edit} editable of ${counts.rows})`,
);
await clickText("nav", "Home").catch(async () => page.click('nav a[href="/"]'));
await page.evaluate(() => document.querySelector('nav a[href="/"]').click());
await page.waitForSelector("form");
check(new URL(page.url()).pathname === "/", "Home tab leads to the entry page");

await clickText("footer", "◐ Theme");
await sleep(300);
await shot("dark");
const unexpected = errors.filter(
  e => !e.includes("409 (Conflict)") && !e.includes("403"),
);
console.log("console issues:", unexpected.length ? unexpected : "none");
check(unexpected.length === 0, "no unexpected console errors/warnings");
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
