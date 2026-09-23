export const SYSTEMS = [
  {
    id: "enclosure",
    name: "Enclosure & chassis",
    short: "Enclosure",
    color: "#8b969f",
    description:
      "The frame supports the hardware. Removable panels protect it and guide airflow.",
  },
  {
    id: "motherboard",
    name: "Motherboard & PCB",
    short: "Motherboard",
    color: "#547d67",
    description:
      "Copper paths in the printed circuit board carry signals and power between components.",
  },
  {
    id: "processor",
    name: "Processor",
    short: "Processor",
    color: "#cf9060",
    description:
      "The processor executes instructions and communicates directly with memory and some expansion devices.",
  },
  {
    id: "cooling",
    name: "Cooling & airflow",
    short: "Cooling",
    color: "#69aab0",
    description:
      "Heatsinks transfer heat to air. Fans move warm air out and bring cooler air in.",
  },
  {
    id: "memory",
    name: "Memory",
    short: "Memory",
    color: "#aca05b",
    description:
      "Working memory holds the instructions and data the processor is using. It loses its contents without power.",
  },
  {
    id: "storage",
    name: "Storage",
    short: "Storage",
    color: "#a886b9",
    description:
      "Nonvolatile storage keeps programs and files when the computer is switched off.",
  },
  {
    id: "graphics",
    name: "Graphics",
    short: "Graphics",
    color: "#6888c0",
    description:
      "A graphics processor performs parallel work and produces the images sent to a display.",
  },
  {
    id: "power",
    name: "Power & cabling",
    short: "Power",
    color: "#c2a16e",
    description:
      "The power supply converts mains AC into regulated DC. Cables distribute that power.",
  },
  {
    id: "expansion",
    name: "Expansion cards",
    short: "Expansion",
    color: "#9e8190",
    description:
      "Expansion cards add capabilities using slots connected to the processor or chipset.",
  },
  {
    id: "io",
    name: "Ports & I/O",
    short: "Ports & I/O",
    color: "#759ca6",
    description:
      "External connectors link the computer to displays, peripherals, networks, and sound equipment.",
  },
  {
    id: "firmware",
    name: "Firmware & timing",
    short: "Firmware",
    color: "#aa9879",
    description:
      "Firmware initializes hardware. A clock and backup battery preserve time while mains power is off.",
  },
  {
    id: "front",
    name: "Front panel & lighting",
    short: "Front panel",
    color: "#a9b766",
    description:
      "The front-panel controls, indicator lights, and connectors make the computer accessible.",
  },
] as const;
export type SystemId = (typeof SYSTEMS)[number]["id"];
export type Vec3 = [number, number, number];
export interface Connection {
  id: string;
  connector: string;
}
export interface Concept {
  id: string;
  name: string;
  aliases: string[];
  system: SystemId;
  parent: string;
  description: string;
  function: string;
  specs: { label: string; value: string }[];
  connectsTo: Connection[];
}
export type Shape =
  | "box"
  | "cylinder"
  | "ring"
  | "blade"
  | "tube"
  | "rear-panel";
export interface Piece {
  id: string;
  name: string;
  conceptId: string;
  system: SystemId;
  shape: Shape;
  position: Vec3;
  size: Vec3;
  rotation: Vec3;
  color: string;
  axis: Vec3;
  panel?: boolean;
  path?: Vec3[];
  rotor?: { center: Vec3; axis: Vec3 };
}

const concepts: Concept[] = [];
function concept(
  id: string,
  name: string,
  system: SystemId,
  aliases: string[],
  description: string,
  fn: string,
  specs: [string, string][],
  parent = "Desktop PC",
) {
  concepts.push({
    id,
    name,
    system,
    aliases,
    parent,
    description,
    function: fn,
    specs: specs.map(([label, value]) => ({ label, value })),
    connectsTo: [],
  });
}
concept(
  "chassis",
  "ATX chassis",
  "enclosure",
  ["case", "tower", "frame", "rear panel", "back cover"],
  "The metal frame and rear panel of this mid-tower PC hold the motherboard, drives, fans, and power supply in position. Rear openings expose the exhaust fan, motherboard ports, expansion-card connectors, and power supply.",
  "Provides mounting points and a path for cooling air.",
  [
    ["Format", "Mid-tower, ATX"],
    ["Material", "Steel frame"],
  ],
);
concept(
  "side-panel",
  "Side panels",
  "enclosure",
  ["cover", "window"],
  "Removable side panels close the enclosure. This reference uses a clear inspection panel on the component side.",
  "Protects components and controls where air enters.",
  [["Construction", "Clear side and metal rear cover"]],
  "ATX chassis",
);
concept(
  "screws",
  "Mounting screws & standoffs",
  "enclosure",
  ["fasteners", "spacers"],
  "Screws secure assemblies. Brass standoffs hold the motherboard above the metal tray to prevent unwanted electrical contact.",
  "Mechanically secures the build.",
  [["Mounting", "Illustrative ATX mounting pattern"]],
  "ATX chassis",
);
concept(
  "motherboard",
  "ATX motherboard",
  "motherboard",
  ["mainboard", "mobo", "pcb"],
  "The large circuit board links the CPU, RAM, graphics, storage, and external connections. Its copper traces are simplified in this model.",
  "Distributes signals and power throughout the computer.",
  [
    ["Form factor", "ATX · 305 × 244 mm"],
    ["Memory layout", "4 DIMM slots"],
  ],
);
concept(
  "vrm",
  "Voltage regulator modules",
  "motherboard",
  ["vrm", "mosfet", "choke"],
  "Power stages near the CPU socket turn the supply voltage into the lower, controlled voltage the processor needs.",
  "Regulates power close to the processor.",
  [
    ["Input", "12 V via EPS connector"],
    ["Output", "Processor-dependent voltage"],
  ],
  "ATX motherboard",
);
concept(
  "capacitors",
  "Board capacitors",
  "motherboard",
  ["caps", "filter"],
  "These small capacitors store charge locally and reduce voltage ripple. Their illustrated placement is educational, not a circuit schematic.",
  "Helps keep component power stable.",
  [["Type", "Illustrative solid capacitors"]],
  "ATX motherboard",
);
concept(
  "chipset",
  "Chipset & heatsink",
  "motherboard",
  ["pch", "southbridge"],
  "The chipset connects additional I/O and storage to the CPU. The small heatsink spreads the heat it produces.",
  "Expands the platform’s connectivity.",
  [["Links", "Additional PCIe, USB, and SATA"]],
  "ATX motherboard",
);
concept(
  "cpu",
  "Desktop processor",
  "processor",
  ["cpu", "processor", "central processing unit"],
  "Under this metal heat spreader, a silicon processor executes program instructions. The spreader transfers heat to the cooler above it.",
  "Runs the operating system and application instructions.",
  [
    ["Cores / threads", "8 cores / 16 threads"],
    ["Package", "Generic land-grid array"],
    ["Power class", "65–125 W"],
  ],
  "Processor assembly",
);
concept(
  "socket",
  "CPU socket & retention frame",
  "processor",
  ["lga", "socket", "retention"],
  "The socket aligns the processor’s contact pads with contacts on the motherboard. Its frame holds the package in place.",
  "Makes electrical and mechanical contact with the CPU.",
  [["Socket", "Generic LGA, not a real pinout"]],
  "ATX motherboard",
);
concept(
  "thermal-paste",
  "Thermal interface",
  "cooling",
  ["paste", "tim", "thermal compound"],
  "A thin layer of thermal compound fills microscopic gaps between the processor’s heat spreader and the cooler base.",
  "Reduces thermal resistance at the contact surface.",
  [["Layer", "Thickness exaggerated for visibility"]],
  "CPU cooler",
);
concept(
  "cpu-cooler",
  "Tower CPU cooler",
  "cooling",
  ["heatsink", "fins", "heatpipe", "air cooler"],
  "A metal base and heatpipes carry heat from the CPU into a stack of thin fins. A fan pushes air through the stack.",
  "Moves processor heat into the case airflow.",
  [
    ["Design", "32 aluminum fins / 4 heatpipes"],
    ["Cooling", "Air-cooled reference build"],
  ],
  "Processor assembly",
);
concept(
  "cpu-fan",
  "CPU cooler fan",
  "cooling",
  ["pwm", "fan"],
  "This fan drives air across the tower cooler’s fins. Its speed can be controlled by a motherboard fan header.",
  "Keeps air moving over the CPU heatsink.",
  [
    ["Fan size", "120 mm class"],
    ["Control", "4-pin PWM"],
  ],
  "CPU cooler",
);
concept(
  "front-fans",
  "Front intake fans",
  "cooling",
  ["intake", "case fan", "airflow"],
  "Two front fans bring outside air into the enclosure and toward the graphics card and processor cooler.",
  "Supplies cooler air to the internal components.",
  [["Arrangement", "2 × 120 mm intake"]],
  "ATX chassis",
);
concept(
  "rear-fan",
  "Rear exhaust fan",
  "cooling",
  ["exhaust", "case fan"],
  "The rear fan moves heated air out of the case. Together with intake fans it establishes a front-to-back airflow path.",
  "Exhausts warm air from the enclosure.",
  [["Arrangement", "1 × 120 mm exhaust"]],
  "ATX chassis",
);
concept(
  "ram-slots",
  "DIMM slots",
  "memory",
  ["memory slot", "ram socket"],
  "Four keyed sockets hold compatible memory modules. The notch helps prevent an incompatible module from being inserted.",
  "Connects memory modules to the CPU’s memory controller.",
  [["Layout", "4 slots; 2 populated"]],
  "ATX motherboard",
);
concept(
  "dimm-a",
  "DDR5 memory · module A",
  "memory",
  ["ram", "dimm", "memory stick", "ddr5"],
  "This memory module holds data the CPU is actively using. Its chips sit on a small board with a keyed edge connector.",
  "Provides fast, temporary working storage.",
  [
    ["Capacity", "16 GB"],
    ["Data rate", "DDR5-5600"],
    ["Pair", "Illustrative 32 GB dual-channel kit"],
  ],
  "Memory assembly",
);
concept(
  "dimm-b",
  "DDR5 memory · module B",
  "memory",
  ["ram", "dimm", "memory stick", "ddr5"],
  "A second matched memory module can populate the other memory channel. Actual slot order must follow the motherboard manual.",
  "Adds working capacity and enables a second memory channel.",
  [
    ["Capacity", "16 GB"],
    ["Data rate", "DDR5-5600"],
  ],
  "Memory assembly",
);
concept(
  "m2",
  "M.2 NVMe drive",
  "storage",
  ["ssd", "nvme", "m2", "m.2", "solid state"],
  "This compact solid-state drive connects directly to an M.2 socket. It uses PCIe lanes and the NVMe storage protocol.",
  "Keeps the operating system and files without power.",
  [
    ["Capacity", "1 TB"],
    ["Size", "M.2 2280"],
    ["Interface", "PCIe ×4 / NVMe"],
  ],
  "ATX motherboard",
);
concept(
  "sata-drive",
  "2.5-inch SATA drive",
  "storage",
  ["ssd", "sata", "disk"],
  "This separate solid-state drive uses one cable for SATA data and another for power from the power supply.",
  "Provides additional persistent storage.",
  [
    ["Capacity", "2 TB"],
    ["Interface", "SATA 6 Gb/s"],
  ],
  "Drive bay",
);
concept(
  "sata-port",
  "SATA data connectors",
  "storage",
  ["sata socket", "sata port"],
  "These keyed connectors accept SATA data cables for drives. Data and drive power use separate connectors.",
  "Links a SATA drive to the motherboard storage controller.",
  [["Ports", "4 illustrated SATA ports"]],
  "ATX motherboard",
);
concept(
  "gpu",
  "Graphics card",
  "graphics",
  ["gpu", "video card", "graphics processing unit", "vram"],
  "A dedicated graphics processor and its memory sit on this expansion board. Its shroud and twin fans cool the board.",
  "Renders images and performs highly parallel calculations.",
  [
    ["Memory", "8 GB dedicated VRAM"],
    ["Interface", "PCIe ×16"],
    ["Cooling", "Dual-fan air cooler"],
  ],
  "Graphics assembly",
);
concept(
  "pcie-slot",
  "PCIe ×16 slot",
  "graphics",
  ["pcie", "pci express", "gpu slot"],
  "This long expansion slot carries the graphics card’s data link and some power. A latch helps retain the card.",
  "Connects the graphics card to the host platform.",
  [["Connector", "Physical PCIe ×16"]],
  "ATX motherboard",
);
concept(
  "psu",
  "Power supply",
  "power",
  ["psu", "power supply unit"],
  "The enclosed power supply converts mains AC to regulated DC rails. Its internal high-voltage circuitry is not modeled.",
  "Supplies usable DC power to the computer.",
  [
    ["Output class", "650 W"],
    ["Format", "ATX"],
    ["Rails", "+12 V, +5 V, +3.3 V"],
  ],
  "Power assembly",
);
concept(
  "atx-cable",
  "24-pin motherboard power",
  "power",
  ["atx", "24 pin", "power cable"],
  "The main power cable supplies the motherboard through its 24-pin ATX connector. Visible strands represent a bundle, not the complete pinout.",
  "Carries motherboard power and control signals.",
  [["Connector", "24-pin ATX"]],
  "Power assembly",
);
concept(
  "eps-cable",
  "CPU power cable",
  "power",
  ["eps", "8 pin cpu", "cpu cable"],
  "The EPS power cable delivers 12 V to the voltage regulators near the CPU. It is not interchangeable with a graphics power cable.",
  "Feeds the processor’s voltage regulators.",
  [["Connector", "8-pin EPS, illustrative"]],
  "Power assembly",
);
concept(
  "gpu-cable",
  "Graphics power cable",
  "power",
  ["pcie power", "8 pin gpu"],
  "A dedicated PCIe power cable supplies the graphics card in addition to the power available through its slot.",
  "Provides additional power for the graphics card.",
  [["Connector", "8-pin PCIe, illustrative"]],
  "Power assembly",
);
concept(
  "sata-power",
  "SATA power cable",
  "power",
  ["drive power", "15 pin"],
  "A SATA power connector supplies a drive independently of its SATA data cable.",
  "Delivers DC power to a SATA drive.",
  [["Connector", "15-pin SATA power"]],
  "Power assembly",
);
concept(
  "sata-data",
  "SATA data cable",
  "storage",
  ["drive cable", "7 pin"],
  "A SATA data cable connects the 2.5-inch drive to a motherboard SATA port.",
  "Carries storage commands and data.",
  [["Connector", "7-pin SATA data"]],
  "Drive bay",
);
concept(
  "network-card",
  "Network expansion card",
  "expansion",
  ["nic", "ethernet card", "network adapter"],
  "This small PCIe card adds a wired network interface. It is included to show how a short expansion card fits below the GPU.",
  "Adds a network connection through PCIe.",
  [
    ["Interface", "PCIe ×1"],
    ["Network", "1 Gb/s Ethernet"],
  ],
  "Expansion assembly",
);
concept(
  "pcie-x1",
  "PCIe ×1 slot",
  "expansion",
  ["expansion slot", "pcie x1"],
  "A short PCIe slot provides one data lane to an add-in card. Longer and shorter slot compatibility depends on the hardware.",
  "Connects a lower-bandwidth expansion device.",
  [["Connector", "Physical PCIe ×1"]],
  "ATX motherboard",
);
concept(
  "rear-io",
  "Rear I/O ports",
  "io",
  ["usb", "ethernet", "audio", "ports", "io shield"],
  "The rear port cluster exposes motherboard USB, network, and audio connections through the chassis opening.",
  "Connects external peripherals to the motherboard.",
  [["Illustrated", "USB-A, Ethernet, audio jacks"]],
  "ATX motherboard",
);
concept(
  "display-ports",
  "Graphics display outputs",
  "io",
  ["hdmi", "displayport", "monitor"],
  "Display outputs on the graphics card send images to an external monitor. Their shapes are generic illustrations.",
  "Carries the graphics card’s display signals.",
  [["Illustrated", "Digital display connectors"]],
  "Graphics assembly",
);
concept(
  "bios",
  "UEFI firmware flash",
  "firmware",
  ["bios", "rom", "uefi", "firmware chip"],
  "This nonvolatile flash chip stores platform firmware. At startup, the firmware initializes hardware and starts the boot process.",
  "Stores the code needed to initialize the platform.",
  [["Storage", "SPI flash memory"]],
  "ATX motherboard",
);
concept(
  "battery",
  "RTC backup battery",
  "firmware",
  ["cmos", "coin cell", "cr2032"],
  "A coin-cell battery keeps the real-time clock running when external power is absent. Settings retention varies by motherboard design.",
  "Maintains the real-time clock’s backup power.",
  [["Cell", "3 V coin cell class"]],
  "ATX motherboard",
);
concept(
  "crystal",
  "Clock crystal",
  "firmware",
  ["oscillator", "timing", "rtc"],
  "A small quartz crystal supplies a stable timing reference. Clock-generation circuitry derives the frequencies needed by the platform.",
  "Provides an accurate timing reference.",
  [["Reference", "32.768 kHz RTC crystal"]],
  "ATX motherboard",
);
concept(
  "front-io",
  "Front USB & audio",
  "front",
  ["front usb", "headphone"],
  "Connectors at the top of the case provide convenient access for removable devices and headphones.",
  "Brings frequently used ports to the front of the PC.",
  [["Illustrated", "USB-A and 3.5 mm audio"]],
  "ATX chassis",
);
concept(
  "front-header",
  "Front-panel header",
  "front",
  ["fpanel", "header", "pins"],
  "Small motherboard pins connect the case power switch and indicator lights. The actual pin arrangement depends on the motherboard.",
  "Links case controls and status lights to the board.",
  [["Signals", "Power switch and status LEDs"]],
  "ATX motherboard",
);
concept(
  "power-button",
  "Power button & status light",
  "front",
  ["switch", "led", "lighting"],
  "The momentary power switch sends a control signal through the front-panel header. The small light indicates system power state.",
  "Lets a person request startup or shutdown.",
  [["Switch", "Momentary contact"]],
  "ATX chassis",
);

function connect(a: string, b: string, connector: string) {
  concepts.find((p) => p.id === a)!.connectsTo.push({ id: b, connector });
  concepts.find((p) => p.id === b)!.connectsTo.push({ id: a, connector });
}
[
  ["chassis", "motherboard", "ATX standoffs"],
  ["chassis", "side-panel", "Panel mounts"],
  ["chassis", "screws", "Threaded mounts"],
  ["chassis", "psu", "ATX mounting screws"],
  ["chassis", "front-fans", "Fan mounts"],
  ["chassis", "rear-fan", "Fan mounts"],
  ["motherboard", "socket", "Soldered socket contacts"],
  ["socket", "cpu", "LGA contacts"],
  ["cpu", "thermal-paste", "Heat spreader contact"],
  ["thermal-paste", "cpu-cooler", "Cooler base contact"],
  ["cpu-cooler", "cpu-fan", "Fan clips"],
  ["cpu-fan", "motherboard", "4-pin PWM header"],
  ["front-fans", "motherboard", "Fan headers"],
  ["rear-fan", "motherboard", "Fan header"],
  ["motherboard", "vrm", "PCB power planes"],
  ["vrm", "cpu", "Regulated CPU power"],
  ["motherboard", "capacitors", "PCB power planes"],
  ["motherboard", "chipset", "Chipset interconnect"],
  ["motherboard", "ram-slots", "Memory bus"],
  ["ram-slots", "dimm-a", "DDR5 edge connector"],
  ["ram-slots", "dimm-b", "DDR5 edge connector"],
  ["cpu", "ram-slots", "Memory channels"],
  ["motherboard", "m2", "M.2 / PCIe ×4"],
  ["motherboard", "sata-port", "SATA controller"],
  ["sata-port", "sata-data", "7-pin SATA"],
  ["sata-data", "sata-drive", "7-pin SATA"],
  ["motherboard", "pcie-slot", "PCIe lanes"],
  ["pcie-slot", "gpu", "PCIe ×16 edge connector"],
  ["gpu", "display-ports", "Display signal routing"],
  ["psu", "atx-cable", "PSU DC harness"],
  ["atx-cable", "motherboard", "24-pin ATX"],
  ["psu", "eps-cable", "PSU DC harness"],
  ["eps-cable", "vrm", "8-pin EPS"],
  ["psu", "gpu-cable", "PSU DC harness"],
  ["gpu-cable", "gpu", "8-pin PCIe power"],
  ["psu", "sata-power", "PSU DC harness"],
  ["sata-power", "sata-drive", "15-pin SATA power"],
  ["motherboard", "pcie-x1", "PCIe lane"],
  ["pcie-x1", "network-card", "PCIe ×1 edge connector"],
  ["motherboard", "rear-io", "USB / network / audio"],
  ["motherboard", "bios", "SPI bus"],
  ["motherboard", "battery", "RTC battery contacts"],
  ["motherboard", "crystal", "Clock circuitry"],
  ["motherboard", "front-header", "Control signal traces"],
  ["front-header", "power-button", "Switch / LED leads"],
  ["motherboard", "front-io", "Internal USB / audio headers"],
].forEach(([a, b, c]) => connect(a, b, c));
export const CATALOG: readonly Concept[] = concepts;
export const BY_ID = new Map(CATALOG.map((p) => [p.id, p]));
export const SYSTEM_BY_ID = new Map(SYSTEMS.map((s) => [s.id, s]));
