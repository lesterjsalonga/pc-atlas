import * as T from "three";
import {
  AR_PLACEMENT_INSTRUCTIONS,
  AR_GESTURE_INSTRUCTIONS,
} from "../../lib/ar";

/** Small native-XR HUD used only when DOM Overlay was not granted. */
export function createARHud() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const context = canvas.getContext("2d")!;
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(
    new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.renderOrder = 100;
  mesh.frustumCulled = false;
  mesh.visible = false;
  let last = "";
  function update(
    message: string,
    details: string,
    helpOpen: boolean,
    fansOn: boolean,
  ) {
    const key = JSON.stringify([message, details, helpOpen, fansOn]);
    if (key === last) return;
    last = key;
    context.clearRect(0, 0, 1024, 320);
    context.fillStyle = "#f3f5f3f5";
    context.fillRect(0, 0, 1024, 320);
    context.fillStyle = "#253b33";
    context.font = "600 30px sans-serif";
    context.fillText(message, 24, 42, 872);
    context.fillStyle = "#214f3e";
    context.fillRect(928, 12, 80, 64);
    context.fillStyle = "white";
    context.textAlign = "center";
    context.fillText(helpOpen ? "×" : "?", 968, 55);
    context.textAlign = "left";
    context.fillStyle = "#253b33";
    context.font = "26px sans-serif";
    const words = (
      helpOpen
        ? `${AR_PLACEMENT_INSTRUCTIONS} ${AR_GESTURE_INSTRUCTIONS}`
        : details || "Tap ? for placement instructions."
    ).split(" ");
    let line = "",
      y = 86;
    for (const word of words) {
      if (context.measureText(line + word).width > 972) {
        context.fillText(line, 24, y);
        line = "";
        y += 32;
        if (y > 190) break;
      }
      line += word + " ";
    }
    if (y <= 190) context.fillText(line, 24, y);
    for (const [i, label] of [
      "Reposition",
      "Reset size / turn",
      "End AR",
      fansOn ? "Fans: on" : "Fans: off",
    ].entries()) {
      context.fillStyle = "#214f3e";
      context.fillRect(i * 256 + 8, 226, 240, 82);
      context.fillStyle = "white";
      context.font = "600 25px sans-serif";
      context.textAlign = "center";
      context.fillText(label, i * 256 + 128, 277);
    }
    context.textAlign = "left";
    texture.needsUpdate = true;
  }
  function place(view: XRView) {
    // Fit within the actual eye viewport, including portrait/landscape changes.
    const p = view.projectionMatrix;
    const width = 1.7 / p[0];
    const height = (width * 320) / 1024;
    const y = (0.78 + p[9]) / p[5] - height / 2;
    mesh.position.set(p[8] / p[0], y, -1);
    mesh.position.applyMatrix4(
      new T.Matrix4().fromArray(view.transform.matrix),
    );
    mesh.quaternion.setFromRotationMatrix(
      new T.Matrix4().fromArray(view.transform.matrix),
    );
    mesh.scale.set(width, height, 1);
    mesh.updateMatrixWorld(true);
  }
  function hit(
    ray: T.Raycaster,
  ): "reposition" | "reset" | "end" | "fans" | "help" | "panel" | null {
    if (!mesh.visible) return null;
    const uv = ray.intersectObject(mesh)[0]?.uv;
    if (!uv) return null;
    if (
      uv.x >= 928 / 1024 &&
      uv.x <= 1008 / 1024 &&
      uv.y >= 244 / 320 &&
      uv.y <= 308 / 320
    )
      return "help";
    if (uv.y > 94 / 320) return "panel";
    return uv.x < 1 / 4
      ? "reposition"
      : uv.x < 2 / 4
        ? "reset"
        : uv.x < 3 / 4
          ? "end"
          : "fans";
  }
  return {
    mesh,
    update,
    place,
    hit,
    dispose() {
      mesh.geometry.dispose();
      mesh.material.dispose();
      texture.dispose();
    },
  };
}
