# Computer Atlas

An interactive, procedural 3D desktop computer explorer. Inspect **562 selectable
pieces**, **38 named components**, and **12 hardware systems**. React, TypeScript,
Vite, imperative Three.js, Tailwind, and shadcn-style Radix UI components. No API
keys, account, backend, or remote model download is required.

## Explore

- Drag to orbit, wheel or pinch to zoom, right-drag or two-finger drag to pan.
- Hover to highlight a piece; click or tap to inspect it. Dragging cancels selection.
- Toggle systems, show one system, or use all six presets: Full build, Internals
  only, Bare motherboard, Cooling & airflow, Power path, Memory & storage.
- Switch between assembled, mounting-axis exploded, and packed inventory views.
  A separation slider animates between the assembled and separated positions.
- Search names, aliases (RAM, DIMM, memory stick), component IDs, mesh IDs (such
  as `cpu-1`), or systems.
  Typo tolerance includes queries such as `memroy`. Press `/` to search, arrow
  keys to browse results, Enter to inspect, and Escape to dismiss.
- Isolate a component, inspect example specifications, and follow clickable
  connection links. Connections mode highlights neighbours and draws schematic
  links between them; these lines are logical connections, not electrical schematics.
- In the focused canvas, `+` / `-` zoom and `Home` fits the view. A fully keyboard
  accessible search and details interface is an alternative to spatial picking.

## Run locally

Requires **Node 22.13 or newer** (development and validation used Node 24.15.0).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Production output is generated in `dist/`:

```sh
npm run build
npm run preview
```

## Validate

```sh
npm run check
node scripts/validate-atlas.mjs
node scripts/validate-interactions.mjs
npm run build
```

`npm run validate` runs both data/interaction validators. Atlas validation checks
unique IDs, systems, nonempty educational data, concept membership, reciprocal
connections, finite nondegenerate triangles, positive dimensions, and geometry
containment within packing bounds. It validates the actual procedural geometry,
not just the catalog. Interaction validation checks selection, visibility,
isolation, aliases, typo search, touch/mouse gesture cancellation, and 114 packed
layouts across viewport ratios, presets, and individual systems.

For browser tests, keep `npm run dev` running in another terminal:

```sh
npx playwright install chromium
npm run test:browser
```

Optionally set `ATLAS_URL` to a preview-server URL. The suite saves screenshots
and `browser-report.json` under ignored `artifacts/`.

Tested here: TypeScript, ESLint, the static production build, the two validators,
and Playwright headless Chromium using software WebGL. Browser checks exercise
canvas picking, orbit drag without accidental selection, simulated touch taps,
touch drag and pinch cancellation, individual mesh-ID search,
system toggles, all presets, fuzzy search, isolation, related-part navigation,
connection lines, idle rendering, and desktop **1440×900** plus **390×844**,
**320×568**, and **844×390** layouts. Screenshots were visually inspected.

Not tested: physical phones, real multitouch/pinch hardware, Safari, Firefox,
hardware-GPU performance, screen-reader announcements, or a live Vercel deployment.
Synthetic multitouch cancellation is covered by the gesture and browser checks; it is
not a claim of real-device testing. The optional external-model loader and
WebMCP integration are not included in this version.

## Data

- `lib/catalog.ts`: typed named concepts, aliases, systems, parent assemblies,
  educational descriptions, example specs, and reciprocal connector relationships.
- `lib/geometry.ts`: procedural pieces with stable per-concept IDs, shape, transform,
  material color, and mounting direction. Every piece has exactly one concept.
- `lib/interactions.ts`: explorer state, presets, visibility, search, and gestures.
- `lib/layout.ts`: deterministic, bounded packing for visible pieces only.

Assumptions: generic ATX mid-tower, air-cooled CPU, four DIMM slots with two DDR5
modules, dual-fan graphics card, M.2 NVMe and 2.5-inch SATA SSDs, ATX PSU, and an
additional wired network card. All specifications are illustrative; no real
branded product or proprietary connector pinout is represented. An AIO is not
installed in this air-cooled reference. All twelve requested systems are retained.

The 36 socket contacts and cable strands illustrate structures, not exact pinouts.
PCB routing, electronics placement, fan mounts, dimensions, and cooling behavior
are simplified. The model is not a compatibility checker or assembly manual.

## How it works

Human Atlas was studied as a blueprint for the concepts/meshes separation,
system filters, search-to-inspection flow, packed explosion, and small-screen
controls. This repository contains original implementation and geometry.
See [attribution](public/ATTRIBUTION.md).

The React UI lazy-loads the Three.js scene. The scene batches shared shapes and
materials with `InstancedMesh`; a raycast's instance index resolves to an
individual piece. Hidden batches are disabled. The default complete scene has
about 58 draw calls and 25,812 triangles. It schedules frames only for changes,
camera damping, and transitions; an automated idle test checks that frame counts
stop changing. Resources are disposed on teardown. The environment lighting is
generated locally with Three.js's RoomEnvironment; no HDR file is downloaded.

Assembly-axis explosion follows each piece's mounting direction. Inventory packs
each visible piece in a separate cell, including every fin and contact. A dedicated
orthographic camera preserves non-overlapping projected footprints at 100%
separation. Intermediate animation can overlap by design. Large parts are scaled
down in inventory (never assembled mode); this is stated in the UI. Zoom or select
to inspect small pieces. Orbit is disabled in inventory to preserve its layout;
zoom and pan remain available. Mobile detail sheets reserve real layout space,
and camera controls and view controls sit outside the canvas viewport.

Keyboard focus traps and dismissal for dialogs come from Radix. WebGL failure
shows a recovery message while the search/catalog remains available. Reduced
motion preferences disable transition interpolation.

## Deploy

The included `vercel.json` specifies `npm ci`, `npm run build`, and `dist`.
Import this directory as a Vite project in Vercel with Node 22.13+ (or Node 24).
The result is a static site and can also be served by another static host.
This work prepared and built the deployment configuration; it did not publish
to a Vercel account or create a public deployment.

## License

Original application code and procedural geometry: [MIT](LICENSE).
Third-party dependencies retain their own licenses, preserved in
[THIRD_PARTY_LICENSES.txt](public/THIRD_PARTY_LICENSES.txt).
No anatomy data, externally sourced 3D models, photographs, or textures are included.
