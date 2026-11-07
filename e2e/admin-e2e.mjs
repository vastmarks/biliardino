import puppeteer from "puppeteer-core";
const which = process.argv[2];
process.env.MOZ_HEADLESS = "1";
const b = await puppeteer.launch({ browser: which === "firefox" ? "firefox" : "chrome",
  executablePath: which === "firefox" ? "/tmp/claude-0/mm/ff/bin/firefox" : "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  headless: true, args: which === "firefox" ? [] : ["--no-sandbox"] });
const page = await b.newPage(); await page.setViewport({ width: 390, height: 844 });
const errs = []; page.on("pageerror", e => errs.push(e.message));
page.on("dialog", d => d.accept());
const fails = []; const check = (ok, m) => { console.log((ok ? "PASS " : "FAIL ") + m); if (!ok) fails.push(m); };
const base = "http://127.0.0.1:3111"; // deliberately not "localhost", and no NEXTAUTH_URL
await page.goto(base + "/admin", { waitUntil: "load" });
check(page.url().includes("/api/auth/signin") && page.url().startsWith(base), "admin redirects to login on the same host: " + page.url());
await page.type('input[type=password]', "wrong-password");
let t = Date.now();
await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click('button[type=submit]')]);
check(Date.now() - t >= 900 && page.url().includes("error"), `wrong password rejected after ${Date.now() - t} ms`);
await page.type('input[type=password]', "testpassword123");
await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click('button[type=submit]')]);
await new Promise(r => setTimeout(r, 500));
check(page.url().startsWith(base + "/admin"), "logged in, on " + page.url());
await page.goto(base + "/matches", { waitUntil: "load" });
await page.waitForSelector('button[aria-label="Delete match"]', { timeout: 8000 });
const count = () => page.evaluate(() => document.querySelectorAll("ul.divide-y li").length);
const before = await count();
const first = await page.evaluate(() => document.querySelector("ul.divide-y li").innerText.replace(/\s+/g, " "));
await page.click('button[aria-label="Delete match"]');
await page.waitForFunction(f => document.querySelector("ul.divide-y li")?.innerText.replace(/\s+/g, " ") !== f, { timeout: 8000 }, first);
check(true, `deleted "${first}" (${before} rows before)`);
await page.goto(base + "/admin/seasons", { waitUntil: "load" });
await new Promise(r => setTimeout(r, 800));
const txt = await page.evaluate(() => document.body.innerText);
check(/Season|1/.test(txt), "admin seasons page renders");
check(errs.length === 0, "no page errors " + JSON.stringify(errs));
await b.close();
console.log(fails.length ? `${fails.length} FAILED` : "ALL PASSED"); process.exit(fails.length ? 1 : 0);
