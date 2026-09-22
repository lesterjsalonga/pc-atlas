import { register } from "tsx/esm/api";
register();
import assert from "node:assert/strict";
import * as T from "three";
const { detectARSupport, PlacementState, ARGestures, isHorizontalSurface } =
  await import("../lib/ar.ts");
const { createTabletopAR } = await import("../src/scene/TabletopAR.ts");

let probes = 0;
const supported = {
  async isSessionSupported(mode) {
    probes++;
    assert.equal(mode, "immersive-ar");
    return true;
  },
};
assert.equal(await detectARSupport(false, supported), "insecure");
assert.equal(probes, 0, "Insecure contexts never probe XR");
assert.equal(await detectARSupport(true), "unavailable");
assert.equal(await detectARSupport(true, supported), "supported");
assert.equal(
  await detectARSupport(true, { isSessionSupported: async () => false }),
  "unavailable",
);
assert.equal(
  await detectARSupport(true, {
    isSessionSupported: async () => {
      throw Error("policy");
    },
  }),
  "unavailable",
);

const placement = new PlacementState();
assert.equal(placement.place(), false);
placement.surface(true);
placement.surface(false);
assert.equal(placement.place(), false, "Lost hit cannot place");
placement.surface(true);
assert.equal(placement.place(), true);
placement.surface(false);
assert.equal(placement.phase, "placed", "Placement survives lost hit tests");
placement.transform(0.5, 100);
assert.equal(placement.scale, 2);
placement.transform(0, 0.001);
assert.equal(placement.scale, 0.5);
placement.transform(NaN, Infinity);
assert.equal(placement.rotation, 0.5);
placement.reset();
assert.equal(placement.scale, 1);
assert.equal(placement.phase, "placed");
placement.reposition();
assert.equal(placement.place(), false, "Reposition requires a fresh hit");
assert.ok(isHorizontalSurface(new T.Matrix4().elements));
assert.equal(
  isHorizontalSurface(new T.Matrix4().makeRotationX(Math.PI / 2).elements),
  false,
);
assert.equal(
  isHorizontalSurface(new T.Matrix4().makeRotationZ(Math.PI).elements),
  false,
);
assert.equal(isHorizontalSurface([NaN]), false);

const gestures = new ARGestures();
const p = (id, x, y = 0) => ({ id, x, y });
gestures.begin(p(1, 0), 0);
assert.ok(gestures.finish(p(1, 5), 200));
gestures.begin(p(1, 0), 0);
assert.equal(gestures.finish(p(1, 0), 900), false, "Long hold isn't a tap");
gestures.begin(p(1, 0), 0);
assert.ok(gestures.sample([p(1, 60)], 100).rotation > 0);
gestures.sample([p(1, 0)], 200);
assert.equal(
  gestures.finish(p(1, 0), 250),
  false,
  "Returning drag isn't a tap",
);
gestures.sample([p(1, 0), p(2, 100)], 0);
assert.equal(gestures.sample([p(1, -50), p(2, 150)], 100).factor, 2);
assert.equal(gestures.finish(p(1, -50), 150), false);
assert.equal(
  gestures.sample([p(2, 150)], 170).rotation,
  0,
  "Pinch-to-one has no jump",
);
assert.equal(gestures.finish(p(2, 150), 200), false);
gestures.begin(p(1, 0), 0);
gestures.cancel(1);
assert.equal(gestures.finish(p(1, 0), 50), false);

// Exercise the real session coordinator with a deterministic XR runtime. This
// does not emulate camera tracking or replace the physical-device checklist.
globalThis.window = Object.assign(new EventTarget(), { isSecureContext: true });
globalThis.innerWidth = 400;
globalThis.innerHeight = 800;
const context = {
  clearRect() {},
  fillRect() {},
  fillText() {},
  measureText(text) {
    return { width: text.length * 15 };
  },
};
globalThis.document = {
  createElement: () => ({ getContext: () => context }),
  elementFromPoint: () => null,
};
const nextTurn = () => new Promise((resolve) => setTimeout(resolve, 0));
function pose(matrix) {
  const position = new T.Vector3(),
    quaternion = new T.Quaternion();
  matrix.decompose(position, quaternion, new T.Vector3());
  return {
    transform: { matrix: matrix.elements, position, orientation: quaternion },
  };
}
function setup({
  overlay = true,
  failure = "",
  deferredHit = null,
  deferredBinding = null,
} = {}) {
  const reference = new EventTarget(),
    viewer = new EventTarget();
  const session = new EventTarget();
  let cancelled = 0,
    restores = 0,
    enters = 0,
    selects = 0,
    loop = null,
    status;
  let requested;
  const hitSource = {
    cancel() {
      cancelled++;
      if (failure === "cancel")
        throw new DOMException("Source expired", "InvalidStateError");
    },
  };
  Object.assign(session, {
    visibilityState: "visible",
    inputSources: [],
    domOverlayState: overlay ? { type: "screen" } : undefined,
    requestReferenceSpace: async () => viewer,
    requestHitTestSource: async () => {
      if (failure === "hit") throw Error("hit");
      return deferredHit ? await deferredHit : hitSource;
    },
    async end() {
      session.dispatchEvent(new Event("end"));
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      xr: {
        async requestSession(mode, options) {
          requested = { mode, options };
          if (failure === "request") throw Error("permission");
          return session;
        },
      },
    },
  });
  const renderer = {
    xr: {
      enabled: false,
      setReferenceSpaceType(type) {
        assert.equal(type, "local");
      },
      async setSession() {
        if (deferredBinding) await deferredBinding;
        if (failure === "binding") throw Error("bind");
      },
      getReferenceSpace: () => reference,
    },
    getContext: () => ({
      async makeXRCompatible() {
        if (failure === "gl") throw Error("gl");
      },
    }),
    setAnimationLoop(fn) {
      loop = fn;
    },
    render() {},
  };
  const scene = new T.Scene(),
    model = new T.Group();
  model.position.set(3, 2, 1);
  scene.add(model);
  const root = new EventTarget();
  const ar = createTabletopAR({
    renderer,
    scene,
    model,
    overlay: root,
    bounds: new T.Box3(new T.Vector3(-1, -2, -1), new T.Vector3(1, 2, 1)),
    onStatus(s) {
      status = s;
    },
    onEnter() {
      enters++;
    },
    onRestore() {
      restores++;
    },
    render() {},
    select() {
      selects++;
    },
    details: () => "Desktop processor: runs instructions.",
  });
  let surface = new T.Matrix4().makeTranslation(0, -0.4, -1),
    tracking = true;
  const projection = new T.PerspectiveCamera(60, 0.5, 0.01, 30).projectionMatrix
    .elements;
  const view = {
    projectionMatrix: projection,
    transform: pose(new T.Matrix4()).transform,
  };
  const frame = {
    getViewerPose: () => (tracking ? { views: [view] } : null),
    getPose(space) {
      return space.pose;
    },
    getHitTestResults() {
      if (surface === "error") throw Error("lost source");
      return surface ? [{ getPose: () => pose(surface) }] : [];
    },
  };
  function source(x = 0, y = -0.4) {
    const q = new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 0, -1),
      new T.Vector3(x, y, -1).normalize(),
    );
    return {
      targetRayMode: "screen",
      targetRaySpace: {
        pose: pose(new T.Matrix4().makeRotationFromQuaternion(q)),
      },
    };
  }
  function event(type, inputSource) {
    const e = new Event(type);
    Object.assign(e, { frame, inputSource });
    session.dispatchEvent(e);
  }
  function remove(inputSource) {
    session.inputSources = session.inputSources.filter(
      (s) => s !== inputSource,
    );
    const e = new Event("inputsourceschange");
    Object.assign(e, { removed: [inputSource], added: [] });
    session.dispatchEvent(e);
  }
  function tap(inputSource = source()) {
    session.inputSources = [inputSource];
    event("selectstart", inputSource);
    event("select", inputSource);
    event("selectend", inputSource);
    remove(inputSource);
  }
  function hudTap(column) {
    const panel = scene.children.find(
      (child) => child.geometry?.type === "PlaneGeometry",
    );
    const target = new T.Vector3(
      (column + 0.5) / 3 - 0.5,
      -0.35,
      0,
    ).applyMatrix4(panel.matrixWorld);
    tap(source(target.x / -target.z, target.y / -target.z));
  }
  return {
    ar,
    model,
    session,
    reference,
    scene,
    renderer,
    source,
    event,
    remove,
    tap,
    hudTap,
    tick() {
      loop?.(performance.now(), frame);
    },
    surface(value) {
      surface = value;
    },
    tracking(value) {
      tracking = value;
    },
    get stats() {
      return { status, cancelled, restores, enters, selects, loop, requested };
    },
  };
}
for (const overlay of [true, false]) {
  const h = setup({ overlay });
  h.ar.commands.enter();
  h.ar.commands.enter();
  await nextTurn();
  assert.equal(h.stats.enters, 1, "Entry is guarded");
  assert.equal(h.stats.requested.mode, "immersive-ar");
  assert.deepEqual(h.stats.requested.options.optionalFeatures, ["dom-overlay"]);
  assert.equal(h.stats.status.overlay, overlay);
  assert.equal(h.model.visible, false);
  h.tap();
  assert.equal(h.model.visible, false, "No hit yet");
  h.surface(new T.Matrix4().makeRotationX(Math.PI / 2));
  h.tick();
  h.tap();
  assert.equal(h.model.visible, false, "Walls cannot place");
  h.surface(new T.Matrix4().makeTranslation(0, -0.4, -1));
  h.tick();
  assert.equal(h.stats.status.phase, "ready");
  h.tap(h.source(1));
  assert.equal(h.model.visible, false, "Must tap the reticle");
  h.tap();
  assert.equal(h.model.visible, true);
  assert.equal(h.model.scale.x, 0.08, "32 cm model");
  assert.ok(
    Math.abs(h.model.position.y - 2 * h.model.scale.y + 0.4) < 1e-8,
    "Feet on surface",
  );
  const placed = h.model.matrixWorld.clone();
  h.surface(new T.Matrix4().makeTranslation(8, 9, 10));
  h.tick();
  assert.deepEqual(
    h.model.matrixWorld.elements,
    placed.elements,
    "Later hits cannot move placement",
  );
  h.tap();
  assert.equal(h.stats.selects, 1, "Placed taps use shared selection callback");
  const s = h.source();
  h.session.inputSources = [s];
  h.event("selectstart", s);
  s.targetRaySpace.pose = h.source(0.2).targetRaySpace.pose;
  h.tick();
  h.event("select", s);
  h.event("selectend", s);
  h.remove(s);
  assert.equal(h.stats.selects, 1, "Drag cannot select");
  assert.notEqual(h.model.quaternion.y, 0);
  const a = h.source(-0.1),
    b = h.source(0.1);
  h.session.inputSources = [a, b];
  h.event("selectstart", a);
  h.tick();
  a.targetRaySpace.pose = h.source(-0.2).targetRaySpace.pose;
  b.targetRaySpace.pose = h.source(0.2).targetRaySpace.pose;
  h.tick();
  h.event("select", a);
  h.event("selectend", a);
  h.remove(a);
  h.remove(b);
  assert.ok(h.model.scale.x > 0.08);
  assert.equal(h.stats.selects, 1, "Auxiliary XR touch cancels tap");
  if (overlay) h.ar.commands.reset();
  else h.hudTap(1);
  assert.equal(h.model.scale.x, 0.08);
  assert.equal(h.model.quaternion.y, 0);
  const held = h.source();
  h.session.inputSources = [held];
  h.event("selectstart", held);
  window.dispatchEvent(new Event("resize"));
  h.event("select", held);
  h.event("selectend", held);
  h.remove(held);
  assert.equal(h.stats.selects, 1, "Resize cancels held touches");
  const originReset = new Event("reset");
  const previousX = h.model.position.x;
  Object.assign(originReset, {
    transform: {
      inverse: { matrix: new T.Matrix4().makeTranslation(-1, 0, 0).elements },
    },
  });
  h.reference.dispatchEvent(originReset);
  assert.equal(
    h.model.position.x,
    previousX - 1,
    "Placement rebases with the reference space",
  );
  h.tracking(false);
  h.tick();
  h.tap();
  assert.equal(h.stats.selects, 1, "Tracking loss cannot select");
  h.tracking(true);
  h.tick();
  if (overlay) h.ar.commands.reposition();
  else h.hudTap(0);
  h.tap();
  assert.equal(h.model.visible, false, "Reposition discards old reticle");
  h.surface(null);
  h.tick();
  if (overlay) h.ar.commands.end();
  else h.hudTap(2);
  await nextTurn();
  assert.deepEqual(h.model.position.toArray(), [3, 2, 1]);
  assert.deepEqual(h.model.scale.toArray(), [1, 1, 1]);
  assert.equal(h.model.visible, true);
  assert.equal(h.stats.loop, null);
  assert.equal(h.renderer.xr.enabled, false);
  assert.equal(h.stats.cancelled, 1);
  assert.equal(h.stats.restores, 1);
  h.ar.commands.enter();
  await nextTurn();
  assert.equal(h.stats.status.phase, "searching", "Reentry has no stale hit");
  await h.ar.dispose();
  assert.equal(h.scene.children.length, 1, "All XR resources detached");
}
for (const failure of ["request", "hit", "gl", "binding"]) {
  const h = setup({ failure });
  h.ar.commands.enter();
  await nextTurn();
  assert.equal(h.ar.active, false, failure);
  assert.equal(h.stats.status.starting, false);
  assert.match(h.stats.status.message, /AR could not start/);
  assert.equal(h.stats.loop, null);
  await h.ar.dispose();
}
const deferred = Promise.withResolvers();
const h = setup({ deferredHit: deferred.promise });
h.ar.commands.enter();
await nextTurn();
await h.session.end();
await nextTurn();
h.session.requestHitTestSource = async () => ({ cancel() {} });
h.ar.commands.enter();
await nextTurn();
assert.equal(h.ar.active, true);
let lateCancelled = false;
deferred.resolve({
  cancel() {
    lateCancelled = true;
  },
});
await nextTurn();
assert.equal(lateCancelled, true, "Late hit sources are cancelled");
assert.equal(
  h.ar.active,
  true,
  "A stale setup cannot restore over a newer session",
);
await h.ar.dispose();
const runtimeFailure = setup();
runtimeFailure.ar.commands.enter();
await nextTurn();
runtimeFailure.surface("error");
runtimeFailure.tick();
await nextTurn();
assert.equal(runtimeFailure.ar.active, false);
assert.match(runtimeFailure.stats.status.message, /AR could not read surfaces/);
await runtimeFailure.ar.dispose();
const expiredSource = setup({ failure: "cancel" });
expiredSource.ar.commands.enter();
await nextTurn();
expiredSource.ar.commands.end();
await nextTurn();
assert.equal(
  expiredSource.stats.restores,
  1,
  "An expired hit source cannot prevent restoration",
);
assert.equal(expiredSource.ar.active, false);
await expiredSource.ar.dispose();
const binding = Promise.withResolvers();
const race = setup({ deferredBinding: binding.promise });
race.ar.commands.enter();
await nextTurn();
await race.session.end();
await nextTurn();
binding.resolve();
await nextTurn();
assert.equal(
  race.stats.restores,
  1,
  "End during renderer binding restores once",
);
assert.equal(race.stats.loop, null);
await race.ar.dispose();
console.log(
  "AR contracts valid: secure support detection, horizontal placement, scale limits, tap/drag/pinch, XR event order, optional overlay, reentry, cancellation, startup failures and session cleanup.",
);
