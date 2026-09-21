import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-angle=swiftshader",
    "--enable-webgl",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [];
const report = [];
async function settle(page) {
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.ready === "true",
    {},
    { timeout: 45000 },
  );
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.moving === "false",
    {},
    { timeout: 45000 },
  );
}
async function search(page, q, name) {
  await page.getByRole("button", { name: "Search parts", exact: true }).click();
  await page.getByRole("textbox", { name: "Search components" }).fill(q);
  await page.getByRole("button", { name, exact: false }).click();
  await settle(page);
}
async function layout(page, label) {
  const data = await page.evaluate(() => {
    const rect = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        right: r.right,
        bottom: r.bottom,
      };
    };
    return {
      w: innerWidth,
      h: innerHeight,
      scroll: document.documentElement.scrollWidth,
      canvas: rect("canvas"),
      cameraRail: rect(".camera-tools"),
      toolbar: rect(".viewer-footer"),
      details: rect(".detail-panel"),
      projection: document.querySelector("canvas").dataset.projection,
      frames: document.querySelector("canvas").dataset.frames,
      calls: document.querySelector("canvas").dataset.drawCalls,
    };
  });
  assert.ok(data.scroll <= data.w, `${label} horizontal overflow`);
  assert.ok(data.canvas.h >= 70, `${label} viewport too short`);
  assert.ok(
    data.canvas.bottom <= data.toolbar.y + 1,
    `${label} controls cover scene`,
  );
  assert.ok(
    data.canvas.right <= data.cameraRail.x + 1,
    `${label} camera controls cover scene`,
  );
  if (label.includes("inventory"))
    assert.equal(data.projection, "orthographic");
  if (data.details)
    assert.ok(
      data.canvas.bottom <= data.details.y + 1 ||
        data.canvas.right <= data.details.x + 1,
      `${label} details cover scene`,
    );
  report.push({ label, ...data });
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(process.env.ATLAS_URL || "http://127.0.0.1:5173");
  await settle(page);
  await layout(page, "desktop-assembled");
  await page.screenshot({ path: "artifacts/desktop-assembled.png" });
  const initial = Number(
    await page.locator("canvas").getAttribute("data-visible"),
  );
  assert.ok(initial >= 300);
  const frames = await page.locator("canvas").getAttribute("data-frames");
  await page.waitForTimeout(350);
  assert.equal(
    await page.locator("canvas").getAttribute("data-frames"),
    frames,
    "Scene must sleep when idle",
  );
  await page.getByRole("switch", { name: "Show Memory", exact: true }).click();
  await settle(page);
  assert.ok(
    Number(await page.locator("canvas").getAttribute("data-visible")) < initial,
  );
  await page.getByRole("switch", { name: "Show Memory", exact: true }).click();
  await settle(page);
  await search(page, "memroy", "DDR5 memory · module A");
  assert.equal(
    await page.locator("canvas").getAttribute("data-selected"),
    "dimm-a",
  );
  await page
    .getByRole("button", { name: "Isolate component", exact: true })
    .click();
  await settle(page);
  assert.ok(
    Number(await page.locator("canvas").getAttribute("data-visible")) < 60,
  );
  await page.screenshot({ path: "artifacts/desktop-isolated.png" });
  await page
    .getByRole("button", { name: "Show surrounding parts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show connections", exact: true })
    .click();
  await settle(page);
  assert.ok(
    Number(await page.locator("canvas").getAttribute("data-connections")) > 0,
  );
  await page
    .getByRole("button", { name: "DIMM slots DDR5 edge connector" })
    .click();
  await settle(page);
  assert.equal(
    await page.locator("canvas").getAttribute("data-selected"),
    "ram-slots",
  );
  await page.screenshot({ path: "artifacts/desktop-connections.png" });
  await page
    .getByRole("button", { name: "Reset view and systems", exact: true })
    .click();
  await settle(page);
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.55, {
    steps: 12,
  });
  await page.mouse.up();
  await settle(page);
  assert.equal(
    await canvas.getAttribute("data-selected"),
    "",
    "Drag must not select",
  );
  await page
    .getByRole("button", { name: "Reset view and systems", exact: true })
    .click();
  await settle(page);
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await settle(page);
  assert.notEqual(
    await canvas.getAttribute("data-selected"),
    "",
    "Canvas picking selects a part",
  );
  await page
    .getByRole("button", { name: "Close component details", exact: true })
    .click();
  for (const preset of [
    "full",
    "board",
    "cooling",
    "power",
    "memory",
    "internals",
  ]) {
    await page
      .getByRole("combobox", { name: "View preset" })
      .selectOption(preset);
    await settle(page);
    assert.ok(Number(await canvas.getAttribute("data-visible")) > 0);
  }
  await page.getByRole("button", { name: "Exploded", exact: true }).click();
  await settle(page);
  await page.screenshot({ path: "artifacts/desktop-exploded.png" });
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await settle(page);
  await layout(page, "desktop-inventory");
  await page.screenshot({ path: "artifacts/desktop-inventory.png" });
  await page.getByRole("button", { name: "Hide all", exact: true }).click();
  await page.getByText("No systems visible", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Restore build", exact: true })
    .click();
  await settle(page);
  await search(page, "cpu-1", "Desktop processor");
  await page.getByText("Processor substrate", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Close component details", exact: true })
    .click();
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page
      .getByRole("button", { name: "Reset view and systems", exact: true })
      .click();
    await settle(page);
    const label = `${size.width}x${size.height}`;
    await layout(page, `${label}-assembled`);
    await page.screenshot({ path: `artifacts/${label}-assembled.png` });
    await page.getByRole("button", { name: "Systems", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("switch", { name: "Show Memory", exact: true })
      .click();
    await page.getByRole("button", { name: "Back to explorer" }).click();
    await settle(page);
    await page.getByRole("button", { name: "Inventory", exact: true }).click();
    await settle(page);
    await layout(page, `${label}-inventory`);
    await page.screenshot({ path: `artifacts/${label}-inventory.png` });
    await search(page, "cpu", "Desktop processor");
    await page
      .getByRole("button", { name: "Isolate component", exact: true })
      .click();
    await settle(page);
    await layout(page, `${label}-details`);
    await page.screenshot({ path: `artifacts/${label}-details.png` });
    await page
      .getByRole("button", { name: "Close component details", exact: true })
      .click();
  }
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const phone = await touch.newPage();
  await phone.goto(process.env.ATLAS_URL || "http://127.0.0.1:5173");
  await settle(phone);
  let r = await phone.locator("canvas").boundingBox();
  await phone.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  await settle(phone);
  assert.notEqual(
    await phone.locator("canvas").getAttribute("data-selected"),
    "",
    "Touch tap selects",
  );
  await phone
    .getByRole("button", { name: "Close component details", exact: true })
    .click();
  await settle(phone);
  r = await phone.locator("canvas").boundingBox();
  const cdp = await touch.newCDPSession(phone);
  const x = r.x + r.width * 0.5,
    y = r.y + r.height * 0.5;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  for (let i = 1; i <= 6; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + i * 8, y: y + i * 2, id: 1 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await settle(phone);
  assert.equal(
    await phone.locator("canvas").getAttribute("data-selected"),
    "",
    "Touch drag must not select",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 20, y, id: 1 },
      { x: x + 20, y, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 40, y, id: 1 },
      { x: x + 40, y, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await settle(phone);
  assert.equal(
    await phone.locator("canvas").getAttribute("data-selected"),
    "",
    "Synthetic pinch must not select",
  );
  await touch.close();
  assert.deepEqual(errors, [], "Browser console errors");
  await writeFile(
    "artifacts/browser-report.json",
    JSON.stringify({ passed: true, report, errors }, null, 2),
  );
  console.log(
    `Browser checks passed: ${report.length} layouts, picking, orbit drag, touch tap, presets, system toggles, fuzzy search, isolation, links, connections, idle rendering. Screenshots: artifacts/`,
  );
} finally {
  await browser.close();
}
