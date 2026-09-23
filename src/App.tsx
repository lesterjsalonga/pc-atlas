import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  CircleHelp,
  Cpu,
  Fan,
  Focus,
  Grid2X2,
  Layers3,
  Link2,
  Maximize,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Switch } from "./components/ui/switch";
import {
  BY_ID,
  CATALOG,
  SYSTEMS,
  SYSTEM_BY_ID,
  type SystemId,
} from "../lib/catalog";
import { PIECES } from "../lib/geometry";
import {
  detectARSupport,
  AR_PLACEMENT_INSTRUCTIONS,
  AR_GESTURE_INSTRUCTIONS,
  initialARStatus,
  type ARCommands,
  type ARStatus,
  type ARSupport,
} from "../lib/ar";
import {
  initialState,
  isVisible,
  PRESETS,
  searchParts,
  selectConcept,
  toggleSystem,
  type ViewMode,
} from "../lib/interactions";
const AtlasScene = lazy(() => import("./scene/AtlasScene"));
export default function App() {
  const [desktopState, setDesktopState] = useState(initialState);
  const [arState, setARState] = useState(initialState);
  const [arStatus, setARStatus] = useState(initialARStatus);
  const [arSupport, setARSupport] = useState<ARSupport>("checking");
  const [arCommands, setARCommands] = useState<ARCommands | null>(null);
  const [fansOn, setFansOn] = useState(false);
  const toggleFans = useCallback(() => setFansOn((on) => !on), []);
  const activeAR = useRef(false);
  const state = arStatus.active ? arState : desktopState;
  const setState = arStatus.active ? setARState : setDesktopState;
  const handleARStatus = useCallback((next: ARStatus) => {
    if (next.active && !activeAR.current) setARState(initialState);
    activeAR.current = next.active;
    setARStatus(next);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void detectARSupport(window.isSecureContext, navigator.xr).then(
      (support) => {
        if (!cancelled) setARSupport(support);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [preset, setPreset] = useState("internals");
  const [activeResult, setActiveResult] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const chosen = state.selected ? BY_ID.get(state.selected) : null;
  const system = chosen ? SYSTEM_BY_ID.get(chosen.system) : null;
  const results = searchParts(query);
  const visible = PIECES.filter((p) => isVisible(p, state));
  const choose = useCallback((id: string, mesh?: string) => {
    (activeAR.current ? setARState : setDesktopState)((s) =>
      selectConcept(s, id, mesh),
    );
    setSearchOpen(false);
    setLayersOpen(false);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (arStatus.active) return;
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape" && !searchOpen && !layersOpen && !aboutOpen)
        setState((s) => ({
          ...s,
          selected: null,
          selectedMesh: null,
          isolate: false,
        }));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [searchOpen, layersOpen, aboutOpen, arStatus.active]);
  function reset() {
    setState({ ...initialState, revision: state.revision + 1 });
    setPreset("internals");
  }
  function applyPreset(id: string) {
    const p = PRESETS.find((p) => p.id === id)!;
    setPreset(id);
    setState((s) => ({
      ...s,
      visible: [...p.systems],
      hidePanels: p.panels,
      selected: null,
      selectedMesh: null,
      isolate: false,
      connections: false,
      allowedConcepts:
        id === "board"
          ? [
              "motherboard",
              "vrm",
              "capacitors",
              "chipset",
              "socket",
              "ram-slots",
              "pcie-slot",
              "pcie-x1",
              "sata-port",
              "bios",
              "battery",
              "crystal",
              "rear-io",
              "front-header",
            ]
          : null,
    }));
  }
  function toggle(id: SystemId) {
    setPreset("custom");
    setState((s) => toggleSystem({ ...s, allowedConcepts: null }, id));
  }
  function mode(mode: ViewMode) {
    setState((s) => ({ ...s, mode, explode: 100, isolate: false }));
  }
  const layerControls = (
    <>
      <div className="sidebar-title">
        <div>
          <span className="eyebrow">BUILD EXPLORER</span>
          <h2>
            Systems <span>12</span>
          </h2>
        </div>
        <Layers3 size={19} />
      </div>
      <label
        className="field-label"
        htmlFor={layersOpen ? "mobile-preset" : "preset"}
      >
        View preset
      </label>
      <select
        id={layersOpen ? "mobile-preset" : "preset"}
        aria-label="View preset"
        value={preset}
        onChange={(e) => applyPreset(e.target.value)}
      >
        {preset === "custom" && <option value="custom">Custom view</option>}
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="system-list">
        {SYSTEMS.map((s, i) => (
          <div
            className={`system-row ${state.visible.includes(s.id) ? "" : "muted"}`}
            key={s.id}
            style={{ "--system-color": s.color } as CSSProperties}
          >
            <button
              className="system-name"
              title={`Show only ${s.name}`}
              onClick={() => {
                setPreset("custom");
                setState((st) => ({
                  ...st,
                  visible: [s.id],
                  isolate: false,
                  selected: null,
                  allowedConcepts: null,
                }));
              }}
            >
              <span className="system-marker" />
              <span>{s.short}</span>
              <span className="system-number">
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
            <Switch
              checked={state.visible.includes(s.id)}
              onCheckedChange={() => toggle(s.id)}
              aria-label={`Show ${s.name}`}
            />
          </div>
        ))}
      </div>
      <div className="layer-summary">
        <span>
          <strong>{visible.length}</strong> / {PIECES.length} pieces visible
        </span>
        <button
          onClick={() => {
            setState((s) => ({
              ...s,
              visible: s.visible.length ? [] : SYSTEMS.map((s) => s.id),
              isolate: false,
              selected: null,
              allowedConcepts: null,
            }));
            setPreset("custom");
          }}
        >
          {state.visible.length ? "Hide all" : "Show all"}
        </button>
      </div>
      <div className="sidebar-note">
        <Box size={19} />
        <div>
          <strong>A generic desktop PC</strong>
          <p>
            Real connections.
            <br />
            Simplified, explorable parts.
          </p>
        </div>
      </div>
    </>
  );
  const fanControl = (
    <label className="fan-control">
      <Fan size={17} aria-hidden="true" />
      <span>Fans</span>
      <Switch
        checked={fansOn}
        onCheckedChange={setFansOn}
        aria-label="Spin fans"
      />
      <span className="fan-status">
        {fansOn && state.mode === "inventory"
          ? "Paused in inventory"
          : fansOn
            ? "On"
            : "Off"}
      </span>
    </label>
  );
  return (
    <div className={`atlas-app ${arStatus.active ? "ar-active" : ""}`}>
      {arStatus.active && (
        <div className="ar-controls" data-ar-ui>
          <div className="ar-status-row">
            <p role="status">{arStatus.message}</p>
            <Button
              variant="outline"
              size="icon"
              aria-label="AR instructions"
              aria-expanded={arStatus.helpOpen}
              aria-controls="ar-instructions"
              title="AR instructions"
              onClick={() => arCommands?.toggleHelp()}
            >
              <CircleHelp size={21} />
            </Button>
          </div>
          <div role="group" aria-label="AR controls">
            <Button
              variant="outline"
              onClick={() => arCommands?.reposition()}
              disabled={arStatus.phase !== "placed"}
            >
              Reposition
            </Button>
            <Button
              variant="outline"
              onClick={() => arCommands?.reset()}
              disabled={arStatus.phase !== "placed"}
            >
              Reset size / turn
            </Button>
            <Button onClick={() => arCommands?.end()}>End AR</Button>
          </div>
          {fanControl}
          {arStatus.helpOpen && (
            <section
              className="ar-instructions"
              id="ar-instructions"
              aria-label="How to use AR"
            >
              <div className="ar-instructions-heading">
                <h2>Place your PC in AR</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close AR instructions"
                  onClick={() => arCommands?.toggleHelp()}
                >
                  <X size={18} />
                </Button>
              </div>
              <p>{AR_PLACEMENT_INSTRUCTIONS}</p>
              <p>{AR_GESTURE_INSTRUCTIONS}</p>
            </section>
          )}
        </div>
      )}
      <header className="app-header">
        <a className="brand" href="/" aria-label="Computer Atlas home">
          <span className="brand-mark">
            <Cpu size={23} strokeWidth={1.6} />
          </span>
          <span>
            Computer<span className="brand-light"> Atlas</span>
            <small>INSIDE THE MACHINE</small>
          </span>
        </a>
        <div className="header-center">
          <span className="reference-label">REFERENCE BUILD</span>
          <span>
            ATX desktop <span className="divider">/</span> 12 systems
          </span>
        </div>
        <div className="header-actions">
          <Button
            variant="outline"
            className="search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label="Search parts"
          >
            <Search size={17} />
            <span>Find a component</span>
            <kbd>/</kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="About this atlas"
            onClick={() => setAboutOpen(true)}
          >
            <CircleHelp size={21} />
          </Button>
        </div>
      </header>
      <main className={`workspace ${chosen ? "has-details" : ""}`}>
        <aside className="sidebar" aria-label="System layers">
          {layerControls}
        </aside>
        <section className="viewer" aria-label="Computer explorer">
          <div className="viewer-heading">
            <div className="view-title">
              <span className="eyebrow">THE REFERENCE BUILD</span>
              <h1>
                {state.isolate
                  ? chosen?.name
                  : state.mode === "inventory"
                    ? "Every piece, in view."
                    : state.mode === "axis"
                      ? "See how it fits together."
                      : "A closer look inside."}
              </h1>
              <p>
                {state.isolate
                  ? "Rotate and zoom to explore this component."
                  : state.mode === "inventory"
                    ? "Each piece is selectable. Zoom in to explore."
                    : state.mode === "axis"
                      ? "Parts separate along their mounting directions."
                      : "Select a component. Discover its role."}
              </p>
            </div>
            <Button
              variant="outline"
              className="mobile-layers"
              aria-label="Systems"
              onClick={() => setLayersOpen(true)}
            >
              <SlidersHorizontal size={16} />
              <span>Systems</span>
            </Button>
            {arSupport === "supported" && arCommands && (
              <Button
                className="enter-ar"
                variant="outline"
                disabled={arStatus.starting}
                onClick={arCommands.enter}
              >
                <Box size={17} />
                {arStatus.starting ? "Starting AR…" : "Enter AR"}
              </Button>
            )}
            <span className="model-badge">
              <span className="status-dot" />
              {ready ? "INTERACTIVE 3D" : "PREPARING 3D"}
            </span>
          </div>
          <div className="scene-area">
            <Suspense
              fallback={
                <div className="loading-scene">
                  <Cpu size={28} />
                  <span>Building your computer…</span>
                </div>
              }
            >
              <AtlasScene
                state={state}
                fansOn={fansOn}
                onToggleFans={toggleFans}
                onSelect={choose}
                onReady={setReady}
                onARStatus={handleARStatus}
                onARCommands={setARCommands}
              />
            </Suspense>
            <div className="scene-fan-control">{fanControl}</div>
            {visible.length === 0 && (
              <div className="empty-state">
                <Layers3 size={26} />
                <h2>No systems visible</h2>
                <p>Choose a system or restore the build.</p>
                <Button onClick={reset}>Restore build</Button>
              </div>
            )}
            <div
              className="camera-tools"
              role="group"
              aria-label="Camera controls"
            >
              <Button
                variant="ghost"
                size="icon"
                title="Three-quarter view"
                aria-label="Three-quarter view"
                aria-pressed={state.view === "perspective"}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    view: "perspective",
                    revision: s.revision + 1,
                  }))
                }
              >
                <Box size={19} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Front view"
                aria-label="Front view"
                aria-pressed={state.view === "front"}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    view: "front",
                    revision: s.revision + 1,
                  }))
                }
              >
                <span className="view-glyph">F</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Side view"
                aria-label="Side view"
                aria-pressed={state.view === "side"}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    view: "side",
                    revision: s.revision + 1,
                  }))
                }
              >
                <span className="view-glyph">S</span>
              </Button>
              <span className="tool-divider" />
              <Button
                variant="ghost"
                size="icon"
                title="Fit visible parts"
                aria-label="Fit visible parts"
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    revision: s.revision + 1,
                    selected: null,
                    selectedMesh: null,
                    isolate: false,
                  }))
                }
              >
                <Maximize size={17} />
              </Button>
            </div>
            <div className="scene-caption">
              <span className="axis-symbol">
                <i />Y <b>X</b>
                <em>Z</em>
              </span>
              <span>
                {state.mode === "inventory"
                  ? "PACKED INVENTORY · LARGE PARTS SCALED TO FIT"
                  : "GENERIC MID-TOWER · AIR-COOLED"}
              </span>
            </div>
          </div>
          <div className="viewer-footer">
            {!arStatus.active && arStatus.message && (
              <p className="ar-error" role="alert">
                {arStatus.message}
              </p>
            )}
            <div className="explore-toolbar">
              <div
                className="view-tabs"
                role="group"
                aria-label="Assembly view"
              >
                <Button
                  variant="ghost"
                  aria-pressed={state.mode === "assembled"}
                  onClick={() => mode("assembled")}
                >
                  <Box size={16} />
                  <span>Assembled</span>
                </Button>
                <Button
                  variant="ghost"
                  aria-pressed={state.mode === "axis"}
                  onClick={() => mode("axis")}
                >
                  <ArrowDownUp size={16} />
                  <span>Exploded</span>
                </Button>
                <Button
                  variant="ghost"
                  aria-pressed={state.mode === "inventory"}
                  onClick={() => mode("inventory")}
                >
                  <Grid2X2 size={16} />
                  <span>Inventory</span>
                </Button>
              </div>
              <div className="toolbar-divider" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset view and systems"
                title="Reset view and systems"
                onClick={reset}
              >
                <RotateCcw size={17} />
              </Button>
            </div>
            {state.mode !== "assembled" && (
              <label className="explode-slider">
                <span>Separation</span>
                <input
                  aria-label="Part separation"
                  type="range"
                  min="0"
                  max="100"
                  value={state.explode}
                  onChange={(e) =>
                    setState((s) => ({ ...s, explode: Number(e.target.value) }))
                  }
                />
                <output>{state.explode}%</output>
              </label>
            )}
            <div className="interaction-hints">
              <span>
                <i className="mouse-icon" />
                Drag to orbit
              </span>
              <span>Scroll to zoom</span>
              <span>Click to inspect</span>
            </div>
          </div>
        </section>
        {chosen && (
          <aside
            className="detail-panel"
            aria-label="Component details"
            style={{ "--system-color": system!.color } as CSSProperties}
          >
            <div className="detail-top">
              <span className="eyebrow">COMPONENT INSPECTOR</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close component details"
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    selected: null,
                    selectedMesh: null,
                    isolate: false,
                  }))
                }
              >
                <X size={19} />
              </Button>
            </div>
            <div className="detail-scroll">
              <div className="detail-system">
                <span className="system-marker" />
                {system!.name}
              </div>
              <h2>{chosen.name}</h2>
              <div className="part-id">
                {chosen.id.toUpperCase()}{" "}
                <span>
                  · {PIECES.filter((p) => p.conceptId === chosen.id).length}{" "}
                  pieces
                </span>
              </div>
              <p className="description">{chosen.description}</p>
              <div className="function-block">
                <span className="eyebrow">WHAT IT DOES</span>
                <p>{chosen.function}</p>
              </div>
              {state.selectedMesh && (
                <div className="selected-piece">
                  <Focus size={15} />
                  <span>
                    Selected piece{" "}
                    <strong>
                      {PIECES.find((p) => p.id === state.selectedMesh)?.name}
                    </strong>
                  </span>
                </div>
              )}
              <h3>
                Example specifications <span>REFERENCE ONLY</span>
              </h3>
              <dl className="specs">
                {chosen.specs.map((s) => (
                  <div key={s.label}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="connections-title">
                <h3>Connects to</h3>
                <Link2 size={16} />
              </div>
              <div className="connection-list">
                {chosen.connectsTo.map((c) => (
                  <button
                    key={`${c.id}-${c.connector}`}
                    onClick={() => choose(c.id)}
                  >
                    <span>
                      <strong>{BY_ID.get(c.id)!.name}</strong>
                      <small>{c.connector}</small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
              <p className="system-context">
                <strong>{system!.short} system</strong>
                {system!.description}
              </p>
            </div>
            <div className="detail-actions">
              <Button
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    isolate: !s.isolate,
                    connections: false,
                    mode: s.isolate ? s.mode : "assembled",
                  }))
                }
                aria-pressed={state.isolate}
              >
                <Focus size={16} />
                {state.isolate ? "Show surrounding parts" : "Isolate component"}
              </Button>
              <Button
                variant="outline"
                aria-pressed={state.connections}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    connections: !s.connections,
                    isolate: false,
                    visible: s.connections
                      ? s.visible
                      : SYSTEMS.map((s) => s.id),
                    allowedConcepts: null,
                  }))
                }
              >
                <Link2 size={16} />
                {state.connections ? "Hide connections" : "Show connections"}
              </Button>
            </div>
          </aside>
        )}
      </main>
      <footer className="app-footer">
        <span>
          <span className="footer-dot" />
          {PIECES.length} selectable pieces <span className="divider">/</span>{" "}
          {CATALOG.length} components
        </span>
        <span className="footer-middle">Built for curious minds.</span>
        <button onClick={() => setAboutOpen(true)}>
          About the atlas <ArrowUpRight size={13} />
        </button>
      </footer>
      <Dialog.Root
        open={searchOpen}
        onOpenChange={(v) => {
          setSearchOpen(v);
          if (v) {
            setQuery("");
            setActiveResult(0);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="search-dialog"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
          >
            <Dialog.Title className="sr-only">Find a component</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search names, aliases, part IDs, and hardware systems.
            </Dialog.Description>
            <div className="search-input-wrap">
              <Search size={20} />
              <input
                ref={inputRef}
                aria-label="Search components"
                placeholder="CPU, memory, a cable…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveResult(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveResult((i) => Math.min(i + 1, results.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveResult((i) => Math.max(i - 1, 0));
                  }
                  if (e.key === "Enter" && results[activeResult])
                    choose(
                      results[activeResult].id,
                      results[activeResult].matchedPiece,
                    );
                }}
              />
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close search">
                  <X size={18} />
                </Button>
              </Dialog.Close>
            </div>
            <div className="search-meta">
              {query
                ? `${results.length} matching components`
                : "START EXPLORING"}
            </div>
            <div className="search-results">
              {results.length ? (
                results.map((p, i) => (
                  <button
                    key={p.id}
                    className={i === activeResult ? "result active" : "result"}
                    onClick={() => choose(p.id, p.matchedPiece)}
                    onMouseEnter={() => setActiveResult(i)}
                  >
                    <span
                      className="result-icon"
                      style={{ color: SYSTEM_BY_ID.get(p.system)!.color }}
                    >
                      <Cpu size={20} />
                    </span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {SYSTEM_BY_ID.get(p.system)!.name} ·{" "}
                        {p.matchedPiece || p.id}
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                ))
              ) : (
                <div className="search-empty">
                  No components found.
                  <br />
                  <span>Try “memory”, “power”, or “motherboard”.</span>
                </div>
              )}
            </div>
            <div className="search-bottom">
              <span>
                ↑ ↓ to browse <span>↵ to inspect</span>
              </span>
              <kbd>esc</kbd>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={layersOpen} onOpenChange={setLayersOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="layers-dialog">
            <Dialog.Title className="sr-only">System layers</Dialog.Title>
            <Dialog.Description className="sr-only">
              Choose which hardware systems to show.
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="ghost" className="layers-done">
                <ArrowLeft size={17} />
                Back to explorer
              </Button>
            </Dialog.Close>
            {layerControls}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={aboutOpen} onOpenChange={setAboutOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="about-dialog">
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="about-close"
                aria-label="Close about"
              >
                <X size={20} />
              </Button>
            </Dialog.Close>
            <span className="brand-mark">
              <Cpu size={25} />
            </span>
            <Dialog.Title>Every part has a purpose.</Dialog.Title>
            <Dialog.Description>
              Computer Atlas is an interactive guide to the systems inside a
              desktop PC. Explore {PIECES.length} original procedural pieces
              across twelve hardware systems.
            </Dialog.Description>
            <p>
              <strong>Tabletop AR</strong>{" "}
              {arSupport === "insecure"
                ? "Open this page over HTTPS to check AR support."
                : arSupport === "supported"
                  ? "Use Enter AR to place a 32 cm PC on a tabletop. Allow camera access, move slowly, then tap the ring."
                  : "Try this page over HTTPS in an AR-capable Android browser with surface detection. This browser can still explore the full desktop model."}
            </p>
            <div className="about-facts">
              <p>
                <Check size={16} />
                Generic ATX reference; all specs are examples.
              </p>
              <p>
                <Check size={16} />
                Air cooling, two DIMMs, one GPU, and two drives.
              </p>
              <p>
                <Check size={16} />
                No downloaded models, logos, or anatomy assets.
              </p>
            </div>
            <p>
              The model illustrates physical parts and logical connections.
              Cable strands and socket contacts do not represent exact pinouts.
              Inventory scales large pieces down for easier browsing.
            </p>
            <p>
              Inspired by the exploration model of{" "}
              <a
                href="https://github.com/ashemag/human-atlas"
                target="_blank"
                rel="noreferrer"
              >
                Human Atlas <ArrowUpRight size={13} />
              </a>
              . Original Computer Atlas code and geometry are MIT licensed.
            </p>
            <div className="about-links">
              <a href="/ATTRIBUTION.md" target="_blank" rel="noreferrer">
                Source & credits <ArrowUpRight size={14} />
              </a>
              <span>Orbit · zoom · discover</span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
