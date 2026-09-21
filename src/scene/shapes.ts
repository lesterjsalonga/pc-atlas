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
    case "tube":
      return new T.TubeGeometry(
        new T.CatmullRomCurve3(piece.path!.map((p) => new T.Vector3(...p))),
        24,
        0.014,
        6,
        false,
      );
  }
}
