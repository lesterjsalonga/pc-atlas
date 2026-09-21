import { register } from "tsx/esm/api";
register();
const { CATALOG, SYSTEMS } = await import("../lib/catalog.ts");
const { PIECES } = await import("../lib/geometry.ts");
const { createGeometry } = await import("../src/scene/shapes.ts");
const { pieceBounds } = await import("../lib/layout.ts");
const { default: assert } = await import("node:assert/strict");
const { Matrix4, Euler, Quaternion, Vector3 } = await import("three");
assert.ok(
  PIECES.length >= 300 && PIECES.length <= 800,
  `Piece count ${PIECES.length}`,
);
assert.equal(
  new Set(PIECES.map((p) => p.id)).size,
  PIECES.length,
  "Unique mesh IDs",
);
assert.equal(
  new Set(CATALOG.map((p) => p.id)).size,
  CATALOG.length,
  "Unique concept IDs",
);
for (const c of CATALOG) {
  assert.ok(SYSTEMS.some((s) => s.id === c.system));
  for (const field of ["name", "description", "function", "parent"])
    assert.ok(c[field].trim(), `${c.id}.${field}`);
  assert.ok(c.aliases.length && c.specs.length);
  assert.ok(
    PIECES.some((p) => p.conceptId === c.id),
    `No meshes: ${c.id}`,
  );
  for (const link of c.connectsTo) {
    const other = CATALOG.find((p) => p.id === link.id);
    assert.ok(other, `Broken reference ${link.id}`);
    assert.ok(
      other.connectsTo.some(
        (l) => l.id === c.id && l.connector === link.connector,
      ),
      `Nonreciprocal ${c.id} / ${link.id}`,
    );
  }
}
let triangles = 0;
for (const p of PIECES) {
  assert.equal(
    CATALOG.filter((c) => c.id === p.conceptId).length,
    1,
    `${p.id} exactly one concept`,
  );
  assert.equal(CATALOG.find((c) => c.id === p.conceptId).system, p.system);
  assert.ok(
    [...p.position, ...p.size, ...p.rotation, ...p.axis].every(Number.isFinite),
    p.id,
  );
  assert.ok(
    p.size.every((s) => s > 0),
    p.id,
  );
  const g = createGeometry(p);
  g.applyMatrix4(
    new Matrix4().compose(
      new Vector3(...p.position),
      new Quaternion().setFromEuler(new Euler(...p.rotation)),
      new Vector3(...p.size),
    ),
  );
  g.computeBoundingBox();
  const positions = g.getAttribute("position");
  assert.ok(Array.from(positions.array).every(Number.isFinite), `NaN: ${p.id}`);
  assert.ok(
    g.boundingBox
      .getSize(new Vector3())
      .toArray()
      .every((v) => v > 0),
    `Degenerate bounds: ${p.id}`,
  );
  const idx = g.index;
  const count = idx ? idx.count : positions.count;
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(positions, idx ? idx.getX(i) : i);
    b.fromBufferAttribute(positions, idx ? idx.getX(i + 1) : i + 1);
    c.fromBufferAttribute(positions, idx ? idx.getX(i + 2) : i + 2);
    assert.ok(
      b.sub(a).cross(c.sub(a)).lengthSq() > 1e-20,
      `Degenerate triangle ${p.id}:${i}`,
    );
    triangles++;
  }
  const bounds = pieceBounds(p);
  const center = new Vector3(...bounds.center),
    half = new Vector3(...bounds.size).multiplyScalar(0.5);
  const eps = 0.00001;
  for (let i = 0; i < 3; i++) {
    assert.ok(
      g.boundingBox.min.getComponent(i) >=
        center.getComponent(i) - half.getComponent(i) - eps,
      `Layout bounds min ${p.id}:${i}`,
    );
    assert.ok(
      g.boundingBox.max.getComponent(i) <=
        center.getComponent(i) + half.getComponent(i) + eps,
      `Layout bounds max ${p.id}:${i}`,
    );
  }
  g.dispose();
}
console.log(
  `Atlas valid: ${PIECES.length} selectable pieces, ${CATALOG.length} concepts, ${SYSTEMS.length} systems, ${triangles.toLocaleString()} triangles. All geometry finite, nondegenerate, and inside layout bounds; connections reciprocal.`,
);
