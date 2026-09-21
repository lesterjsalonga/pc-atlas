import {
  CATALOG,
  SYSTEMS,
  type SystemId,
  type Piece,
  type Concept,
} from "./catalog";
import { PIECES } from "./geometry";
export type ViewMode = "assembled" | "axis" | "inventory";
export interface ExplorerState {
  visible: SystemId[];
  hidePanels: boolean;
  selected: string | null;
  selectedMesh: string | null;
  isolate: boolean;
  connections: boolean;
  mode: ViewMode;
  explode: number;
  view: "perspective" | "front" | "side";
  revision: number;
  allowedConcepts: string[] | null;
}
export const initialState: ExplorerState = {
  visible: SYSTEMS.map((s) => s.id),
  hidePanels: true,
  selected: null,
  selectedMesh: null,
  isolate: false,
  connections: false,
  mode: "assembled",
  explode: 100,
  view: "perspective",
  revision: 0,
  allowedConcepts: null,
};
export const PRESETS = [
  {
    id: "full",
    name: "Full build",
    systems: SYSTEMS.map((s) => s.id),
    panels: false,
  },
  {
    id: "internals",
    name: "Internals only",
    systems: SYSTEMS.map((s) => s.id),
    panels: true,
  },
  {
    id: "board",
    name: "Bare motherboard",
    systems: [
      "motherboard",
      "processor",
      "memory",
      "firmware",
      "io",
      "front",
      "graphics",
    ] as SystemId[],
    panels: true,
  },
  {
    id: "cooling",
    name: "Cooling & airflow",
    systems: ["cooling", "processor"] as SystemId[],
    panels: true,
  },
  {
    id: "power",
    name: "Power path",
    systems: [
      "power",
      "motherboard",
      "processor",
      "graphics",
      "storage",
    ] as SystemId[],
    panels: true,
  },
  {
    id: "memory",
    name: "Memory & storage",
    systems: ["memory", "storage"] as SystemId[],
    panels: true,
  },
];
export function isVisible(p: Piece, state: ExplorerState) {
  return (
    state.visible.includes(p.system) &&
    !(state.hidePanels && p.panel) &&
    (!state.isolate || p.conceptId === state.selected) &&
    (!state.allowedConcepts || state.allowedConcepts.includes(p.conceptId))
  );
}
export function selectConcept(
  state: ExplorerState,
  id: string,
  mesh: string | null = null,
): ExplorerState {
  const p = CATALOG.find((c) => c.id === id);
  if (!p) return state;
  return {
    ...state,
    selected: id,
    selectedMesh: mesh,
    visible: state.visible.includes(p.system)
      ? state.visible
      : [...state.visible, p.system],
    hidePanels: id === "side-panel" ? false : state.hidePanels,
    allowedConcepts:
      state.allowedConcepts && !state.allowedConcepts.includes(id)
        ? null
        : state.allowedConcepts,
    revision: state.revision + 1,
  };
}
export function toggleSystem(
  state: ExplorerState,
  system: SystemId,
): ExplorerState {
  const visible = state.visible.includes(system)
    ? state.visible.filter((s) => s !== system)
    : [...state.visible, system];
  const hidden =
    CATALOG.find((c) => c.id === state.selected)?.system === system &&
    !visible.includes(system);
  return {
    ...state,
    visible,
    selected: hidden ? null : state.selected,
    selectedMesh: hidden ? null : state.selectedMesh,
    isolate: hidden ? false : state.isolate,
  };
}
function distance(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return prev[b.length];
}
export function searchParts(
  query: string,
): (Concept & { matchedPiece?: string })[] {
  const q = query.toLowerCase().trim();
  const mesh = PIECES.find((p) => p.id === q);
  if (mesh)
    return [
      {
        ...CATALOG.find((p) => p.id === mesh.conceptId)!,
        matchedPiece: mesh.id,
      },
    ];
  if (!q)
    return CATALOG.filter((c) =>
      ["cpu", "gpu", "dimm-a", "motherboard", "m2", "psu"].includes(c.id),
    );
  return CATALOG.map((p) => {
    const terms = [
      p.name,
      p.id,
      ...p.aliases,
      SYSTEMS.find((s) => s.id === p.system)!.name,
    ].map((t) => t.toLowerCase());
    const score = Math.min(
      ...terms.map((t) =>
        t === q
          ? 0
          : t.includes(q)
            ? 1
            : Math.min(...t.split(/\s+/).map((w) => distance(q, w))) + 2,
      ),
    );
    return { p, score };
  })
    .filter((r) => r.score <= Math.max(3, Math.min(5, q.length * 0.35 + 2)))
    .sort((a, b) => a.score - b.score)
    .map((r) => r.p);
}
export class TapGesture {
  private pointers = new Map<number, [number, number, number]>();
  private rejected = false;
  start(id: number, x: number, y: number, touch = false) {
    if (this.pointers.size === 0) this.rejected = false;
    this.pointers.set(id, [x, y, touch ? 10 : 5]);
    if (this.pointers.size > 1) this.rejected = true;
  }
  move(id: number, x: number, y: number) {
    const p = this.pointers.get(id);
    if (p && Math.hypot(x - p[0], y - p[1]) > p[2]) this.rejected = true;
  }
  finish(id: number, x: number, y: number) {
    this.move(id, x, y);
    const ok =
      this.pointers.size === 1 && this.pointers.has(id) && !this.rejected;
    this.pointers.delete(id);
    return ok;
  }
  cancel(id: number) {
    this.pointers.delete(id);
    this.rejected = true;
  }
}
