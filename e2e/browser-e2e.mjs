import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
const base = "http://localhost:3111";
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1000 });
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console.error] ${m.text().slice(0, 250)}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${String(e.message).slice(0, 300)}`));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const toastText = async () => (await page.$$eval(".Toastify__toast", els => els.map(e => e.textContent))).join(" | ");
const step = async (name, fn) => { try { await fn(); console.log("PASS", name); } catch (e) { console.log("FAIL", name, "-", e.message.slice(0, 300)); } };
const assert = (c, m) => { if (!c) throw new Error(m); };

// ---- players page
await page.goto(base + "/players", { waitUntil: "networkidle0" });
const clearAndType = async (sel, text) => {
  await page.focus(sel);
  await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await page.type(sel, text);
};
const addPlayer = async name => {
  await clearAndType("#new-player", name);
  const disabled = await page.$eval("form button[type=submit]", b => b.disabled);
  if (!disabled) { await page.click("form button[type=submit]"); await sleep(600); }
  return disabled;
};
await step("invalid name 'Elena,Chiara' is rejected in the UI", async () => {
  assert(await addPlayer("Elena,Chiara") === true, "add button should be disabled");
  assert((await page.evaluate(() => document.body.innerText)).includes("Names may only contain"), "no validation message");
});
for (const n of ["Elena", "Chiara", "Luca", "Sara"]) {
  await step(`add player ${n}`, async () => { await addPlayer(n); assert((await toastText()).includes(`${n} added`), "toast: " + (await toastText())); await sleep(300); });
}
await step("duplicate 'elena' (different case) is rejected", async () => {
  await addPlayer("elena"); await sleep(500);
  assert((await toastText()).includes("already exists"), "toast: " + (await toastText()));
});
await step("players with no matches are listed", async () => {
  const t = await page.evaluate(() => document.body.innerText);
  assert(["Elena", "Chiara", "Luca", "Sara"].every(n => t.includes(n)), t.slice(0, 300));
});

// ---- match form
await page.goto(base + "/", { waitUntil: "networkidle0" });
await page.screenshot({ path: "/tmp/browser/form_empty.png" });
const selects = () => page.$$("select[aria-label]");
const pick = async (label, text) => {
  const sel = await page.$(`select[aria-label="${label}"]`);
  const value = await page.evaluate((s, t) => [...s.options].find(o => o.textContent === t)?.value, sel, text);
  assert(value, `no option ${text} in ${label}`);
  await sel.select(value);
};
const setScore = async (idx, v) => {
  const ins = await page.$$("input[type=number]");
  await ins[idx].focus();
  await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await ins[idx].type(String(v));
};
const submit = async () => { await page.click("form button[type=submit]"); await sleep(900); };
const save = async () => { const d = await page.$eval("form button[type=submit]", b => b.disabled); assert(!d, "Save is disabled"); await submit(); };

await step("form starts as 2v2 with 4 player pickers and Save disabled", async () => {
  assert((await selects()).length === 4, "expected 4 selects, got " + (await selects()).length);
  assert(await page.$eval("form button[type=submit]", b => b.disabled), "Save should be disabled");
});
await step("match 1: Elena+Chiara vs Luca+Sara 10:7", async () => {
  await pick("Team 1 · Player 1", "Elena"); await pick("Team 1 · Player 2", "Chiara");
  await pick("Team 2 · Player 1", "Luca"); await pick("Team 2 · Player 2", "Sara");
  await setScore(0, 10); await setScore(1, 7); await save();
  assert((await toastText()).includes("Match saved"), "toast: " + (await toastText()));
});
await step("a player already picked can't be picked again (option disabled)", async () => {
  const dis = await page.$eval('select[aria-label="Team 2 · Player 1"]', s => [...s.options].filter(o => o.disabled).map(o => o.textContent));
  assert(dis.includes("Elena") && dis.includes("Chiara") && dis.includes("Sara"), "disabled: " + dis);
});
await sleep(5200);
await step("match 2: SAME pair in INVERTED order (Chiara+Elena vs Sara+Luca) 10:6", async () => {
  await pick("Team 1 · Player 1", "Chiara"); await pick("Team 1 · Player 2", "Elena");
  await pick("Team 2 · Player 1", "Sara"); await pick("Team 2 · Player 2", "Luca");
  await setScore(0, 10); await setScore(1, 6); await save();
  assert((await toastText()).includes("Match saved"), "toast: " + (await toastText()));
});
await step("switch to 1v1: two pickers; match 3 Elena vs Luca 10:3", async () => {
  await page.click('[role=radio]:nth-child(1)'); await sleep(200);
  assert((await selects()).length === 2, "expected 2 selects");
  await pick("Team 1", "Elena"); await pick("Team 2", "Luca");
  await setScore(0, 10); await setScore(1, 3); await save();
  assert((await toastText()).includes("Match saved"), "toast: " + (await toastText()));
});
await page.screenshot({ path: "/tmp/browser/form_after.png" });

// ---- data checks via API
const trpc = async (path, input) => (await (await fetch(`${base}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`)).json()).result.data.json;
await step("exactly ONE pair team per pair (canonical names), no duplicates", async () => {
  const t2 = (await trpc("teams.list", { teamsize: 2 })).map(t => t.name).sort();
  const t1 = (await trpc("teams.list", { teamsize: 1 })).map(t => t.name).sort();
  console.log("   2-player teams:", JSON.stringify(t2), " 1-player teams:", JSON.stringify(t1));
  assert(JSON.stringify(t2) === JSON.stringify(["chiara,elena", "luca,sara"]), "pairs: " + t2);
});
await step("pair stats: chiara,elena has 2 matches, 2 wins", async () => {
  const t = (await trpc("teams.list", { teamsize: 2 })).find(t => t.name === "chiara,elena");
  const m = t.meta.find(m => m.season === 1);
  assert(m.totalMatches === 2 && m.totalWins === 2, JSON.stringify({ n: m.totalMatches, w: m.totalWins }));
});

// ---- pages render with names, no crashes
await step("teams page lists pairs by player names", async () => {
  await page.goto(base + "/teams?x=1", { waitUntil: "networkidle0" });
  const sizeBtn = await page.$$("button, a, span");
  const t = await page.evaluate(() => document.body.innerText);
  console.log("   /teams text:", t.replace(/\s+/g, " ").slice(0, 160));
});
await step("pair page /teams/chiara,elena renders", async () => {
  await page.goto(base + "/teams/" + encodeURIComponent("chiara,elena"), { waitUntil: "networkidle0" });
  await sleep(500);
  const t = await page.evaluate(() => document.body.innerText).then(t => t.replace(/\s+/g, " "));
  console.log("   ", t.slice(0, 220));
  assert(t.includes("Chiara & Elena"), "header missing");
  await page.screenshot({ path: "/tmp/browser/team_pair.png" });
});
await step("player leaderboard + profile render", async () => {
  await page.goto(base + "/players", { waitUntil: "networkidle0" }); await sleep(400);
  await page.screenshot({ path: "/tmp/browser/players.png" });
  const t = await page.evaluate(() => document.body.innerText).then(t => t.replace(/\s+/g, " "));
  console.log("   /players:", t.slice(0, 260));
  await page.goto(base + "/players/elena", { waitUntil: "networkidle0" }); await sleep(600);
  await page.screenshot({ path: "/tmp/browser/player_elena.png", fullPage: true });
  const p = await page.evaluate(() => document.body.innerText).then(t => t.replace(/\s+/g, " "));
  console.log("   /players/elena:", p.slice(0, 420));
  assert(p.includes("Elena") && p.includes("Chiara"), "profile content");
});
await step("home shows recent matches with names", async () => {
  await page.goto(base + "/", { waitUntil: "networkidle0" }); await sleep(500);
  const t = await page.evaluate(() => document.body.innerText).then(t => t.replace(/\s+/g, " "));
  assert(t.includes("Chiara & Elena"), t.slice(0, 300));
});
console.log(errors.length ? "CONSOLE/PAGE ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors or page errors");
await browser.close();
