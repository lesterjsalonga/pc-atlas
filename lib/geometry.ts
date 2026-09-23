import { BY_ID, type Piece, type Vec3, type Shape } from "./catalog";
export function buildPieces(): Piece[] {
  const pieces: Piece[] = [];
  function add(
    conceptId: string,
    name: string,
    position: Vec3,
    size: Vec3,
    color: string,
    shape: Shape = "box",
    rotation: Vec3 = [0, 0, 0],
    axis: Vec3 = [0, 0, 1],
    panel = false,
    path?: Vec3[],
  ) {
    pieces.push({
      id: `${conceptId}-${pieces.filter((p) => p.conceptId === conceptId).length + 1}`,
      name,
      conceptId,
      system: BY_ID.get(conceptId)!.system,
      shape,
      position,
      size,
      color,
      rotation,
      axis,
      panel,
      path,
    });
  }
  const steel = "#333d43",
    edge = "#69777b",
    pcb = "#31594e",
    black = "#202b2d",
    silver = "#aebbbe",
    gold = "#c3a36b";
  // Coordinates: motherboard lies in XY, component side faces +Z; front is +X.
  for (const x of [-1.65, 1.65])
    for (const z of [-0.66, 1.35])
      add(
        "chassis",
        "Vertical frame rail",
        [x, 0, z],
        [0.09, 4.35, 0.09],
        steel,
      );
  for (const y of [-2.12, 2.12]) {
    for (const z of [-0.66, 1.35])
      add(
        "chassis",
        "Horizontal frame rail",
        [0, y, z],
        [3.4, 0.09, 0.09],
        steel,
      );
    for (const x of [-1.65, 1.65])
      add(
        "chassis",
        "Depth frame rail",
        [x, y, 0.34],
        [0.09, 0.09, 2.08],
        steel,
      );
  }
  add("chassis", "Case floor", [0, -2.1, 0.34], [3.35, 0.065, 2.05], steel);
  add("chassis", "Top cover", [0, 2.13, 0.34], [3.35, 0.065, 2.05], edge);
  add("chassis", "Motherboard tray", [0, 0, -0.61], [3.2, 4.1, 0.045], steel);
  add("chassis", "Front fascia", [1.67, 0, 0.34], [0.08, 4.25, 2.05], steel);
  for (let i = 0; i < 24; i++)
    add(
      "chassis",
      `Front ventilation rail ${i + 1}`,
      [1.725, -1.75 + i * 0.151, 0.34],
      [0.032, 0.035, 1.8],
      edge,
    );
  for (const x of [-1.25, 1.25])
    for (const z of [-0.36, 1.05])
      add(
        "chassis",
        "Rubber foot",
        [x, -2.23, z],
        [0.36, 0.18, 0.36],
        black,
        "cylinder",
        [Math.PI / 2, 0, 0],
        [0, -1, 0],
      );
  add(
    "side-panel",
    "Clear inspection panel",
    [0, 0, 1.4],
    [3.3, 4.2, 0.035],
    "#9fbabc",
    "box",
    [0, 0, 0],
    [0, 0, 1],
    true,
  );
  add(
    "side-panel",
    "Rear cable-management cover",
    [0, 0, -0.72],
    [3.3, 4.2, 0.045],
    steel,
    "box",
    [0, 0, 0],
    [0, 0, -1],
    true,
  );
  add(
    "motherboard",
    "ATX circuit board",
    [-0.15, 0.2, -0.43],
    [2.44, 3.05, 0.065],
    pcb,
  );
  for (let i = 0; i < 28; i++) {
    const x = -1.26 + (i % 7) * 0.32,
      y = -1.16 + Math.floor(i / 7) * 0.86;
    add(
      "motherboard",
      `Signal routing ${i + 1}`,
      [x, y, -0.39],
      [0.014, 0.62, 0.004],
      "#56856d",
    );
  }
  for (const x of [-1.24, -0.2, 1.01])
    for (const y of [-1.15, 0.22, 1.58]) {
      add(
        "screws",
        "Brass board standoff",
        [x, y, -0.51],
        [0.075, 0.075, 0.12],
        gold,
        "cylinder",
      );
      add(
        "screws",
        "Motherboard screw",
        [x, y, -0.355],
        [0.075, 0.075, 0.045],
        silver,
        "cylinder",
      );
    }
  for (const y of [-1.95, 1.95])
    for (const x of [-1.65, 1.65])
      for (const z of [-0.67, 1.36])
        add(
          "screws",
          "Chassis fastener",
          [x, y, z],
          [0.08, 0.08, 0.04],
          silver,
          "cylinder",
        );
  add("socket", "Socket base", [-0.4, 0.79, -0.32], [0.62, 0.68, 0.12], black);
  for (const x of [-0.71, -0.09])
    add(
      "socket",
      "Retention frame side",
      [x, 0.79, -0.22],
      [0.04, 0.7, 0.04],
      silver,
    );
  for (const y of [0.45, 1.13])
    add(
      "socket",
      "Retention frame end",
      [-0.4, y, -0.22],
      [0.66, 0.04, 0.04],
      silver,
    );
  for (let i = 0; i < 36; i++)
    add(
      "socket",
      `Illustrative socket contact ${i + 1}`,
      [-0.64 + (i % 6) * 0.095, 0.54 + Math.floor(i / 6) * 0.098, -0.25],
      [0.023, 0.023, 0.035],
      gold,
      "cylinder",
    );
  add(
    "cpu",
    "Processor substrate",
    [-0.4, 0.79, -0.17],
    [0.56, 0.56, 0.05],
    "#315454",
  );
  add(
    "cpu",
    "Integrated heat spreader",
    [-0.4, 0.79, -0.11],
    [0.49, 0.49, 0.08],
    "#c7c6b9",
  );
  add(
    "thermal-paste",
    "Thermal compound layer",
    [-0.4, 0.79, -0.06],
    [0.43, 0.43, 0.012],
    "#adb1b0",
  );
  add(
    "cpu-cooler",
    "Copper contact base",
    [-0.4, 0.79, -0.025],
    [0.59, 0.59, 0.05],
    "#b68c60",
  );
  for (let i = 0; i < 32; i++)
    add(
      "cpu-cooler",
      `Aluminum cooling fin ${i + 1}`,
      [-0.4, 0.79, 0.14 + i * 0.026],
      [0.98, 1.12, 0.014],
      silver,
    );
  for (let i = 0; i < 4; i++)
    add(
      "cpu-cooler",
      `Heatpipe ${i + 1}`,
      [-0.72 + i * 0.21, 0.79, 0.47],
      [0.054, 0.054, 0.99],
      "#b2916a",
      "cylinder",
    );
  function fan(
    id: string,
    label: string,
    center: Vec3,
    radius: number,
    rotation: Vec3 = [0, 0, 0],
    axis: Vec3 = [0, 0, 1],
  ) {
    // Fan assembly parts are transformed into the same local mounting plane.
    const start = pieces.length;
    add(
      id,
      `${label} frame`,
      [0, 0, 0],
      [radius * 2.15, radius * 2.15, 0.105],
      black,
      "ring",
    );
    add(
      id,
      `${label} rim`,
      [0, 0, 0.055],
      [radius * 1.91, radius * 1.91, 0.022],
      "#72a6a1",
      "ring",
    );
    add(
      id,
      `${label} hub`,
      [0, 0, 0.055],
      [radius * 0.63, radius * 0.63, 0.16],
      edge,
      "cylinder",
    );
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9;
      add(
        id,
        `${label} blade ${i + 1}`,
        [Math.cos(a) * radius * 0.52, Math.sin(a) * radius * 0.52, 0.055],
        [radius * 0.83, radius * 0.34, 0.038],
        "#5b6c70",
        "blade",
        [0, 0, a + 0.52],
      );
    }
    for (const x of [-0.86, 0.86])
      for (const y of [-0.86, 0.86])
        add(
          id,
          `${label} mounting lug`,
          [x * radius, y * radius, 0],
          [radius * 0.28, radius * 0.28, 0.1],
          black,
        );
    for (let i = start; i < pieces.length; i++) {
      const p = pieces[i];
      const [x, y, z] = p.position;
      if (rotation[1]) p.position = [z, y, -x];
      if (rotation[0]) p.position = [x, -z, y];
      p.position = p.position.map((v, j) => v + center[j]) as Vec3;
      p.rotation = [rotation[0], rotation[1], p.rotation[2]];
      p.axis = axis;
      if (p.shape === "blade")
        p.rotor = {
          center,
          axis: rotation[1] ? [1, 0, 0] : rotation[0] ? [0, -1, 0] : [0, 0, 1],
        };
    }
  }
  fan("cpu-fan", "CPU cooler fan", [-0.4, 0.79, 1.03], 0.53);
  fan(
    "front-fans",
    "Upper intake",
    [1.55, 0.97, 0.35],
    0.58,
    [0, Math.PI / 2, 0],
    [1, 0, 0],
  );
  fan(
    "front-fans",
    "Lower intake",
    [1.55, -0.43, 0.35],
    0.58,
    [0, Math.PI / 2, 0],
    [1, 0, 0],
  );
  fan(
    "rear-fan",
    "Rear exhaust",
    [-1.55, 1.17, 0.7],
    0.51,
    [0, Math.PI / 2, 0],
    [-1, 0, 0],
  );
  for (let i = 0; i < 4; i++) {
    const x = 0.33 + i * 0.18;
    add(
      "ram-slots",
      `DIMM socket ${i + 1}`,
      [x, 0.68, -0.27],
      [0.105, 1.39, 0.22],
      black,
    );
    for (const y of [-0.04, 1.39])
      add(
        "ram-slots",
        "Memory retaining latch",
        [x, y, -0.17],
        [0.13, 0.09, 0.22],
        silver,
      );
  }
  for (const [id, x] of [
    ["dimm-a", 0.51],
    ["dimm-b", 0.87],
  ] as const) {
    add(id, "Memory module PCB", [x, 0.68, -0.02], [0.038, 1.32, 0.44], pcb);
    add(
      id,
      "Memory heat spreader",
      [x, 0.68, 0.14],
      [0.09, 1.27, 0.29],
      "#a8b38f",
    );
    for (let i = 0; i < 8; i++)
      add(
        id,
        `DRAM chip ${i + 1}`,
        [x + 0.035, 0.14 + i * 0.151, -0.025],
        [0.035, 0.108, 0.2],
        black,
      );
    for (let i = 0; i < 18; i++)
      add(
        id,
        `Edge contact ${i + 1}`,
        [x + 0.023, 0.08 + i * 0.065, -0.206],
        [0.012, 0.032, 0.06],
        gold,
      );
  }
  for (let i = 0; i < 8; i++) {
    add(
      "vrm",
      `Power stage ${i + 1}`,
      [-1.02, 0.38 + i * 0.155, -0.3],
      [0.15, 0.11, 0.12],
      black,
    );
    add(
      "vrm",
      `Inductor ${i + 1}`,
      [-0.81, 0.38 + i * 0.155, -0.28],
      [0.12, 0.11, 0.16],
      "#7a8180",
    );
  }
  add("vrm", "VRM heatsink", [-1.19, 0.92, -0.17], [0.24, 1.43, 0.35], edge);
  for (let i = 0; i < 16; i++)
    add(
      "vrm",
      "VRM heatsink rib",
      [-1.19, 0.25 + i * 0.086, 0.03],
      [0.26, 0.025, 0.08],
      silver,
    );
  for (let i = 0; i < 36; i++) {
    const row = Math.floor(i / 12);
    add(
      "capacitors",
      `Capacitor ${i + 1}`,
      [-1.18 + (i % 12) * 0.18, -1.02 + row * 0.25, -0.27],
      [0.065, 0.065, 0.19],
      "#bac4bd",
      "cylinder",
    );
  }
  add(
    "chipset",
    "Chipset package",
    [0.56, -0.65, -0.3],
    [0.42, 0.42, 0.1],
    black,
  );
  add(
    "chipset",
    "Chipset heatsink",
    [0.56, -0.65, -0.2],
    [0.49, 0.5, 0.13],
    "#687b78",
  );
  for (let i = 0; i < 7; i++)
    add(
      "chipset",
      "Chipset cooling rib",
      [0.37 + i * 0.06, -0.65, -0.105],
      [0.024, 0.46, 0.05],
      silver,
    );
  add(
    "pcie-slot",
    "PCIe x16 socket",
    [-0.4, -0.24, -0.25],
    [1.7, 0.095, 0.17],
    silver,
  );
  add("gpu", "Graphics PCB", [-0.23, -0.29, 0.48], [2.4, 0.065, 1.15], pcb);
  add(
    "gpu",
    "Graphics cooler shroud",
    [-0.23, -0.45, 0.5],
    [2.47, 0.24, 1.19],
    "#384d55",
  );
  add(
    "gpu",
    "Graphics backplate",
    [-0.23, -0.22, 0.5],
    [2.47, 0.045, 1.19],
    edge,
  );
  for (let i = 0; i < 22; i++)
    add(
      "gpu",
      `GPU heatsink fin ${i + 1}`,
      [-1.33 + i * 0.105, -0.365, 0.5],
      [0.022, 0.16, 1.02],
      silver,
    );
  for (const x of [-0.89, 0.46])
    fan(
      "gpu",
      "Graphics cooler fan",
      [x, -0.59, 0.5],
      0.48,
      [Math.PI / 2, 0, 0],
      [0, -1, 0],
    );
  for (let i = 0; i < 8; i++)
    add(
      "gpu",
      `Video memory chip ${i + 1}`,
      [-1.13 + i * 0.265, -0.248, 0.21],
      [0.17, 0.045, 0.18],
      black,
    );
  add(
    "m2",
    "NVMe circuit board",
    [-0.38, 0.06, -0.26],
    [0.83, 0.23, 0.04],
    pcb,
  );
  for (let i = 0; i < 3; i++)
    add(
      "m2",
      `NVMe flash / controller ${i + 1}`,
      [-0.67 + i * 0.26, 0.06, -0.22],
      [0.18, 0.17, 0.04],
      black,
    );
  add(
    "m2",
    "M.2 retaining screw",
    [0.02, 0.06, -0.22],
    [0.055, 0.055, 0.03],
    silver,
    "cylinder",
  );
  add(
    "sata-drive",
    "SATA SSD enclosure",
    [1.13, -1.24, 0.7],
    [0.78, 0.12, 1.02],
    "#788e8d",
  );
  add(
    "sata-drive",
    "Drive identification plate",
    [1.13, -1.165, 0.7],
    [0.51, 0.008, 0.69],
    "#bdc9c1",
  );
  for (let i = 0; i < 4; i++)
    add(
      "sata-port",
      `SATA port ${i + 1}`,
      [0.93, -0.32 - i * 0.17, -0.24],
      [0.24, 0.12, 0.2],
      black,
    );
  add(
    "psu",
    "Power supply enclosure",
    [-0.82, -1.69, 0.32],
    [1.58, 0.68, 1.79],
    "#39454b",
  );
  add(
    "psu",
    "PSU rating plate",
    [-0.82, -1.69, 1.226],
    [1.04, 0.38, 0.01],
    "#677b7e",
  );
  for (let i = 0; i < 15; i++)
    add(
      "psu",
      "PSU ventilation opening",
      [-1.618, -1.93 + i * 0.036, 0.31],
      [0.007, 0.012, 1.2],
      black,
    );
  function cable(
    id: string,
    route: Vec3[],
    count: number,
    color: string,
    spread: Vec3,
    connector: Vec3,
    connectorSize: Vec3,
  ) {
    for (let i = 0; i < count; i++) {
      const d = (i - (count - 1) / 2) * 0.04;
      const path = route.map((point, index) => {
        // PSU leads leave its side face in parallel before the bundle turns.
        const offset: Vec3 = index < 2 ? [0, 1, 0] : spread;
        return point.map((v, j) => v + offset[j] * d) as Vec3;
      });
      add(
        id,
        `Cable strand ${i + 1}`,
        [0, 0, 0],
        [1, 1, 1],
        color,
        "tube",
        [0, 0, 0],
        [0, 0, 1],
        false,
        path,
      );
    }
    add(id, "Cable connector", connector, connectorSize, black);
  }
  // Route the main power bundles behind the board, then around its edges.
  // Short approach segments keep the spline clear of neighbouring components.
  cable(
    "atx-cable",
    [
      [-0.03, -1.62, 0.4],
      [0.16, -1.62, 0.4],
      [0.42, -1.62, 0.22],
      [0.5, -1.62, -0.36],
      [0.55, -1.56, -0.54],
      [0.85, -1.5, -0.54],
      [1.24, -1.3, -0.54],
      [1.28, -0.85, -0.54],
      [1.28, 0.1, -0.54],
      [1.28, 0.35, -0.54],
      [1.28, 0.53, -0.42],
      [1.25, 0.53, -0.1],
      [1.12, 0.53, -0.025],
      [1.03, 0.53, -0.08],
    ],
    8,
    "#aa9269",
    [0, 1, 0],
    [1.03, 0.53, -0.19],
    [0.16, 0.34, 0.22],
  );
  cable(
    "eps-cable",
    [
      [-0.03, -1.82, -0.38],
      [0.13, -1.82, -0.38],
      [0.23, -1.65, -0.5],
      [0.23, -1.38, -0.54],
      [0.12, -1.07, -0.54],
      [-0.65, -1.0, -0.54],
      [-0.92, -0.8, -0.54],
      [-0.92, 1.55, -0.54],
      [-0.92, 1.84, -0.54],
      [-0.92, 1.92, -0.4],
      [-0.92, 1.84, -0.16],
      [-0.92, 1.69, -0.16],
    ],
    4,
    "#7b8c89",
    [1, 0, 0],
    [-0.92, 1.62, -0.22],
    [0.22, 0.15, 0.24],
  );
  // Graphics power rises beside the end of the card, outside both fan sweeps.
  cable(
    "gpu-cable",
    [
      [-0.03, -1.7, 0.87],
      [0.2, -1.7, 0.87],
      [0.5, -1.66, 0.88],
      [0.64, -1.45, 0.9],
      [0.65, -1.03, 0.91],
      [1.08, -0.88, 0.91],
      [1.2, -0.68, 0.91],
      [1.2, -0.34, 0.91],
      [1.12, -0.29, 0.91],
    ],
    6,
    "#82958b",
    [0, 0, 1],
    [1.075, -0.29, 0.91],
    [0.14, 0.15, 0.25],
  );
  // Separate SATA power and data approaches meet the drive's rear edge.
  cable(
    "sata-power",
    [
      [-0.03, -1.92, 0.05],
      [0.2, -1.92, 0.05],
      [0.64, -1.83, 0.06],
      [0.94, -1.57, 0.07],
      [1.02, -1.35, 0.08],
      [1.02, -1.24, 0.12],
    ],
    3,
    "#8b7d65",
    [1, 0, 0],
    [1.02, -1.24, 0.16],
    [0.2, 0.1, 0.1],
  );
  cable(
    "sata-data",
    [
      [0.93, -0.49, -0.13],
      [1.07, -0.49, -0.11],
      [1.2, -0.64, -0.1],
      [1.23, -0.97, -0.02],
      [1.28, -1.18, 0.06],
      [1.28, -1.24, 0.12],
    ],
    1,
    "#ab7d6c",
    [1, 0, 0],
    [1.28, -1.24, 0.16],
    [0.12, 0.1, 0.1],
  );
  add(
    "pcie-x1",
    "PCIe x1 socket",
    [-0.92, -0.83, -0.25],
    [0.51, 0.1, 0.16],
    black,
  );
  add(
    "network-card",
    "Network card PCB",
    [-0.94, -0.87, 0.04],
    [0.81, 0.045, 0.64],
    pcb,
  );
  add(
    "network-card",
    "Network controller",
    [-0.97, -0.825, 0.05],
    [0.19, 0.04, 0.21],
    black,
  );
  add(
    "network-card",
    "Network RJ45 port",
    [-1.5, -0.77, 0.04],
    [0.38, 0.2, 0.27],
    silver,
  );
  for (let i = 0; i < 6; i++)
    add(
      "rear-io",
      `Rear USB / Ethernet housing ${i + 1}`,
      [-1.49, 0.49 + i * 0.22, -0.13],
      [0.4, 0.17, 0.42],
      silver,
    );
  for (let i = 0; i < 6; i++)
    add(
      "rear-io",
      "Port opening",
      [-1.696, 0.49 + i * 0.22, -0.13],
      [0.008, 0.09, 0.25],
      black,
    );
  for (let i = 0; i < 3; i++)
    add(
      "rear-io",
      "Audio jack",
      [-1.64, -0.11 + i * 0.15, -0.13],
      [0.1, 0.1, 0.19],
      ["#91ad8d", "#ba8d88", "#91a2b9"][i],
      "cylinder",
      [0, Math.PI / 2, 0],
      [-1, 0, 0],
    );
  for (let i = 0; i < 3; i++)
    add(
      "display-ports",
      `Digital display socket ${i + 1}`,
      [-1.56, -0.33, 0.06 + i * 0.34],
      [0.26, 0.12, 0.22],
      silver,
    );
  add(
    "bios",
    "Firmware flash package",
    [0.27, -1.04, -0.29],
    [0.23, 0.16, 0.08],
    black,
  );
  for (let i = 0; i < 8; i++)
    add(
      "bios",
      "SPI flash pin",
      [0.18 + (i % 4) * 0.06, -1.145 + Math.floor(i / 4) * 0.21, -0.32],
      [0.022, 0.05, 0.025],
      silver,
    );
  add(
    "battery",
    "RTC coin cell",
    [-0.36, -0.77, -0.245],
    [0.29, 0.29, 0.065],
    silver,
    "cylinder",
  );
  add(
    "battery",
    "Coin cell holder",
    [-0.36, -0.77, -0.3],
    [0.34, 0.34, 0.07],
    black,
    "ring",
  );
  add(
    "crystal",
    "Quartz crystal package",
    [0.17, -0.76, -0.29],
    [0.16, 0.065, 0.07],
    silver,
  );
  for (let i = 0; i < 10; i++)
    add(
      "front-header",
      `Front-panel header pin ${i + 1}`,
      [0.51 + (i % 5) * 0.055, -1.13 + Math.floor(i / 5) * 0.065, -0.23],
      [0.018, 0.018, 0.17],
      gold,
    );
  for (let i = 0; i < 2; i++)
    add(
      "front-io",
      "Front USB housing",
      [1.55, 1.9, 0.19 + i * 0.43],
      [0.25, 0.12, 0.22],
      silver,
    );
  add(
    "front-io",
    "Headphone jack",
    [1.56, 1.9, 0.98],
    [0.1, 0.1, 0.1],
    black,
    "cylinder",
    [0, Math.PI / 2, 0],
    [1, 0, 0],
  );
  add(
    "power-button",
    "Power switch cap",
    [1.73, 1.76, -0.27],
    [0.15, 0.15, 0.04],
    silver,
    "cylinder",
    [0, Math.PI / 2, 0],
    [1, 0, 0],
  );
  add(
    "power-button",
    "Power indicator LED",
    [1.73, 1.51, -0.27],
    [0.055, 0.055, 0.02],
    "#d0f394",
    "cylinder",
    [0, Math.PI / 2, 0],
    [1, 0, 0],
  );
  // The fixed rear face remains visible with the removable side panels hidden.
  // Its openings are cut through the geometry, so picking reaches the hardware.
  add(
    "chassis",
    "Rear chassis panel",
    [-1.69, 0, 0.34],
    [2.05, 4.25, 0.055],
    steel,
    "rear-panel",
    [0, Math.PI / 2, 0],
    [-1, 0, 0],
  );
  for (const y of [1.17 - 0.4386, 1.17 + 0.4386])
    for (const z of [0.7 - 0.4386, 0.7 + 0.4386])
      add(
        "screws",
        "Rear exhaust mounting screw",
        [-1.73, y, z],
        [0.075, 0.075, 0.03],
        silver,
        "cylinder",
        [0, Math.PI / 2, 0],
        [-1, 0, 0],
      );
  return pieces;
}
export const PIECES = buildPieces();
