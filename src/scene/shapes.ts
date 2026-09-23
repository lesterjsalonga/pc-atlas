import * as T from "three";
import type { Piece } from "../../lib/catalog";
export function createGeometry(piece: Piece): T.BufferGeometry {
  switch (piece.shape) {
    case "box":
      return new T.BoxGeometry(1, 1, 1);
    case "cylinder":
      return new T.CylinderGeometry(0.5, 0.5, 1, 16).rotateX(Math.PI / 2);
    case "ring":
      return new T.TorusGeometry(0.435, 0.045, 6, 36);
    case "blade": {
      const s = new T.Shape();
      s.moveTo(-0.5, -0.3);
      s.quadraticCurveTo(0.1, -0.5, 0.5, -0.2);
      s.lineTo(0.38, 0.38);
      s.quadraticCurveTo(-0.12, 0.1, -0.5, 0.22);
      s.closePath();
      return new T.ExtrudeGeometry(s, {
        depth: 1,
        bevelEnabled: false,
        curveSegments: 4,
      }).translate(0, 0, -0.5);
    }
    case "rear-panel": {
      const panel = new T.Shape();
      panel.moveTo(-0.5, -0.5);
      panel.lineTo(0.5, -0.5);
      panel.lineTo(0.5, 0.5);
      panel.lineTo(-0.5, 0.5);
      panel.closePath();
      // Convert case Y/Z coordinates into the panel's normalized XY plane.
      // The piece's Y rotation turns its local X axis toward world -Z.
      const u = (z: number) => (piece.position[2] - z) / piece.size[0];
      const v = (y: number) => (y - piece.position[1]) / piece.size[1];
      function opening(yMin: number, yMax: number, zMin: number, zMax: number) {
        const hole = new T.Path();
        hole.moveTo(u(zMax), v(yMin));
        hole.lineTo(u(zMax), v(yMax));
        hole.lineTo(u(zMin), v(yMax));
        hole.lineTo(u(zMin), v(yMin));
        hole.closePath();
        panel.holes.push(hole);
      }
      const exhaust = new T.Path();
      exhaust.absellipse(
        u(0.7),
        v(1.17),
        0.5 / piece.size[0],
        0.5 / piece.size[1],
        0,
        Math.PI * 2,
        true,
        0,
      );
      panel.holes.push(exhaust);
      opening(-0.2, 1.73, -0.37, 0.11); // Motherboard USB, network and audio.
      opening(-0.43, -0.23, -0.12, 0.95); // Graphics display connectors.
      opening(-0.92, -0.64, -0.13, 0.23); // Network expansion card.
      for (const y of [-0.53, -1.02, -1.14, -1.26])
        opening(y - 0.028, y + 0.028, -0.12, 1.0);
      for (const y of [-0.71, -0.84]) opening(y - 0.028, y + 0.028, 0.32, 1.0);
      opening(-2.035, -1.33, -0.605, 1.245); // Power supply rear face.
      return new T.ExtrudeGeometry(panel, {
        depth: 1,
        bevelEnabled: false,
        curveSegments: 32,
      }).translate(0, 0, -0.5);
    }
    case "tube":
      return new T.TubeGeometry(
        new T.CatmullRomCurve3(piece.path!.map((p) => new T.Vector3(...p))),
        Math.max(24, (piece.path!.length - 1) * 12),
        0.014,
        6,
        false,
      );
  }
}
