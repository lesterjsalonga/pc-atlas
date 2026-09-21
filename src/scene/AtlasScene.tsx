import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { PIECES } from "../../lib/geometry";
import { BY_ID, type Piece, type Vec3 } from "../../lib/catalog";
import {
  isVisible,
  TapGesture,
  type ExplorerState,
} from "../../lib/interactions";
import { packInventory, pieceBounds } from "../../lib/layout";
import { createGeometry } from "./shapes";

interface Props {
  state: ExplorerState;
  onSelect: (id: string, mesh?: string) => void;
  onReady: (ready: boolean) => void;
}
interface Instance {
  piece: Piece;
  batch: T.InstancedMesh;
  index: number;
  position: T.Vector3;
  target: T.Vector3;
  scale: number;
  targetScale: number;
  visible: boolean;
}
export default function AtlasScene({ state, onSelect, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update: (s: ExplorerState) => void } | null>(null);
  const latest = useRef({ state, onSelect, onReady });
  latest.current = { state, onSelect, onReady };
  const [error, setError] = useState("");
  const [hover, setHover] = useState("");
  useEffect(() => {
    const el = host.current!;
    let disposed = false,
      frame = 0,
      focusCamera = true,
      hoverId: string | null = null;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setError(
        "Your browser could not start 3D. You can still search parts and read their details.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0xf3f5f3, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    const canvas = renderer.domElement;
    canvas.setAttribute(
      "aria-label",
      "Interactive desktop PC. Drag to orbit, scroll or pinch to zoom. Select a component to inspect it.",
    );
    canvas.setAttribute("role", "img");
    canvas.tabIndex = 0;
    el.appendChild(canvas);
    const scene = new T.Scene();
    const perspective = new T.PerspectiveCamera(36, 1, 0.01, 300);
    const orthographic = new T.OrthographicCamera(-4, 4, 4, -4, 0.01, 300);
    let camera: T.PerspectiveCamera | T.OrthographicCamera = perspective;
    let aspect = 1;
    camera.position.set(7, 4.7, 8);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minDistance = 0.15;
    controls.maxDistance = 100;
    controls.target.set(0, 0, 0.3);
    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.03);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight(0xffffff, 0x82928a, 1.25));
    const key = new T.DirectionalLight(0xffffff, 2);
    key.position.set(4, 6, 7);
    scene.add(key);
    const grid = new T.GridHelper(14, 28, 0xc5d2c9, 0xe1e7e2);
    grid.position.y = -2.34;
    scene.add(grid);
    const ground = new T.Mesh(
      new T.CircleGeometry(3.35, 80),
      new T.MeshBasicMaterial({
        color: 0xe6ece7,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.35;
    scene.add(ground);
    const grouped = new Map<string, Piece[]>();
    for (const p of PIECES) {
      const key =
        p.shape === "tube" ? p.id : `${p.shape}-${p.color}-${!!p.panel}`;
      const group = grouped.get(key) || [];
      group.push(p);
      grouped.set(key, group);
    }
    const batches: T.InstancedMesh[] = [];
    const instances: Instance[] = [];
    const index = new Map<string, Instance>();
    for (const parts of grouped.values()) {
      const first = parts[0];
      const material = new T.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.47,
        metalness: 0.4,
        transparent: !!first.panel,
        opacity: first.panel ? 0.18 : 1,
        depthWrite: !first.panel,
      });
      const batch = new T.InstancedMesh(
        createGeometry(first),
        material,
        parts.length,
      );
      batch.instanceMatrix.setUsage(T.DynamicDrawUsage);
      batch.frustumCulled = false;
      batch.userData.parts = parts;
      scene.add(batch);
      batches.push(batch);
      parts.forEach((piece, i) => {
        const instance: Instance = {
          piece,
          batch,
          index: i,
          position: new T.Vector3(...piece.position),
          target: new T.Vector3(...piece.position),
          scale: 1,
          targetScale: 1,
          visible: true,
        };
        instances.push(instance);
        index.set(piece.id, instance);
        batch.setColorAt(i, new T.Color(piece.color));
      });
    }
    const dummy = new T.Object3D(),
      color = new T.Color(),
      ray = new T.Raycaster(),
      pointer = new T.Vector2(),
      tap = new TapGesture();
    const connectionGroup = new T.Group();
    scene.add(connectionGroup);
    const goalPosition = new T.Vector3(),
      goalTarget = new T.Vector3();
    let current = latest.current.state;
    let frames = 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    function schedule() {
      if (!disposed && !frame) frame = requestAnimationFrame(render);
    }
    function fit(bounds: T.Box3, front = false) {
      if (bounds.isEmpty()) return;
      const size = bounds.getSize(new T.Vector3());
      goalTarget.copy(bounds.getCenter(new T.Vector3()));
      const inventory = current.mode === "inventory";
      const nextCamera = inventory ? orthographic : perspective;
      if (camera !== nextCamera) {
        nextCamera.position.copy(camera.position);
        nextCamera.quaternion.copy(camera.quaternion);
        camera = nextCamera;
        controls.object = camera;
      }
      const view = current.view;
      const direction =
        front || inventory
          ? new T.Vector3(0, 0, 1)
          : view === "front"
            ? new T.Vector3(0, 0, 1)
            : view === "side"
              ? new T.Vector3(1, 0, 0.001)
              : new T.Vector3(0.95, 0.52, 1.2).normalize();
      const diameter =
        front || inventory
          ? Math.max(size.y, size.x / aspect)
          : Math.max(size.length() * 0.85, (size.length() * 0.75) / aspect);
      const distance = inventory
        ? Math.max(10, size.z + 5)
        : Math.max(
            0.28,
            (diameter /
              (2 * Math.tan(T.MathUtils.degToRad(perspective.fov / 2)))) *
              1.1,
          );
      if (inventory) {
        const half = diameter * 0.55;
        orthographic.left = -half * aspect;
        orthographic.right = half * aspect;
        orthographic.top = half;
        orthographic.bottom = -half;
        orthographic.zoom = 1;
        orthographic.updateProjectionMatrix();
      }
      goalPosition.copy(goalTarget).addScaledVector(direction, distance);
      focusCamera = true;
      controls.maxDistance = Math.max(50, distance * 3);
      schedule();
    }
    function allBounds(onlySelected = false) {
      const bounds = new T.Box3();
      for (const inst of instances) {
        if (
          !inst.visible ||
          (onlySelected && inst.piece.conceptId !== current.selected)
        )
          continue;
        const b = pieceBounds(inst.piece);
        const center = inst.piece.path
          ? new T.Vector3(...(b.center as Vec3))
              .multiplyScalar(inst.targetScale)
              .add(inst.target)
          : inst.target;
        const half = new T.Vector3(...(b.size as Vec3)).multiplyScalar(
          inst.targetScale * 0.5,
        );
        bounds.expandByPoint(center.clone().sub(half));
        bounds.expandByPoint(center.clone().add(half));
      }
      return bounds;
    }
    function clearConnections() {
      for (const child of [...connectionGroup.children]) {
        connectionGroup.remove(child);
        const mesh = child as T.Line;
        mesh.geometry.dispose();
        (mesh.material as T.Material).dispose();
      }
    }
    function updateConnections() {
      clearConnections();
      if (!current.connections || !current.selected || current.isolate) return;
      const selected = BY_ID.get(current.selected)!;
      function center(id: string) {
        const b = new T.Box3();
        instances
          .filter((i) => i.visible && i.piece.conceptId === id)
          .forEach((i) => {
            const c = i.piece.path
              ? new T.Vector3(...(pieceBounds(i.piece).center as Vec3))
                  .multiplyScalar(i.targetScale)
                  .add(i.target)
              : i.target;
            b.expandByPoint(c);
          });
        return b.isEmpty() ? null : b.getCenter(new T.Vector3());
      }
      const from = center(selected.id);
      if (!from) return;
      for (const link of selected.connectsTo) {
        const to = center(link.id);
        if (!to) continue;
        const middle = from.clone().lerp(to, 0.5);
        middle.z += 0.28;
        const curve = new T.QuadraticBezierCurve3(from, middle, to);
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints(curve.getPoints(24)),
          new T.LineDashedMaterial({
            color: 0x347e65,
            dashSize: 0.06,
            gapSize: 0.025,
            depthTest: false,
            transparent: true,
            opacity: 0.85,
          }),
        );
        line.computeLineDistances();
        line.renderOrder = 5;
        connectionGroup.add(line);
      }
    }
    function paint() {
      const neighbours = new Set(
        current.connections && current.selected
          ? BY_ID.get(current.selected)!.connectsTo.map((c) => c.id)
          : [],
      );
      for (const i of instances) {
        color.set(i.piece.color);
        if (i.piece.id === hoverId) color.lerp(new T.Color("#e4f4d2"), 0.4);
        if (
          !current.isolate &&
          (current.selectedMesh
            ? i.piece.id === current.selectedMesh
            : i.piece.conceptId === current.selected)
        )
          color.lerp(new T.Color("#b1d886"), 0.38);
        else if (neighbours.has(i.piece.conceptId))
          color.lerp(new T.Color("#a7e6ca"), 0.35);
        else if (current.connections && current.selected)
          color.lerp(new T.Color("#aab3ad"), 0.4);
        i.batch.setColorAt(i.index, color);
      }
      for (const b of batches)
        if (b.instanceColor) b.instanceColor.needsUpdate = true;
      schedule();
    }
    function update(s: ExplorerState) {
      current = s;
      const visible = PIECES.filter((p) => isVisible(p, current));
      const inventory = current.mode === "inventory";
      const layout = packInventory(visible, aspect);
      const progress = current.mode === "assembled" ? 0 : current.explode / 100;
      for (const inst of instances) {
        const p = inst.piece;
        inst.visible = isVisible(p, current);
        inst.target.copy(new T.Vector3(...p.position));
        inst.targetScale = 1;
        if (inventory && inst.visible) {
          const cell = layout.cells.get(p.id)!;
          const b = pieceBounds(p);
          const target = new T.Vector3(cell.x, cell.y, 0);
          if (p.path)
            target.sub(
              new T.Vector3(...(b.center as Vec3)).multiplyScalar(cell.scale),
            );
          inst.target.lerp(target, progress);
          inst.targetScale = 1 + (cell.scale - 1) * progress;
        } else if (current.mode === "axis") {
          const rank = BY_ID.get(p.conceptId)?.system === "cooling" ? 1.8 : 1.1;
          inst.target.addScaledVector(
            new T.Vector3(...p.axis),
            progress * rank,
          );
        }
      }
      grid.visible = !inventory && !current.isolate;
      ground.visible = grid.visible;
      controls.enableRotate = !inventory;
      paint();
      updateConnections();
      for (const batch of batches)
        batch.visible = (batch.userData.parts as Piece[]).some((p) =>
          isVisible(p, current),
        );
      fit(
        allBounds(!!current.selected && !current.connections),
        inventory && current.explode === 100,
      );
      canvas.dataset.visible = String(visible.length);
      canvas.dataset.mode = current.mode;
      canvas.dataset.selected = current.selected || "";
      canvas.dataset.connections = String(connectionGroup.children.length);
      canvas.dataset.projection = inventory ? "orthographic" : "perspective";
      schedule();
    }
    function render() {
      frame = 0;
      if (disposed) return;
      let moving = false;
      const speed = reduceMotion ? 1 : 0.16;
      for (const i of instances) {
        if (
          i.position.distanceToSquared(i.target) > 0.00000005 ||
          Math.abs(i.scale - i.targetScale) > 0.00005
        ) {
          i.position.lerp(i.target, speed);
          i.scale = T.MathUtils.lerp(i.scale, i.targetScale, speed);
          moving = true;
        } else {
          i.position.copy(i.target);
          i.scale = i.targetScale;
        }
        dummy.position.copy(i.position);
        dummy.rotation.set(...i.piece.rotation);
        dummy.scale
          .set(...i.piece.size)
          .multiplyScalar(i.visible ? i.scale : 0);
        dummy.updateMatrix();
        i.batch.setMatrixAt(i.index, dummy.matrix);
      }
      for (const b of batches) b.instanceMatrix.needsUpdate = true;
      if (focusCamera) {
        camera.position.lerp(goalPosition, speed);
        controls.target.lerp(goalTarget, speed);
        if (
          camera.position.distanceToSquared(goalPosition) < 0.000005 &&
          controls.target.distanceToSquared(goalTarget) < 0.000005
        ) {
          camera.position.copy(goalPosition);
          controls.target.copy(goalTarget);
          focusCamera = false;
        } else moving = true;
      }
      const orbiting = controls.update();
      renderer.render(scene, camera);
      canvas.dataset.frames = String(++frames);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.ready = "true";
      canvas.dataset.moving = String(moving || orbiting);
      if (moving || orbiting) schedule();
    }
    function resize() {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      aspect = w / h;
      perspective.aspect = aspect;
      perspective.updateProjectionMatrix();
      update(current);
    }
    function hit(e: PointerEvent) {
      const r = canvas.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        1 - ((e.clientY - r.top) / r.height) * 2,
      );
      ray.setFromCamera(pointer, camera);
      const hits = ray.intersectObjects(batches, false);
      for (const h of hits) {
        const p = (h.object.userData.parts as Piece[])[h.instanceId!];
        if (index.get(p.id)?.visible) return p;
      }
      return null;
    }
    const down = (e: PointerEvent) => {
      tap.start(e.pointerId, e.clientX, e.clientY, e.pointerType === "touch");
      focusCamera = false;
    };
    const move = (e: PointerEvent) => {
      tap.move(e.pointerId, e.clientX, e.clientY);
      if (e.buttons || e.pointerType === "touch") return;
      const p = hit(e);
      if (hoverId !== p?.id) {
        hoverId = p?.id || null;
        setHover(p ? `${BY_ID.get(p.conceptId)!.name} · ${p.name}` : "");
        canvas.style.cursor = p ? "pointer" : "grab";
        paint();
      }
    };
    const up = (e: PointerEvent) => {
      if (!tap.finish(e.pointerId, e.clientX, e.clientY) || e.button !== 0)
        return;
      const p = hit(e);
      if (p) latest.current.onSelect(p.conceptId, p.id);
    };
    const cancel = (e: PointerEvent) => tap.cancel(e.pointerId);
    const leave = () => {
      hoverId = null;
      setHover("");
      paint();
    };
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Home") {
        fit(allBounds(), current.mode === "inventory");
        e.preventDefault();
      }
      if (e.key === "+" || e.key === "=") {
        if (camera === orthographic) {
          camera.zoom *= 1.15;
          camera.updateProjectionMatrix();
        } else camera.position.lerp(controls.target, 0.15);
        focusCamera = false;
        schedule();
      }
      if (e.key === "-") {
        if (camera === orthographic) {
          camera.zoom /= 1.15;
          camera.updateProjectionMatrix();
        } else
          camera.position
            .sub(controls.target)
            .multiplyScalar(1.15)
            .add(controls.target);
        focusCamera = false;
        schedule();
      }
    };
    const lost = (e: Event) => {
      e.preventDefault();
      setError(
        "The 3D connection was interrupted. Reload the page to restart the viewer.",
      );
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("keydown", keydown);
    canvas.addEventListener("webglcontextlost", lost);
    controls.addEventListener("change", schedule);
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    api.current = { update };
    resize();
    latest.current.onReady(true);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      clearConnections();
      for (const b of batches) {
        b.geometry.dispose();
        (b.material as T.Material).dispose();
      }
      grid.geometry.dispose();
      (grid.material as T.Material).dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      env.dispose();
      renderer.dispose();
      canvas.remove();
      api.current = null;
    };
  }, []);
  useEffect(() => {
    api.current?.update(state);
  }, [state]);
  return (
    <div className="scene-canvas" ref={host}>
      {hover && !error && <div className="hover-label">{hover}</div>}
      {error && (
        <div className="scene-error" role="alert">
          {error}
          <button onClick={() => location.reload()}>Reload viewer</button>
        </div>
      )}
    </div>
  );
}
