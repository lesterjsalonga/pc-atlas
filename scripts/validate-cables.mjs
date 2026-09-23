import { register } from "tsx/esm/api";
register();
import assert from "node:assert/strict";
import * as T from "three";
const { PIECES } = await import("../lib/geometry.ts");
const { createGeometry } = await import("../src/scene/shapes.ts");

// Check the rendered tube, including its radius and spline bends, against
// conservative bounds for every solid part (also hidden covers and the tray).
const obstacles = PIECES.filter((p) => p.shape !== "tube").map((piece) => {
  const geometry = createGeometry(piece);
  geometry.scale(...piece.size);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox.clone();
  geometry.dispose();
  const matrix = new T.Matrix4().compose(
    new T.Vector3(...piece.position),
    new T.Quaternion().setFromEuler(new T.Euler(...piece.rotation)),
    new T.Vector3(1, 1, 1),
  );
  return { piece, box, inverse: matrix.invert() };
});
const clashes = new Map();
const point = new T.Vector3();
for (const cable of PIECES.filter((p) => p.shape === "tube")) {
  const geometry = createGeometry(cable);
  const clearance = geometry.parameters.radius + 0.005;
  const points = geometry.parameters.path.getSpacedPoints(2048);
  const start = new T.Vector3(...cable.path[0]);
  const end = new T.Vector3(...cable.path.at(-1));
  const source = cable.conceptId === "sata-data" ? "sata-port" : "psu";
  function touches(conceptId, endpoint) {
    return obstacles.some(
      (obstacle) =>
        obstacle.piece.conceptId === conceptId &&
        obstacle.box
          .clone()
          .expandByScalar(geometry.parameters.radius)
          .containsPoint(endpoint.clone().applyMatrix4(obstacle.inverse)),
    );
  }
  assert.ok(
    touches(source, start),
    `${cable.id} stays connected to its source`,
  );
  assert.ok(
    touches(cable.conceptId, end),
    `${cable.id} stays connected to its plug`,
  );
  for (const obstacle of obstacles) {
    const expanded = obstacle.box.clone().expandByScalar(clearance);
    for (const world of points) {
      // The short ends deliberately enter their own plug/source socket.
      if (
        obstacle.piece.conceptId === cable.conceptId &&
        world.distanceTo(end) < 0.16
      )
        continue;
      if (obstacle.piece.conceptId === source && world.distanceTo(start) < 0.1)
        continue;
      point.copy(world).applyMatrix4(obstacle.inverse);
      if (expanded.containsPoint(point)) {
        const key = `${cable.conceptId}: ${obstacle.piece.name}`;
        clashes.set(key, world.toArray());
      }
    }
  }
  geometry.dispose();
}
assert.deepEqual(
  [...clashes],
  [],
  "Cable meshes must not penetrate unrelated components",
);
console.log(
  "Cable routing valid: all five harnesses clear the solid components, tray, and side panels.",
);
