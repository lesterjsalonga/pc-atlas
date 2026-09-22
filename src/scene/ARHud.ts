import * as T from "three";

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
  function update(message: string, details: string) {
    const key = message + details;
    if (key === last) return;
    last = key;
    context.clearRect(0, 0, 1024, 320);
    context.fillStyle = "#f3f5f3f5";
    context.fillRect(0, 0, 1024, 320);
    context.fillStyle = "#253b33";
    context.font = "600 30px sans-serif";
    context.fillText(message, 24, 42);
    context.font = "26px sans-serif";
    const words = (
      details || "Move slowly to find a tabletop. Tap the ring to place."
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
    ].entries()) {
      context.fillStyle = "#214f3e";
      context.fillRect(i * 336 + 12, 226, 328, 82);
      context.fillStyle = "white";
      context.font = "600 28px sans-serif";
      context.textAlign = "center";
      context.fillText(label, i * 336 + 176, 277);
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
  ): "reposition" | "reset" | "end" | "panel" | null {
    if (!mesh.visible) return null;
    const uv = ray.intersectObject(mesh)[0]?.uv;
    if (!uv) return null;
    if (uv.y > 94 / 320) return "panel";
    return uv.x < 1 / 3 ? "reposition" : uv.x < 2 / 3 ? "reset" : "end";
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
