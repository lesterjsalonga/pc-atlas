import * as T from "three";
import type { Piece } from "../../lib/catalog";

const offset = new T.Vector3();
const rotated = new T.Vector3();
const axis = new T.Vector3();
const rotation = new T.Quaternion();

/** Rotate a blade around its assembly hub, retaining its current layout offset. */
export function rotateFanBlade(
  piece: Piece,
  angle: number,
  object: T.Object3D,
  scale: number,
) {
  if (!piece.rotor) return;
  rotation.setFromAxisAngle(axis.set(...piece.rotor.axis), angle);
  offset.set(...piece.position).sub(rotated.set(...piece.rotor.center));
  rotated.copy(offset).applyQuaternion(rotation).sub(offset);
  object.position.addScaledVector(rotated, scale);
  object.quaternion.premultiply(rotation);
}
