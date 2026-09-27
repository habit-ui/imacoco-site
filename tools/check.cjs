/*
 * 表示確認スクリプト（公開物には含めない開発用）
 *   cd imacoco-site && npx http-server -p 8765 -s . &
 *   NODE_PATH=$(npm root -g) node tools/check.cjs
 * 結果は標準出力、スクリーンショットは screenshots/ に保存。
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = process.env.BASE || "http://127.0.0.1:8765/";
const OUT = path.join(__dirname, "..", "screenshots");
const WIDTHS = [390, 768, 1440];
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "NG  "} ${name}${detail ? " — " + detail : ""}`);
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 250) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 1000));
  });
}

async function openPage(browser, width, opts = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : width < 1024 ? 1024 : 900 },
    deviceScaleFactor: width < 768 ? 2 : 1,
    reducedMotion: opts.reducedMotion || "no-preference"
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  if (opts.route) await opts.route(page);
  await page.goto(BASE, { waitUntil: "networkidle" });
  return { context, page, errors, failed };
}

async function layoutChecks(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [];
    document.querySelectorAll("body *").forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.width && (r.right > doc.clientWidth + 1 || r.left < -1) && getComputedStyle(n).position !== "absolute") {
        offenders.push(`${n.tagName.toLowerCase()}.${n.className}`);
      }
    });
    return { scroll: doc.scrollWidth, client: doc.clientWidth, offenders: offenders.slice(0, 5) };
  });
  record(`${label}: 横はみ出しなし`, overflow.scroll <= overflow.client && !overflow.offenders.length,
    `scrollWidth ${overflow.scroll} / clientWidth ${overflow.client}${overflow.offenders.length ? " / " + overflow.offenders.join(", ") : ""}`);

  const imgs = await page.evaluate(() => [...document.images].map((i) => ({ src: i.currentSrc, ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute("alt") })));
  const badImgs = imgs.filter((i) => !i.ok || i.alt === null || i.alt === "");
  record(`${label}: 画像の読込と代替テキスト`, badImgs.length === 0, `${imgs.length}枚${badImgs.length ? " / 問題: " + JSON.stringify(badImgs) : ""}`);
}

async function contrastChecks(page, label) {
  const pairs = await page.evaluate(() => {
    function bgOf(n) {
      while (n) {
        const s = getComputedStyle(n);
        const bg = s.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        n = n.parentElement;
      }
      return "rgb(255, 255, 255)";
    }
    const sel = ".site-nav a, .eyebrow, .hero__title, .hero__lead p, .status, .grove__title, .grove__subtitle, .grove__lead, .grove__body p, .motif dt, .motif dd, .grove__note, .section-title, .works__lead, .works__empty, .operator__label, .operator__note, .footer-links a, .copyright, .placeholder__label, .work__desc, .link__note";
    return [...document.querySelectorAll(sel)].filter((n) => n.offsetParent).map((n) => ({
      sel: n.className || n.tagName, fg: getComputedStyle(n).color, bg: bgOf(n), size: parseFloat(getComputedStyle(n).fontSize)
    }));
  });
  const parse = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
  const low = [];
  let min = 99;
  for (const p of pairs) {
    const r = ratio(parse(p.fg), parse(p.bg));
    min = Math.min(min, r);
    if (r < 4.5) low.push(`${p.sel} ${r.toFixed(2)}`);
  }
  record(`${label}: 文字コントラスト4.5:1以上`, low.length === 0, `最小 ${min.toFixed(2)} (${pairs.length}箇所)${low.length ? " / 不足: " + low.join(", ") : ""}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // ---------- 本番の中身で各幅を確認 ----------
  for (const w of WIDTHS) {
    const { context, page, errors, failed } = await openPage(browser, w);
    const label = `${w}px`;
    await scrollThrough(page);
    await layoutChecks(page, label);
    await contrastChecks(page, label);
    await page.screenshot({ path: path.join(OUT, `site-${w}-first-view.png`) });
    await page.screenshot({ path: path.join(OUT, `site-${w}-full.png`), fullPage: true });

    // 制作中の作品が販売中に見えないこと
    const groveText = await page.locator("#ai-grove").innerText();
    const sellWords = ["販売中", "発売", "購入", "予約", "Kindle", "円"].filter((s) => groveText.includes(s));
    record(`${label}: AI Groveに販売表現なし`, sellWords.length === 0, sellWords.join(", ") || "「制作中」表示あり: " + groveText.includes("制作中"));
    const banned = ["整える", "癒し", "スピリチュアル", "ウェルネス", "読み解く", "勉強"].filter((s) => groveText.includes(s) || false);
    const allText = await page.locator("body").innerText();
    const bannedAll = ["整える", "癒し", "スピリチュアル", "ウェルネス", "読み解く", "勉強"].filter((s) => allText.includes(s));
    record(`${label}: 使わない言葉が本文にない`, bannedAll.length === 0 && banned.length === 0, bannedAll.join(", "));

    // 仮リンク・# だけのリンクがない
    const hrefs = await page.$$eval("a", (as) => as.map((a) => a.getAttribute("href")));
    const bad = hrefs.filter((h) => !h || h === "#" || /^javascript:/i.test(h));
    const anchors = hrefs.filter((h) => h.startsWith("#") && h.length > 1);
    const missing = [];
    for (const a of anchors) if (!(await page.$(a))) missing.push(a);
    record(`${label}: 仮リンクなし・ページ内リンク先が存在`, bad.length === 0 && missing.length === 0, `${hrefs.length}件 ${bad.concat(missing).join(" ")}`);

    record(`${label}: コンソールエラー・警告なし`, errors.length === 0, errors.join(" | "));
    record(`${label}: 存在しないファイルへの参照なし`, failed.length === 0, failed.join(" | "));
    await context.close();
  }

  // ---------- メニュー・キーボード操作（390px） ----------
  {
    const { context, page } = await openPage(browser, 390);
    await page.keyboard.press("Tab");
    const skip = await page.evaluate(() => document.activeElement.className);
    record("390px: 最初のTabで「本文へ移動」", skip === "skip-link", skip);
    await page.screenshot({ path: path.join(OUT, "check-390-skip-link-focus.png") });

    await page.keyboard.press("Tab"); // wordmark
    await page.keyboard.press("Tab"); // menu toggle
    const onToggle = await page.evaluate(() => document.activeElement.classList.contains("menu-toggle"));
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + " " + getComputedStyle(document.activeElement).outlineWidth);
    record("390px: メニューボタンにTabで到達しフォーカス表示", onToggle && outline.startsWith("solid"), outline);
    await page.keyboard.press("Enter");
    const expanded = await page.getAttribute(".menu-toggle", "aria-expanded");
    const navVisible = await page.isVisible("#site-nav a[href='#works']");
    record("390px: Enterでメニューが開く", expanded === "true" && navVisible, `aria-expanded=${expanded}`);
    await page.screenshot({ path: path.join(OUT, "check-390-menu-open.png") });
    await page.keyboard.press("Escape");
    const closed = await page.getAttribute(".menu-toggle", "aria-expanded");
    const focusBack = await page.evaluate(() => document.activeElement.classList.contains("menu-toggle"));
    record("390px: Escで閉じてボタンへフォーカスが戻る", closed === "false" && focusBack, "");
    await page.click(".menu-toggle");
    await page.click("#site-nav a[href='#ai-grove']");
    await page.waitForTimeout(900);
    const hash = await page.evaluate(() => location.hash);
    const groveTop = await page.evaluate(() => document.querySelector("#ai-grove").getBoundingClientRect().top);
    const closedAfter = await page.getAttribute(".menu-toggle", "aria-expanded");
    record("390px: メニューからAI Groveへ移動しメニューが閉じる", hash === "#ai-grove" && groveTop < 120 && closedAfter === "false", `top=${Math.round(groveTop)}`);
    await context.close();
  }

  // ---------- 1440px のナビ ----------
  {
    const { context, page } = await openPage(browser, 1440);
    const toggleVisible = await page.isVisible(".menu-toggle");
    const navLinks = await page.$$eval("#site-nav a", (a) => a.filter((x) => x.offsetParent).length);
    record("1440px: 横並びナビ表示（メニューボタン非表示）", !toggleVisible && navLinks === 4, `${navLinks}件`);
    // 外部リンクは新しいタブ・noopener
    const ext = await page.$$eval("a[href^='http']", (as) => as.map((a) => `${a.target}|${a.rel}|${a.textContent.trim()}`));
    record("外部リンクは新しいタブ（noopener）と読み上げ用の注記", ext.every((e) => e.startsWith("_blank|noopener|") && e.includes("新しいタブ")), ext.join(" / "));
    await context.close();
  }

  // ---------- 部品テスト：作品・映像・長い見出し（テスト用の中身を差し込む。公開物には含めない） ----------
  const fixtureMedia = await (async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(BASE);
    const data = await p.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 320; c.height = 400;
      const g = c.getContext("2d");
      function frame(t) {
        g.fillStyle = "#6b7d6a"; g.fillRect(0, 0, 320, 400);
        g.fillStyle = "#e9dfb8"; g.beginPath(); g.arc(160 + 60 * Math.sin(t / 300), 200, 30, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.font = "20px sans-serif"; g.fillText("TEST ONLY", 100, 380);
      }
      frame(0);
      const png = c.toDataURL("image/png").split(",")[1];
      const stream = c.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise((r) => (rec.onstop = r));
      rec.start();
      const start = performance.now();
      await new Promise((resolve) => {
        (function loop() {
          const t = performance.now() - start;
          frame(t);
          if (t < 1500) requestAnimationFrame(loop); else resolve();
        })();
      });
      rec.stop();
      await done;
      const buf = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
      let bin = ""; const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return { png, webm: btoa(bin) };
    });
    await ctx.close();
    return { png: Buffer.from(data.png, "base64"), webm: Buffer.from(data.webm, "base64") };
  })();

  const realContent = fs.readFileSync(path.join(__dirname, "..", "content", "ja.js"), "utf8");
  const fixture = realContent + `
;(function (c) {
  c.hero.title = "とても長い日本語の見出しでも文節のところで自然に折り返されるかを確かめるための仮の見出しです";
  c.hero.media = { type: "video", src: "__test__/clip.webm", poster: "__test__/still.png", alt: "テスト用映像", width: 320, height: 400, autoplay: true };
  c.works.items = [
    { title: "テスト用の作品名（表示確認のみ）", text: "部品の動作確認に使う仮の説明文です。", media: { type: "image", src: "__test__/still.png", alt: "テスト用画像", width: 320, height: 400 }, links: [{ label: "テスト用リンク", url: "https://example.com/" }, { label: "空のリンク", url: "#" }] },
    { title: "二つ目のテスト作品", text: "左右が入れ替わるかを確認します。", media: null, links: [] }
  ];
  c.works.destinations = [{ label: "テスト用の行き先", note: "補足文", url: "https://example.com/" }];
})(window.IMACOCO_CONTENT);`;

  async function routeFixture(page) {
    await page.route("**/content/ja.js", (r) => r.fulfill({ contentType: "application/javascript", body: fixture }));
    await page.route("**/__test__/still.png", (r) => r.fulfill({ contentType: "image/png", body: fixtureMedia.png }));
    await page.route("**/__test__/clip.webm", (r) => r.fulfill({ contentType: "video/webm", body: fixtureMedia.webm }));
  }

  for (const w of [390, 1440]) {
    const { context, page, errors } = await openPage(browser, w, { route: routeFixture });
    await scrollThrough(page);
    await layoutChecks(page, `部品テスト ${w}px`);
    const titleLines = await page.evaluate(() => {
      const h = document.querySelector(".hero__title");
      return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight));
    });
    record(`部品テスト ${w}px: 長い見出しが折り返される`, titleLines >= 2, `${titleLines}行`);
    const hrefHash = await page.$$eval(".works a", (as) => as.filter((a) => a.getAttribute("href") === "#").length);
    record(`部品テスト ${w}px: 「#」リンクは表示されない`, hrefHash === 0, "");
    const empty = await page.isVisible(".works__empty");
    record(`部品テスト ${w}px: 作品があるとき空欄文は非表示`, !empty, "");

    await page.waitForTimeout(500);
    const autoplaying = await page.evaluate(() => !document.querySelector("video").paused);
    const muted = await page.evaluate(() => document.querySelector("video").muted);
    record(`部品テスト ${w}px: 映像は無音で再生`, autoplaying && muted, `playing=${autoplaying} muted=${muted}`);
    await page.click(".video__toggle");
    const pausedAfter = await page.evaluate(() => document.querySelector("video").paused);
    const pressed = await page.getAttribute(".video__toggle", "aria-pressed");
    await page.focus(".video__toggle");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const playingAgain = await page.evaluate(() => !document.querySelector("video").paused);
    record(`部品テスト ${w}px: 再生／一時停止ボタン（クリック・キーボード）`, pausedAfter && pressed === "false" && playingAgain, `paused=${pausedAfter} pressed=${pressed} replay=${playingAgain}`);
    await page.screenshot({ path: path.join(OUT, `check-fixture-${w}-full.png`), fullPage: true });
    record(`部品テスト ${w}px: コンソールエラーなし`, errors.length === 0, errors.join(" | "));
    await context.close();
  }

  // 動きを減らす設定
  {
    const { context, page } = await openPage(browser, 390, { reducedMotion: "reduce", route: routeFixture });
    await page.waitForTimeout(600);
    const paused = await page.evaluate(() => document.querySelector("video").paused);
    const poster = await page.getAttribute("video", "poster");
    const hidden = await page.$$eval(".reveal", (n) => n.length);
    const smooth = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    record("動きを減らす設定: 映像は自動再生せず静止画を表示", paused && !!poster, `poster=${poster}`);
    record("動きを減らす設定: フェード演出・スムーズスクロールなし", hidden === 0 && smooth === "auto", `reveal=${hidden} scroll=${smooth}`);
    await context.close();
  }

  // 映像が読めない場合は静止画に置き換え
  {
    const { context, page } = await openPage(browser, 390, {
      route: async (p) => {
        await routeFixture(p);
        await p.unroute("**/__test__/clip.webm");
        await p.route("**/__test__/clip.webm", (r) => r.fulfill({ status: 200, contentType: "video/webm", body: Buffer.from("broken") }));
      }
    });
    await page.waitForTimeout(800);
    const hasVideo = await page.$(".hero__media video");
    const img = await page.$eval(".hero__media img", (i) => i.naturalWidth > 0).catch(() => false);
    record("映像が壊れていても静止画で表示", !hasVideo && img, "");
    await context.close();
  }

  await browser.close();
  const ng = results.filter((r) => !r.ok);
  console.log(`\n${results.length - ng.length}/${results.length} OK`);
  fs.writeFileSync(path.join(OUT, "check-results.json"), JSON.stringify(results, null, 2));
  process.exit(ng.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
