import { register } from "tsx/esm/api";
register();
import assert from "node:assert/strict";
const { PIECES } = await import("../lib/geometry.ts");
const { SYSTEMS } = await import("../lib/catalog.ts");
const {
  initialState,
  selectConcept,
  toggleSystem,
  isVisible,
  searchParts,
  TapGesture,
  PRESETS,
} = await import("../lib/interactions.ts");
const { packInventory } = await import("../lib/layout.ts");
let state = selectConcept({ ...initialState, visible: [] }, "cpu");
assert.equal(state.selected, "cpu");
assert.ok(state.visible.includes("processor"));
state = toggleSystem(state, "processor");
assert.equal(state.selected, null);
assert.equal(state.isolate, false);
for (const q of ["RAM", "DIMM", "memory stick", "dimm-a", "memroy"])
  assert.ok(
    searchParts(q).some((p) => p.id === "dimm-a"),
    `Fuzzy search ${q}`,
  );
assert.equal(searchParts("zzzzzzzzz").length, 0);
assert.ok(searchParts("power").some((p) => p.id === "psu"));
assert.equal(searchParts("cpu-1")[0].matchedPiece, "cpu-1");
assert.equal(searchParts("cpu-1")[0].id, "cpu");
state = { ...selectConcept(initialState, "gpu"), isolate: true };
assert.ok(
  PIECES.filter((p) => isVisible(p, state)).every((p) => p.conceptId === "gpu"),
);
assert.ok(PIECES.filter((p) => isVisible(p, state)).length > 1);
assert.equal(selectConcept(state, "nonexistent"), state);
const tap = new TapGesture();
tap.start(1, 0, 0);
assert.ok(tap.finish(1, 2, 2));
tap.start(1, 0, 0);
tap.move(1, 30, 0);
assert.equal(tap.finish(1, 0, 0), false);
tap.start(1, 0, 0, true);
tap.start(2, 5, 5, true);
assert.equal(tap.finish(2, 5, 5), false);
assert.equal(tap.finish(1, 0, 0), false);
tap.start(1, 0, 0);
tap.cancel(1);
assert.equal(tap.finish(1, 0, 0), false);
tap.start(2, 0, 0, true);
assert.ok(tap.finish(2, 4, 4));
let layouts = 0;
for (const [w, h] of [
  [1440, 900],
  [390, 844],
  [320, 568],
  [844, 390],
  [390, 200],
  [320, 100],
])
  for (const parts of [
    PIECES,
    ...SYSTEMS.map((s) => PIECES.filter((p) => p.system === s.id)),
    ...PRESETS.map((p) => PIECES.filter((m) => p.systems.includes(m.system))),
  ]) {
    const { cells, width, height } = packInventory(parts, w / h);
    assert.equal(cells.size, parts.length);
    assert.ok(Number.isFinite(width) && Number.isFinite(height));
    const entries = [...cells.values()];
    for (let i = 0; i < entries.length; i++)
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i],
          b = entries[j];
        assert.ok(
          Math.abs(a.x - b.x) >= (a.width + b.width) / 2 - 1e-8 ||
            Math.abs(a.y - b.y) >= (a.height + b.height) / 2 - 1e-8,
          `Overlap ${w}x${h}:${i},${j}`,
        );
      }
    layouts++;
  }
assert.equal(packInventory([], 1).cells.size, 0);
console.log(
  `Interaction contracts valid: selection, system toggles, aliases and typo search, isolation, tap/drag/multitouch cancellation; ${layouts} nonoverlapping layouts.`,
);
