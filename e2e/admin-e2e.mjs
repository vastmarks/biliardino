import puppeteer from "puppeteer-core";
const which = process.argv[2];
process.env.MOZ_HEADLESS = "1";
const b = await puppeteer.launch({
  browser: which === "firefox" ? "firefox" : "chrome",
  executablePath:
    which === "firefox"
      ? "/tmp/claude-0/mm/ff/bin/firefox"
      : "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
  headless: true,
  args: which === "firefox" ? [] : ["--no-sandbox"],
});
const page = await b.newPage();
await page.setViewport({ width: 390, height: 844 });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("dialog", d => d.accept());
const fails = [];
const check = (ok, m) => {
  console.log((ok ? "PASS " : "FAIL ") + m);
  if (!ok) fails.push(m);
};
const base = "http://127.0.0.1:3111"; // deliberately not "localhost", and no NEXTAUTH_URL
await page.goto(base + "/admin", { waitUntil: "load" });
check(
  page.url().includes("/api/auth/signin") && page.url().startsWith(base),
  "admin redirects to login on the same host: " + page.url(),
);
await page.type("input[type=password]", "wrong-password");
let t = Date.now();
await Promise.all([
  page.waitForNavigation({ waitUntil: "load" }),
  page.click("button[type=submit]"),
]);
check(
  Date.now() - t >= 900 && page.url().includes("error"),
  `wrong password rejected after ${Date.now() - t} ms`,
);
await page.type("input[type=password]", "testpassword123");
await Promise.all([
  page.waitForNavigation({ waitUntil: "load" }),
  page.click("button[type=submit]"),
]);
await new Promise(r => setTimeout(r, 500));
check(page.url().startsWith(base + "/admin"), "logged in, on " + page.url());
await page.goto(base + "/matches", { waitUntil: "load" });
await page.waitForSelector("ul.divide-y li");
const count = () =>
  page.evaluate(() => document.querySelectorAll("ul.divide-y li").length);
const editable = () =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("ul.divide-y li")].filter(l =>
        [...l.querySelectorAll("button")].some(b =>
          b.textContent.includes("Edit"),
        ),
      ).length,
  );
const rows = await count();
check(
  (await editable()) === rows,
  `admin may edit every match (${await editable()} of ${rows})`,
);
// edit an OLD match (seed data is older than 24h): change the score
const lastRow = rows - 1;
const oldText = await page.evaluate(
  i =>
    document
      .querySelectorAll("ul.divide-y li")
      [i].innerText.replace(/\s+/g, " "),
  lastRow,
);
await page.evaluate(
  i =>
    [
      ...document
        .querySelectorAll("ul.divide-y li")
        [i].querySelectorAll("button"),
    ]
      .find(b => b.textContent.includes("Edit"))
      .click(),
  lastRow,
);
await page.waitForSelector("dialog[open]");
await page.click('dialog[open] input[aria-label="Team 2 score"]', {
  clickCount: 3,
});
await page.keyboard.press("Backspace");
await page.type('dialog[open] input[aria-label="Team 2 score"]', "3");
await page.evaluate(() =>
  [...document.querySelectorAll("dialog[open] button")]
    .find(b => b.textContent.trim() === "Save")
    .click(),
);
await page.waitForFunction(
  i =>
    document.querySelectorAll("ul.divide-y li")[i]?.innerText.includes(":3") ||
    /:\s*3/.test(document.querySelectorAll("ul.divide-y li")[i]?.innerText),
  { timeout: 8000 },
  lastRow,
);
check(true, `old match edited by admin: "${oldText}"`);
const first = await page.evaluate(() =>
  document.querySelector("ul.divide-y li").innerText.replace(/\s+/g, " "),
);
await page.evaluate(() =>
  [...document.querySelector("ul.divide-y li").querySelectorAll("button")]
    .find(b => b.textContent.includes("Edit"))
    .click(),
);
await page.waitForSelector("dialog[open]");
await page.evaluate(() =>
  [...document.querySelectorAll("dialog[open] button")]
    .find(b => b.textContent.trim() === "Delete")
    .click(),
);
await page.waitForFunction(
  f =>
    document.querySelector("ul.divide-y li")?.innerText.replace(/\s+/g, " ") !==
    f,
  { timeout: 8000 },
  first,
);
check(true, `deleted "${first}"`);
// delete a player WITH matches: needs the typed name
await page.goto(base + "/players", { waitUntil: "load" });
await page.waitForFunction(() =>
  document.body.innerText.includes("Manage players"),
);
await page
  .waitForFunction(
    () => {
      const li = [...document.querySelectorAll("section li")].find(l =>
        l.innerText.startsWith("Elena"),
      );
      return (
        li &&
        [...li.querySelectorAll("button")].some(b => b.textContent === "Delete")
      );
    },
    { timeout: 8000 },
  )
  .catch(() => {});
const hasDelete = await page.evaluate(() => {
  const li = [...document.querySelectorAll("section li")].find(l =>
    l.innerText.startsWith("Elena"),
  );
  return [...li.querySelectorAll("button")].some(
    b => b.textContent === "Delete",
  );
});
check(hasDelete, "admin sees Delete for a player with matches");
await page.evaluate(() => {
  const li = [...document.querySelectorAll("section li")].find(l =>
    l.innerText.startsWith("Elena"),
  );
  [...li.querySelectorAll("button")]
    .find(b => b.textContent === "Delete")
    .click();
});
await page.waitForSelector("dialog[open]");
const confirmBtn = () =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll("dialog[open] button")].find(
      b => /delete/i.test(b.textContent) && !/cancel/i.test(b.textContent),
    );
    return b ? { text: b.textContent.trim(), disabled: b.disabled } : null;
  });
const stepOne = await confirmBtn();
console.log("step 1 button:", JSON.stringify(stepOne));
await page.evaluate(() =>
  [...document.querySelectorAll("dialog[open] button")]
    .find(
      b =>
        /delete|continue|next/i.test(b.textContent) &&
        !/cancel/i.test(b.textContent),
    )
    .click(),
);
await new Promise(r => setTimeout(r, 300));
const inputSel = "dialog[open] input";
await page.waitForSelector(inputSel);
const wrongState = await confirmBtn();
check(
  wrongState?.disabled === true,
  "final delete disabled until the name is typed: " +
    JSON.stringify(wrongState),
);
await page.type(inputSel, "Elena");
await page.evaluate(() =>
  [...document.querySelectorAll("dialog[open] button")]
    .find(b => /delete/i.test(b.textContent) && !/cancel/i.test(b.textContent))
    .click(),
);
await page.waitForFunction(
  () =>
    ![...document.querySelectorAll("section li")].some(l =>
      l.innerText.startsWith("Elena"),
    ),
  { timeout: 8000 },
);
check(true, "player Elena and his matches deleted after typing the name");
await page.goto(base + "/admin/seasons", { waitUntil: "load" });
await new Promise(r => setTimeout(r, 800));
const txt = await page.evaluate(() => document.body.innerText);
check(
  /Season 1/.test(txt) && /Since \d/.test(txt) && /\d+ matches/.test(txt),
  "seasons page shows the current season with its start date and matches",
);
const clickIn = (scope, re) =>
  page.evaluate(
    (scope, src) => {
      const b = [...document.querySelectorAll(scope + " button")].find(x =>
        new RegExp(src).test(x.textContent),
      );
      b?.click();
      return !!b;
    },
    scope,
    re.source,
  );
// start season 2, then delete season 1 with its matches (number typed again)
await clickIn("body", /^Start season 2$/);
await page.waitForSelector("dialog[open]");
await clickIn("dialog[open]", /^Start season 2$/);
await page.waitForFunction(
  () => /Season 2\s*Current/.test(document.body.innerText),
  { timeout: 8000 },
);
check(true, "season 2 started and current");
await page.evaluate(() => {
  const li = [...document.querySelectorAll("li")].find(l =>
    l.innerText.startsWith("Season 1"),
  );
  [...li.querySelectorAll("button")]
    .find(b => b.textContent === "Delete")
    .click();
});
await page.waitForSelector("dialog[open] input");
const disabled = () =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("dialog[open] button")].find(
        b => b.textContent === "Delete",
      ).disabled,
  );
check(await disabled(), "season delete disabled until the number is typed");
await page.type("dialog[open] input", "1");
check(!(await disabled()), "season delete enabled after typing 1");
await clickIn("dialog[open]", /^Delete$/);
await page.waitForFunction(
  () =>
    !/Season 1\b/.test(document.body.innerText.replace("Season 1 ", "")) &&
    ![...document.querySelectorAll("li")].some(l =>
      l.innerText.startsWith("Season 1"),
    ),
  { timeout: 8000 },
);
check(true, "season 1 and its matches deleted");
await page.goto(base + "/matches?season=all", { waitUntil: "load" });
await new Promise(r => setTimeout(r, 800));
check(
  (await count()) === 0,
  "no matches left after deleting the only season with matches",
);
check(errs.length === 0, "no page errors " + JSON.stringify(errs));
await b.close();
console.log(fails.length ? `${fails.length} FAILED` : "ALL PASSED");
process.exit(fails.length ? 1 : 0);
