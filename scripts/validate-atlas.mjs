import { register } from "tsx/esm/api";
register();
const { CATALOG, SYSTEMS } = await import("../lib/catalog.ts");
const { PIECES } = await import("../lib/geometry.ts");
const { createGeometry } = await import("../src/scene/shapes.ts");
const { rotateFanBlade } = await import("../src/scene/fans.ts");
const { pieceBounds } = await import("../lib/layout.ts");
const { default: assert } = await import("node:assert/strict");
const {
  Matrix4,
  Euler,
  Quaternion,
  Vector3,
  Object3D,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
} = await import("three");
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
// Rear openings must be actual holes, allowing picking/visibility of the fan,
// ports and PSU, while the surrounding steel still intercepts selection rays.
const rear = PIECES.find((p) => p.shape === "rear-panel");
const rearMesh = new Mesh(createGeometry(rear), new MeshBasicMaterial());
rearMesh.position.set(...rear.position);
rearMesh.rotation.set(...rear.rotation);
rearMesh.scale.set(...rear.size);
rearMesh.updateMatrixWorld(true);
function hitsRear(y, z) {
  return (
    new Raycaster(new Vector3(-3, y, z), new Vector3(1, 0, 0)).intersectObject(
      rearMesh,
    ).length > 0
  );
}
for (const [y, z] of [
  [1.17, 0.7],
  [1.57, 0.7],
  [1.17, 1.1],
  [0.49, -0.13],
  [-0.11, -0.13],
  [-0.33, 0.4],
  [-0.77, 0.04],
  [-1.69, 0.32],
  [-1.14, 0.5],
])
  assert.equal(
    hitsRear(y, z),
    false,
    `Rear opening at ${y}, ${z} is unobstructed`,
  );
for (const [y, z] of [
  [1.9, 0.7],
  [0.25, 0.6],
  [-1.69, 1.32],
])
  assert.equal(hitsRear(y, z), true, `Rear steel at ${y}, ${z} is selectable`);
rearMesh.geometry.dispose();
rearMesh.material.dispose();

// Validate every mounting plane: blades must orbit their own hub, including
// both GPU fans and both intake fans, while static frames remain untouched.
const rotors = new Set();
for (const piece of PIECES) {
  const object = new Object3D();
  object.position.set(...piece.position);
  object.rotation.set(...piece.rotation);
  const before = object.position.clone();
  const orientation = object.quaternion.clone();
  rotateFanBlade(piece, Math.PI / 2, object, 1);
  if (!piece.rotor) {
    assert.deepEqual(object.position, before, `${piece.id} is stationary`);
    assert.ok(object.quaternion.equals(orientation));
    continue;
  }
  rotors.add(piece.rotor.center.join(","));
  const center = new Vector3(...piece.rotor.center);
  const axis = new Vector3(...piece.rotor.axis);
  const start = before.clone().sub(center);
  const end = object.position.clone().sub(center);
  assert.ok(
    Math.abs(start.length() - end.length()) < 1e-8,
    `${piece.id} stays at its hub radius`,
  );
  assert.ok(
    Math.abs(start.dot(axis) - end.dot(axis)) < 1e-8,
    `${piece.id} stays in its mounting plane`,
  );
  assert.ok(
    before.distanceTo(object.position) > 0.1,
    `${piece.id} orbits instead of spinning in place`,
  );
  assert.ok(
    new Vector3(0, 0, 1).applyQuaternion(object.quaternion).distanceTo(axis) <
      1e-8,
  );
  // An exploded layout translation must not change the rotor's orbit.
  const shifted = new Object3D();
  const shift = new Vector3(2, 1, -3);
  shifted.position.copy(before).add(shift);
  shifted.rotation.set(...piece.rotation);
  rotateFanBlade(piece, Math.PI / 2, shifted, 1);
  assert.ok(
    shifted.position.distanceTo(object.position.clone().add(shift)) < 1e-8,
  );
}
assert.equal(rotors.size, 6, "All six fan assemblies animate independently");
console.log(
  `Atlas valid: ${PIECES.length} selectable pieces, ${CATALOG.length} concepts, ${SYSTEMS.length} systems, ${triangles.toLocaleString()} triangles. All geometry finite, nondegenerate, and inside layout bounds; connections reciprocal.`,
);
