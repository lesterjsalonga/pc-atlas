import * as T from "three";
import {
  ARGestures,
  initialARStatus,
  isHorizontalSurface,
  PlacementState,
  TABLETOP_HEIGHT,
  type ARStatus,
  type TouchPoint,
} from "../../lib/ar";
import { createARHud } from "./ARHud";

interface Options {
  renderer: T.WebGLRenderer;
  scene: T.Scene;
  model: T.Group;
  overlay: HTMLElement;
  bounds: T.Box3;
  onStatus: (status: ARStatus) => void;
  onEnter: () => void;
  onRestore: () => void;
  render: () => void;
  select: (ray: T.Raycaster) => void;
  details: () => string;
  fansOn: () => boolean;
  toggleFans: () => void;
}

/** Owns the immersive session, reference-space placement and input lifecycle.
 * The existing instanced model remains the only PC in the scene.
 */
export function createTabletopAR(options: Options) {
  const { renderer, scene, model, overlay } = options;
  const placement = new PlacementState();
  const gestures = new ARGestures<XRInputSource>();
  const reticle = new T.Mesh(
    new T.RingGeometry(0.065, 0.085, 48).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({
      color: 0xd9edb8,
      side: T.DoubleSide,
      depthTest: false,
      toneMapped: false,
    }),
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  reticle.renderOrder = 10;
  const hud = createARHud();
  scene.add(reticle, hud.mesh);
  const xrCamera = new T.PerspectiveCamera(60, 1, 0.01, 30);
  const ray = new T.Raycaster();
  const hitMatrix = new T.Matrix4();
  const position = new T.Vector3();
  const direction = new T.Vector3();
  const rotation = new T.Quaternion();
  const projection = new T.Matrix4();
  const floor = new T.Plane();
  const up = new T.Vector3(0, 1, 0);
  const size = options.bounds.getSize(new T.Vector3());
  const center = options.bounds.getCenter(new T.Vector3());
  const baseScale = TABLETOP_HEIGHT / size.y;
  const original = {
    position: model.position.clone(),
    quaternion: model.quaternion.clone(),
    scale: model.scale.clone(),
    visible: model.visible,
  };
  const offset = new T.Vector3(-center.x, -options.bounds.min.y, -center.z);
  let session: XRSession | null = null;
  let viewer: XRReferenceSpace | null = null;
  let reference: XRReferenceSpace | null = null;
  let hitSource: XRHitTestSource | null = null;
  let status = { ...initialARStatus };
  let disposed = false,
    busy = false,
    entered = false,
    binding = false,
    ended = false;
  let hitTime = -Infinity;
  let tracking = false;
  let initialYaw = 0;
  const live = new Set<XRInputSource>();
  const ignored = new Set<XRInputSource>();
  const endedInputs = new Set<XRInputSource>();
  const hudInputs = new Set<XRInputSource>();
  let resourcesDisposed = false;
  let startTask: Promise<void> | null = null;
  let generation = 0;

  function publish(patch: Partial<ARStatus>) {
    const next = { ...status, phase: placement.phase, ...patch };
    if (JSON.stringify(next) === JSON.stringify(status)) return;
    status = next;
    if (!disposed) options.onStatus(status);
  }
  function resetInput() {
    gestures.clear();
    live.clear();
    ignored.clear();
    endedInputs.clear();
    hudInputs.clear();
  }
  function suspendInput() {
    // A held finger must be released after tracking loss or screen rotation.
    for (const source of session?.inputSources || []) ignored.add(source);
    gestures.clear();
    live.clear();
  }
  function transform() {
    model.quaternion.setFromAxisAngle(up, initialYaw + placement.rotation);
    model.scale.setScalar(baseScale * placement.scale);
    model.position
      .copy(offset)
      .multiplyScalar(baseScale * placement.scale)
      .applyQuaternion(model.quaternion)
      .add(position);
    model.updateMatrixWorld(true);
  }
  function reposition() {
    placement.reposition();
    tracking = false;
    model.visible = false;
    reticle.visible = false;
    hitTime = -Infinity;
    resetInput();
    publish({ message: "Move slowly to find a tabletop." });
  }
  function reset() {
    placement.reset();
    resetInput();
    if (placement.phase === "placed") transform();
  }
  function toggleHelp() {
    publish({ helpOpen: !status.helpOpen });
  }
  async function end() {
    if (!session || ended) return;
    try {
      await session.end();
    } catch {
      publish({
        message:
          "Could not end AR. Try End AR again or use your browser’s exit control.",
      });
    }
  }
  function releaseResources() {
    if (resourcesDisposed) return;
    resourcesDisposed = true;
    scene.remove(reticle, hud.mesh);
    reticle.geometry.dispose();
    reticle.material.dispose();
    hud.dispose();
  }
  function cancelSource(source: XRHitTestSource | null | undefined) {
    try {
      source?.cancel();
    } catch {
      // Runtimes may already invalidate sources during native session shutdown.
      // InvalidStateError here must not prevent desktop/listener restoration.
    }
  }
  function restore() {
    generation++;
    cancelSource(hitSource);
    hitSource = null;
    reference?.removeEventListener("reset", onReferenceReset);
    viewer = reference = null;
    session?.removeEventListener("end", onEnd);
    session?.removeEventListener("selectstart", onStart);
    session?.removeEventListener("selectend", onSelectEnd);
    session?.removeEventListener("select", onSelect);
    session?.removeEventListener("inputsourceschange", onSourcesChange);
    session?.removeEventListener("visibilitychange", onVisibility);
    overlay.removeEventListener("beforexrselect", beforeSelect);
    window.removeEventListener("resize", suspendInput);
    session = null;
    resetInput();
    placement.reposition();
    reticle.visible = hud.mesh.visible = false;
    renderer.setAnimationLoop(null);
    renderer.xr.enabled = false;
    model.position.copy(original.position);
    model.quaternion.copy(original.quaternion);
    model.scale.copy(original.scale);
    model.visible = original.visible;
    model.updateMatrixWorld(true);
    const wasEntered = entered;
    entered = busy = false;
    publish({
      ...initialARStatus,
      message: status.message.startsWith("AR could") ? status.message : "",
    });
    if (wasEntered && !disposed) options.onRestore();
    if (disposed) releaseResources();
  }
  function onEnd() {
    ended = true;
    // Three restores its framebuffer/size in its own end listener. Restore our
    // desktop loop afterwards, and never race an in-flight setSession call.
    queueMicrotask(() => {
      if (!binding) restore();
    });
  }
  function beforeSelect(event: Event) {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-ar-ui], .detail-panel")
    )
      event.preventDefault();
  }
  function onVisibility() {
    suspendInput();
    tracking = false;
    reticle.visible = false;
    hitTime = -Infinity;
    placement.surface(false);
  }
  function onReferenceReset(event: XRReferenceSpaceEvent) {
    suspendInput();
    // Rebase the placement if the tracking origin changes. If the runtime
    // cannot supply the transform, require a fresh placement rather than jump.
    if (event.transform && placement.phase === "placed") {
      const inverse = new T.Matrix4().fromArray(event.transform.inverse.matrix);
      position.applyMatrix4(inverse);
      direction
        .set(0, 0, 1)
        .applyAxisAngle(up, initialYaw)
        .transformDirection(inverse);
      initialYaw = Math.atan2(direction.x, direction.z);
      transform();
    } else reposition();
  }
  function setRay(source: XRInputSource, frame: XRFrame) {
    if (!reference) return false;
    const pose = frame.getPose(source.targetRaySpace, reference);
    if (!pose) return false;
    ray.ray.origin.set(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z,
    );
    rotation.set(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w,
    );
    ray.ray.direction.set(0, 0, -1).applyQuaternion(rotation).normalize();
    return true;
  }
  function point(
    source: XRInputSource,
    frame: XRFrame,
  ): TouchPoint<XRInputSource> | null {
    if (!viewer) return null;
    const pose = frame.getPose(source.targetRaySpace, viewer);
    if (!pose) return null;
    // Project in viewer space so walking/turning the device is not a drag.
    direction
      .set(0, 0, -1)
      .applyMatrix4(new T.Matrix4().fromArray(pose.transform.matrix))
      .applyMatrix4(projection);
    return {
      id: source,
      x: ((direction.x + 1) * innerWidth) / 2,
      y: ((1 - direction.y) * innerHeight) / 2,
    };
  }
  function isUI(p: TouchPoint<XRInputSource>) {
    return (
      status.overlay &&
      !!document
        .elementFromPoint(p.x, p.y)
        ?.closest("[data-ar-ui], .detail-panel")
    );
  }
  function onStart(event: XRInputSourceEvent) {
    if (!entered || ended || !tracking) return;
    endedInputs.delete(event.inputSource);
    ignored.delete(event.inputSource);
    const p = point(event.inputSource, event.frame);
    if (!p || isUI(p)) {
      ignored.add(event.inputSource);
      return;
    }
    gestures.begin(p, performance.now());
    if (
      !status.overlay &&
      setRay(event.inputSource, event.frame) &&
      hud.hit(ray)
    )
      hudInputs.add(event.inputSource);
    live.add(event.inputSource);
  }
  function onSelectEnd(event: XRInputSourceEvent) {
    gestures.cancel(event.inputSource);
    endedInputs.add(event.inputSource);
    live.delete(event.inputSource);
    hudInputs.delete(event.inputSource);
  }
  function onSelect(event: XRInputSourceEvent) {
    if (
      !entered ||
      ended ||
      !tracking ||
      session?.visibilityState !== "visible"
    )
      return;
    // WebXR completes with select, then selectend. Cancelled actions only
    // produce selectend, so they can never place or pick a component.
    sampleInputs(event.frame);
    const p = point(event.inputSource, event.frame);
    if (
      !p ||
      ignored.has(event.inputSource) ||
      !gestures.finish(p, performance.now()) ||
      !setRay(event.inputSource, event.frame)
    )
      return;
    endedInputs.add(event.inputSource);
    live.delete(event.inputSource);
    const action = hud.hit(ray);
    if (action) {
      if (action === "reposition") reposition();
      if (action === "reset") reset();
      if (action === "end") void end();
      if (action === "help") toggleHelp();
      if (action === "fans") options.toggleFans();
      return;
    }
    if (placement.phase !== "placed") {
      if (!reticle.visible || performance.now() - hitTime > 250) return;
      const surfacePosition = new T.Vector3().setFromMatrixPosition(hitMatrix);
      floor.setFromNormalAndCoplanarPoint(up, surfacePosition);
      const intersection = ray.ray.intersectPlane(floor, new T.Vector3());
      if (
        !intersection ||
        intersection.distanceTo(surfacePosition) > 0.12 ||
        !placement.place()
      )
        return;
      position.copy(surfacePosition);
      // Face the user initially, then hold a fixed world-space orientation.
      direction.copy(xrCamera.position).sub(position);
      initialYaw = Math.atan2(direction.x, direction.z);
      transform();
      model.visible = true;
      reticle.visible = false;
      publish({ message: "Drag to rotate · Pinch to resize · Tap a part" });
    } else options.select(ray);
  }
  function onSourcesChange(event: XRInputSourcesChangeEvent) {
    if (
      Array.from(session?.inputSources || []).filter(
        (s) => s.targetRayMode === "screen",
      ).length > 1
    )
      gestures.rejectTaps();
    for (const source of event.removed) {
      gestures.cancel(source);
      live.delete(source);
      ignored.delete(source);
      endedInputs.delete(source);
      hudInputs.delete(source);
    }
  }
  function sampleInputs(frame: XRFrame) {
    const points: TouchPoint<XRInputSource>[] = [];
    for (const source of session?.inputSources || []) {
      if (source.targetRayMode !== "screen" && !live.has(source)) continue;
      if (endedInputs.has(source) || ignored.has(source)) continue;
      const p = point(source, frame);
      if (!p) {
        gestures.cancel(source);
        live.delete(source);
        ignored.add(source);
        continue;
      }
      if (!live.has(source) && isUI(p)) {
        ignored.add(source);
        continue;
      }
      if (
        !live.has(source) &&
        !status.overlay &&
        setRay(source, frame) &&
        hud.hit(ray)
      )
        hudInputs.add(source);
      live.add(source);
      points.push(p);
    }
    const change = gestures.sample(points, performance.now());
    if (hudInputs.size) return;
    placement.transform(change.rotation, change.factor);
    if (
      placement.phase === "placed" &&
      (change.rotation !== 0 || change.factor !== 1)
    )
      transform();
  }
  function tick(_time: number, frame: XRFrame) {
    if (!frame || disposed || !entered || ended || !reference || !session)
      return;
    const pose = frame.getViewerPose(reference);
    tracking = !!pose && session.visibilityState === "visible";
    model.visible = tracking && placement.phase === "placed";
    if (pose?.views[0]) {
      projection.fromArray(pose.views[0].projectionMatrix);
      hud.place(pose.views[0]);
    }
    if (tracking) {
      sampleInputs(frame);
    } else suspendInput();
    if (placement.phase !== "placed") {
      reticle.visible = false;
      if (tracking && hitSource) {
        try {
          for (const result of frame.getHitTestResults(hitSource)) {
            const hit = result.getPose(reference);
            if (!hit || !isHorizontalSurface(hit.transform.matrix)) continue;
            hitMatrix.fromArray(hit.transform.matrix);
            reticle.matrix.copy(hitMatrix);
            reticle.visible = true;
            hitTime = performance.now();
            break;
          }
        } catch {
          publish({ message: "AR could not read surfaces. Please try again." });
          void end();
          return;
        }
      }
      placement.surface(reticle.visible);
      publish({
        message: !tracking
          ? "Tracking paused. Move slowly in good light."
          : reticle.visible
            ? "Press the circle marker to spawn your PC."
            : "Move slowly to find a tabletop.",
      });
    } else
      publish({
        message: tracking
          ? "Drag to rotate · Pinch to resize · Tap a part"
          : "Tracking paused. Move slowly in good light.",
      });
    hud.mesh.visible = !status.overlay && tracking;
    hud.update(
      status.message,
      options.details(),
      status.helpOpen,
      options.fansOn(),
    );
    options.render();
    renderer.render(scene, xrCamera);
  }
  async function enter() {
    if (busy || disposed || !window.isSecureContext || !navigator.xr) return;
    busy = true;
    ended = false;
    const attempt = ++generation;
    const stale = () => attempt !== generation || ended || disposed;
    publish({ starting: true, message: "" });
    try {
      const acquired = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test", "local"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: overlay },
      });
      if (attempt !== generation || disposed) {
        await acquired.end();
        return;
      }
      session = acquired;
      session.addEventListener("end", onEnd);
      const viewerSpace = await session.requestReferenceSpace("viewer");
      if (stale()) return;
      viewer = viewerSpace;
      const source = await session.requestHitTestSource?.({ space: viewer });
      if (stale()) {
        cancelSource(source);
        return;
      }
      if (!source) throw new Error("Hit testing was not granted");
      hitSource = source;
      // Avoid Three's partially initialized session if WebGL compatibility fails.
      await renderer.getContext().makeXRCompatible();
      if (stale()) return;
      entered = true;
      options.onEnter();
      reposition();
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType("local");
      // Install before setSession: r180 stops the ordinary RAF on sessionstart.
      // Installing afterwards would start a second, non-XR animation loop.
      renderer.setAnimationLoop(tick);
      binding = true;
      await renderer.xr.setSession(session);
      binding = false;
      if (stale()) return;
      reference = renderer.xr.getReferenceSpace();
      if (!reference) throw new Error("No local reference space");
      reference.addEventListener("reset", onReferenceReset);
      session.addEventListener("selectstart", onStart);
      session.addEventListener("selectend", onSelectEnd);
      session.addEventListener("select", onSelect);
      session.addEventListener("inputsourceschange", onSourcesChange);
      session.addEventListener("visibilitychange", onVisibility);
      overlay.addEventListener("beforexrselect", beforeSelect);
      window.addEventListener("resize", suspendInput);
      publish({
        active: true,
        starting: false,
        overlay: !!session.domOverlayState,
        helpOpen: true,
        message: "Move slowly to find a tabletop.",
      });
    } catch {
      if (attempt !== generation) return;
      binding = false;
      publish({
        starting: false,
        message:
          "AR could not start. Allow camera access and use a browser with AR surface detection, then try again.",
      });
      if (session && !ended) await end();
      else restore();
    } finally {
      if (attempt === generation) binding = false;
      if (attempt === generation && (ended || disposed)) {
        reference?.removeEventListener("reset", onReferenceReset);
        if (session && !ended) await end();
        restore();
      }
    }
  }
  return {
    get active() {
      return entered;
    },
    commands: {
      enter: () => {
        if (!busy) startTask = enter();
      },
      reposition,
      reset,
      toggleHelp,
      end: () => {
        void end();
      },
    },
    async dispose() {
      disposed = true;
      reference?.removeEventListener("reset", onReferenceReset);
      if (session && !ended) await end();
      await startTask;
      restore();
      releaseResources();
    },
  };
}
