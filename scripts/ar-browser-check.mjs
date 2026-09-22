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
const url = process.env.ATLAS_URL || "http://127.0.0.1:5173";
const errors = [],
  results = [];
async function ready(page) {
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.moving === "false",
    {},
    { timeout: 45000 },
  );
  await page.waitForTimeout(250);
}
try {
  for (const mode of ["absent", "false", "rejected", "insecure", "supported"]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      if (mode === "insecure")
        Object.defineProperty(window, "isSecureContext", { value: false });
      Object.defineProperty(navigator, "xr", {
        value:
          mode === "absent"
            ? undefined
            : {
                isSessionSupported: async () => {
                  if (mode === "rejected") throw Error("policy");
                  return mode === "supported" || mode === "insecure";
                },
                requestSession: async () => {
                  throw new DOMException(
                    "Permission denied",
                    "NotAllowedError",
                  );
                },
              },
      });
    }, mode);
    await page.goto(url);
    await ready(page);
    assert.equal(
      await page.getByRole("button", { name: "Enter AR", exact: true }).count(),
      mode === "supported" ? 1 : 0,
      mode,
    );
    assert.equal(
      await page
        .getByRole("button", { name: /unavailable|not supported/i })
        .count(),
      0,
    );
    if (mode === "supported") {
      const button = page.getByRole("button", {
        name: "Enter AR",
        exact: true,
      });
      await button.click();
      await page
        .getByRole("alert")
        .filter({ hasText: "AR could not start" })
        .waitFor();
      assert.equal(await button.isEnabled(), true);
      await page.screenshot({ path: "artifacts/ar-start-error.png" });
      await page
        .getByRole("button", { name: "Inventory", exact: true })
        .click();
      await ready(page);
      assert.equal(
        await page.locator("canvas").getAttribute("data-projection"),
        "orthographic",
      );
    }
    results.push(`support: ${mode}`);
    await page.close();
  }

  // Test-only XR runtime. Drives the installed Three WebXRManager and actual
  // React scene end-to-end, without claiming physical camera/hit-test coverage.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const transform = (matrix = identity()) => ({
      matrix,
      position: { x: matrix[12], y: matrix[13], z: matrix[14] },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    });
    const control = { session: null, hit: false, cancelled: 0, overlay: true };
    window.testXR = control;
    WebGL2RenderingContext.prototype.makeXRCompatible = async () => {};
    window.XRWebGLBinding = undefined;
    window.XRWebGLLayer = class {
      constructor() {
        this.framebuffer = null;
        this.framebufferWidth = 390;
        this.framebufferHeight = 844;
      }
      getViewport() {
        return { x: 0, y: 0, width: 390, height: 844 };
      }
    };
    class Session extends EventTarget {
      constructor() {
        super();
        this.inputSources = [];
        this.visibilityState = "visible";
        this.environmentBlendMode = "alpha-blend";
        this.renderState = {};
        this.reference = new EventTarget();
        this.domOverlayState = control.overlay ? { type: "screen" } : undefined;
        this.frames = new Set();
        const f = 1 / Math.tan(Math.PI / 6),
          near = 0.01,
          far = 30;
        this.frame = {
          session: this,
          getViewerPose: () => ({
            views: [
              {
                transform: transform(),
                projectionMatrix: [
                  f / (390 / 844),
                  0,
                  0,
                  0,
                  0,
                  f,
                  0,
                  0,
                  0,
                  0,
                  -(far + near) / (far - near),
                  -1,
                  0,
                  0,
                  (-2 * far * near) / (far - near),
                  0,
                ],
              },
            ],
          }),
          getPose: (space) => space.pose,
          getHitTestResults: () =>
            control.hit
              ? [
                  {
                    getPose: () => {
                      const m = identity();
                      m[13] = -0.4;
                      m[14] = -1;
                      return { transform: transform(m) };
                    },
                  },
                ]
              : [],
        };
      }
      async requestReferenceSpace() {
        return this.reference;
      }
      async requestHitTestSource() {
        return {
          cancel() {
            control.cancelled++;
          },
        };
      }
      updateRenderState(state) {
        Object.assign(this.renderState, state);
      }
      requestAnimationFrame(callback) {
        const id = requestAnimationFrame((time) => {
          this.frames.delete(id);
          callback(time, this.frame);
        });
        this.frames.add(id);
        return id;
      }
      cancelAnimationFrame(id) {
        cancelAnimationFrame(id);
        this.frames.delete(id);
      }
      async end() {
        this.dispatchEvent(new Event("end"));
        for (const id of this.frames) cancelAnimationFrame(id);
        this.frames.clear();
      }
      tap(y = -0.4, x = 0) {
        const length = Math.hypot(x, y, 1),
          dx = x / length,
          dy = y / length,
          dz = -1 / length;
        // Quaternion rotating -Z onto the target direction.
        const w = Math.sqrt((1 - dz) / 2),
          qx = dy / (2 * w),
          qy = -dx / (2 * w);
        const matrix = [
          1 - 2 * qy * qy,
          2 * qx * qy,
          -2 * qy * w,
          0,
          2 * qx * qy,
          1 - 2 * qx * qx,
          2 * qx * w,
          0,
          2 * qy * w,
          -2 * qx * w,
          1 - 2 * (qx * qx + qy * qy),
          0,
          0,
          0,
          0,
          1,
        ];
        const pose = {
          transform: {
            ...transform(matrix),
            orientation: { x: qx, y: qy, z: 0, w },
          },
        };
        const inputSource = {
          targetRayMode: "screen",
          targetRaySpace: { pose },
        };
        this.inputSources = [inputSource];
        for (const type of ["selectstart", "select", "selectend"]) {
          const event = new Event(type);
          Object.assign(event, { inputSource, frame: this.frame });
          this.dispatchEvent(event);
        }
        this.inputSources = [];
        const event = new Event("inputsourceschange");
        Object.assign(event, { removed: [inputSource], added: [] });
        this.dispatchEvent(event);
      }
    }
    Object.defineProperty(navigator, "xr", {
      value: {
        isSessionSupported: async () => true,
        requestSession: async () => {
          control.session = new Session();
          return control.session;
        },
      },
    });
  });
  await page.goto(url);
  await ready(page);
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await ready(page);
  const before = await page.locator("canvas").screenshot();
  await page.getByRole("button", { name: "Enter AR", exact: true }).click();
  await page.getByRole("button", { name: "End AR", exact: true }).waitFor();
  await page
    .getByText("Move slowly to find a tabletop.", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Reposition", exact: true })
      .isDisabled(),
    true,
  );
  await page.evaluate(() => {
    window.testXR.hit = true;
  });
  await page
    .getByText("Tap the ring to place your PC.", { exact: true })
    .waitFor();
  await page.screenshot({ path: "artifacts/ar-overlay-placement.png" });
  await page.evaluate(() => window.testXR.session.tap());
  await page
    .getByText("Drag to rotate · Pinch to resize · Tap a part", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Reposition", exact: true })
      .isEnabled(),
    true,
  );
  await page.evaluate(() => window.testXR.session.tap(-0.25));
  await page
    .getByRole("complementary", { name: "Component details" })
    .waitFor();
  await page.screenshot({ path: "artifacts/ar-overlay-details.png" });
  await page
    .getByRole("button", { name: "Reset size / turn", exact: true })
    .click();
  await page.getByRole("button", { name: "Reposition", exact: true }).click();
  await page
    .getByText("Tap the ring to place your PC.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "End AR", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".ar-active"));
  await ready(page);
  assert.equal(
    await page.locator("canvas").getAttribute("data-projection"),
    "orthographic",
  );
  assert.equal(await page.locator("canvas").getAttribute("data-selected"), "");
  assert.ok(
    before.equals(await page.locator("canvas").screenshot()),
    "Desktop canvas restores pixel-for-pixel after AR",
  );
  const frames = await page.locator("canvas").getAttribute("data-frames");
  await page.waitForTimeout(350);
  assert.equal(
    await page.locator("canvas").getAttribute("data-frames"),
    frames,
    "Desktop demand loop sleeps after AR",
  );
  assert.equal(await page.evaluate(() => window.testXR.cancelled), 1);
  await page.getByRole("button", { name: "Enter AR", exact: true }).click();
  await page.getByRole("button", { name: "End AR", exact: true }).waitFor();
  await page.evaluate(() => window.testXR.session.end());
  await page.waitForFunction(() => !document.querySelector(".ar-active"));
  await ready(page);
  assert.equal(await page.evaluate(() => window.testXR.cancelled), 2);
  assert.deepEqual(errors, []);
  results.push(
    "real Three renderer with test XR runtime: placement, picking, inspector, reset, reposition, native end, reentry, exact desktop restoration, idle loop",
  );
  await writeFile(
    "artifacts/ar-browser-report.json",
    JSON.stringify({ passed: true, results, errors }, null, 2),
  );
  console.log(
    "AR browser checks passed: support UI, denied permission, overlay, Three session lifecycle and desktop restoration. Physical AR still requires device testing.",
  );
} finally {
  await browser.close();
}
