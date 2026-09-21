import type { Piece } from "./catalog";
export interface Cell {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}
export function pieceBounds(piece: Piece) {
  if (piece.path) {
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (const p of piece.path)
      p.forEach((v, i) => {
        min[i] = Math.min(min[i], v - 0.3);
        max[i] = Math.max(max[i], v + 0.3);
      });
    return {
      center: min.map((v, i) => (v + max[i]) / 2),
      size: min.map((v, i) => max[i] - v),
    };
  }
  const [rx, ry, rz] = piece.rotation,
    max = [0, 0, 0];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const [x, y, z] = piece.size.map((v, i) => (v / 2) * [sx, sy, sz][i]);
        const x1 = x * Math.cos(rz) - y * Math.sin(rz),
          y1 = x * Math.sin(rz) + y * Math.cos(rz);
        const x2 = x1 * Math.cos(ry) + z * Math.sin(ry),
          z2 = -x1 * Math.sin(ry) + z * Math.cos(ry);
        const v = [
          x2,
          y1 * Math.cos(rx) - z2 * Math.sin(rx),
          y1 * Math.sin(rx) + z2 * Math.cos(rx),
        ];
        v.forEach((n, i) => (max[i] = Math.max(max[i], Math.abs(n))));
      }
  return { center: piece.position, size: max.map((v) => v * 2) };
}
export function packInventory(pieces: readonly Piece[], aspect: number) {
  const entries = pieces
    .map((p) => {
      const b = pieceBounds(p);
      const size = Math.max(...b.size);
      const scale = Math.min(1, 1.5 / size);
      return {
        id: p.id,
        width: Math.max(0.13, b.size[0] * scale) + 0.065,
        height: Math.max(0.13, b.size[1] * scale) + 0.065,
        scale,
      };
    })
    .sort((a, b) => b.height - a.height || a.id.localeCompare(b.id));
  const area = entries.reduce((n, c) => n + c.width * c.height, 0);
  const limit = Math.max(
    0,
    ...entries.map((c) => c.width),
    Math.sqrt(area * Math.max(0.15, aspect)) * 1.07,
  );
  const cells = new Map<string, Cell>();
  let x = 0,
    y = 0,
    row = 0,
    width = 0;
  for (const e of entries) {
    if (x + e.width > limit && x > 0) {
      y += row;
      x = 0;
      row = 0;
    }
    cells.set(e.id, {
      x: x + e.width / 2,
      y: -(y + e.height / 2),
      width: e.width,
      height: e.height,
      scale: e.scale,
    });
    x += e.width;
    row = Math.max(row, e.height);
    width = Math.max(width, x);
  }
  const height = y + row;
  for (const c of cells.values()) {
    c.x -= width / 2;
    c.y += height / 2;
  }
  return { cells, width, height };
}
