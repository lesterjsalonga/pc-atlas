/** Browser-independent AR contracts. All model dimensions in XR are metres. */
export type ARSupport = "checking" | "supported" | "insecure" | "unavailable";
export async function detectARSupport(
  secure: boolean,
  xr?: Pick<XRSystem, "isSessionSupported">,
): Promise<ARSupport> {
  if (!secure) return "insecure";
  if (!xr) return "unavailable";
  try {
    return (await xr.isSessionSupported("immersive-ar"))
      ? "supported"
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

export const TABLETOP_HEIGHT = 0.32;
export const MIN_AR_SCALE = 0.5;
export const MAX_AR_SCALE = 2;
export const AR_PLACEMENT_INSTRUCTIONS =
  "Move your phone slowly to find a flat surface. Press down on the circle marker (tap once) to spawn your PC in AR.";
export const AR_GESTURE_INSTRUCTIONS =
  "Drag to rotate. Pinch to resize. Tap a part to inspect it.";
export type ARPhase = "searching" | "ready" | "placed";
export interface ARStatus {
  active: boolean;
  starting: boolean;
  phase: ARPhase;
  overlay: boolean;
  message: string;
  helpOpen: boolean;
}
export const initialARStatus: ARStatus = {
  active: false,
  starting: false,
  phase: "searching",
  overlay: false,
  message: "",
  helpOpen: false,
};
export interface ARCommands {
  enter: () => void;
  reposition: () => void;
  reset: () => void;
  end: () => void;
  toggleHelp: () => void;
}
export class PlacementState {
  phase: ARPhase = "searching";
  rotation = 0;
  scale = 1;
  surface(valid: boolean) {
    if (this.phase !== "placed") this.phase = valid ? "ready" : "searching";
  }
  place() {
    if (this.phase !== "ready") return false;
    this.phase = "placed";
    return true;
  }
  reposition() {
    this.phase = "searching";
    this.reset();
  }
  reset() {
    this.rotation = 0;
    this.scale = 1;
  }
  transform(rotation: number, factor: number) {
    if (this.phase !== "placed") return;
    if (Number.isFinite(rotation)) this.rotation += rotation;
    if (Number.isFinite(factor) && factor > 0)
      this.scale = Math.max(
        MIN_AR_SCALE,
        Math.min(MAX_AR_SCALE, this.scale * factor),
      );
  }
}

// Reject walls, undersides and slopes steeper than 15 degrees. A hit-test
// pose's local +Y is the surface normal; local reference space is gravity aligned.
export function isHorizontalSurface(matrix: ArrayLike<number>) {
  return (
    matrix.length === 16 &&
    Array.from(matrix).every(Number.isFinite) &&
    matrix[5] >= Math.cos(Math.PI / 12)
  );
}

export interface TouchPoint<K> {
  id: K;
  x: number;
  y: number;
}
interface Contact {
  x: number;
  y: number;
  startX: number;
  startY: number;
  time: number;
  moved: boolean;
  multi: boolean;
}

/** Positions are CSS pixels projected from XR target rays in viewer space.
 * Sampling all contacts together makes pinch independent of input-source order.
 * Once a sequence becomes a drag/pinch it can never turn back into a tap.
 */
export class ARGestures<K> {
  private contacts = new Map<K, Contact>();
  private distance = 0;
  begin(p: TouchPoint<K>, time: number) {
    if (this.contacts.has(p.id)) return;
    this.contacts.set(p.id, {
      ...p,
      startX: p.x,
      startY: p.y,
      time,
      moved: false,
      multi: this.contacts.size > 0,
    });
    if (this.contacts.size > 1)
      for (const c of this.contacts.values()) c.multi = true;
    this.distance = 0;
  }
  sample(points: TouchPoint<K>[], time: number) {
    for (const p of points) this.begin(p, time);
    let rotation = 0;
    for (const p of points) {
      const c = this.contacts.get(p.id)!;
      if (Math.hypot(p.x - c.startX, p.y - c.startY) > 10) c.moved = true;
      if (
        points.length === 1 &&
        this.contacts.size === 1 &&
        c.moved &&
        !c.multi
      )
        rotation = (p.x - c.x) * 0.008;
      c.x = p.x;
      c.y = p.y;
    }
    let factor = 1;
    if (points.length === 2) {
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      if (this.distance > 10 && distance > 10)
        factor = distance / this.distance;
      this.distance = distance;
    } else this.distance = 0;
    return { rotation, factor };
  }
  finish(p: TouchPoint<K>, time: number) {
    const c = this.contacts.get(p.id);
    this.contacts.delete(p.id);
    this.distance = 0;
    return (
      !!c &&
      !c.moved &&
      !c.multi &&
      time - c.time <= 650 &&
      Math.hypot(p.x - c.startX, p.y - c.startY) <= 10
    );
  }
  cancel(id: K) {
    this.contacts.delete(id);
    this.distance = 0;
  }
  rejectTaps() {
    for (const contact of this.contacts.values()) contact.multi = true;
  }
  clear() {
    this.contacts.clear();
    this.distance = 0;
  }
}
