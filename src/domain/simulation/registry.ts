import type {
  SimulationDefinition,
  SimulationFrame,
  SimulationSubject,
} from "@/domain/simulation/types";
import { defaultInputs } from "@/domain/simulation/rules";

const number = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const frame = (
  time: number,
  values: Record<string, number | string>,
  series: Record<string, { x: number; y: number }[]> = {},
  table: Record<string, number | string>[] = [],
): SimulationFrame => ({ time, values, series, table });
const simpleValidation = () => [] as readonly string[];
const preset = (name: string, values: Record<string, number | boolean | string>) => ({
  name,
  values,
  isDefault: true,
});

function definition(
  config: Omit<SimulationDefinition, "initialState" | "step" | "frame" | "validate"> &
    Partial<Pick<SimulationDefinition, "initialState" | "step" | "frame" | "validate">>,
): SimulationDefinition {
  const inputs = config.inputs;
  return {
    ...config,
    initialState: config.initialState ?? ((values) => ({ time: number(values.time) })),
    step:
      config.step ??
      ((state, _values, deltaSeconds) => ({ ...state, time: state.time + deltaSeconds })),
    frame:
      config.frame ??
      ((state, values) => frame(state.time, values as Record<string, number | string>)),
    validate: config.validate ?? simpleValidation,
    inputs,
  };
}

const math: SimulationDefinition[] = [
  definition({
    id: "simulation-function-transformations",
    slug: "function-transformations",
    title: "Function transformation explorer",
    description: "See how shifts and stretches change a function's graph.",
    subject: "mathematics",
    estimatedDurationMinutes: 12,
    inputs: [
      {
        key: "a",
        label: "Vertical scale",
        type: "range",
        defaultValue: 1,
        min: -3,
        max: 3,
        step: 0.1,
      },
      {
        key: "b",
        label: "Vertical shift",
        type: "range",
        defaultValue: 0,
        min: -5,
        max: 5,
        step: 0.5,
      },
      { key: "x", label: "Probe x", type: "number", defaultValue: 1, min: -5, max: 5, step: 0.1 },
    ],
    outputs: [
      { key: "y", label: "f(x)", type: "value" },
      { key: "graph", label: "Transformed graph", type: "line" },
    ],
    presets: [
      preset("Identity", { a: 1, b: 0, x: 1 }),
      preset("Reflection", { a: -1, b: 0, x: 1 }),
    ],
    guidedTasks: [
      {
        id: "reflection",
        title: "Reflect the graph",
        instruction: "Set the vertical scale to -1.",
        targetInput: "a",
        targetValue: -1,
        tolerance: 0.05,
      },
    ],
    frame: (state, values) => {
      const a = number(values.a, 1);
      const b = number(values.b);
      const x = number(values.x);
      return frame(
        state.time,
        { y: a * x * x + b },
        {
          graph: Array.from({ length: 21 }, (_, i) => {
            const point = i / 2 - 5;
            return { x: point, y: a * point * point + b };
          }),
        },
      );
    },
  }),
  definition({
    id: "simulation-unit-circle",
    slug: "unit-circle",
    title: "Unit-circle explorer",
    description: "Connect angle, coordinates, and trigonometric ratios.",
    subject: "mathematics",
    estimatedDurationMinutes: 10,
    inputs: [
      {
        key: "angle",
        label: "Angle",
        type: "range",
        defaultValue: 45,
        min: 0,
        max: 360,
        step: 1,
        unit: "°",
      },
    ],
    outputs: [
      { key: "cos", label: "cos θ", type: "value" },
      { key: "sin", label: "sin θ", type: "value" },
      { key: "circle", label: "Point on circle", type: "line" },
    ],
    presets: [preset("First quadrant", { angle: 45 })],
    guidedTasks: [
      {
        id: "quarter-turn",
        title: "Quarter turn",
        instruction: "Set the angle to 90°.",
        targetInput: "angle",
        targetValue: 90,
        tolerance: 1,
      },
    ],
    frame: (state, values) => {
      const radians = (number(values.angle) * Math.PI) / 180;
      return frame(
        state.time,
        { cos: Math.cos(radians), sin: Math.sin(radians) },
        {
          circle: [
            { x: 0, y: 0 },
            { x: Math.cos(radians), y: Math.sin(radians) },
          ],
        },
      );
    },
  }),
  definition({
    id: "simulation-vector-components",
    slug: "vector-components",
    title: "Vector-components explorer",
    description: "Decompose a vector into perpendicular components.",
    subject: "mathematics",
    estimatedDurationMinutes: 10,
    inputs: [
      {
        key: "magnitude",
        label: "Magnitude",
        type: "range",
        defaultValue: 5,
        min: 0,
        max: 10,
        step: 0.1,
      },
      {
        key: "angle",
        label: "Direction",
        type: "range",
        defaultValue: 30,
        min: -180,
        max: 180,
        step: 1,
        unit: "°",
      },
    ],
    outputs: [
      { key: "x", label: "x component", type: "value" },
      { key: "y", label: "y component", type: "value" },
    ],
    presets: [preset("3-4-5 vector", { magnitude: 5, angle: 53.13 })],
    guidedTasks: [],
    frame: (state, values) => {
      const radians = (number(values.angle) * Math.PI) / 180;
      return frame(state.time, {
        x: number(values.magnitude, 5) * Math.cos(radians),
        y: number(values.magnitude, 5) * Math.sin(radians),
      });
    },
  }),
];

const physics: SimulationDefinition[] = [
  definition({
    id: "simulation-one-dimensional-motion",
    slug: "one-dimensional-motion",
    title: "One-dimensional motion",
    description: "Watch position and velocity evolve under constant acceleration.",
    subject: "physics",
    estimatedDurationMinutes: 15,
    inputs: [
      {
        key: "velocity",
        label: "Initial velocity",
        type: "range",
        defaultValue: 2,
        min: -10,
        max: 10,
        step: 0.5,
        unit: "m/s",
      },
      {
        key: "acceleration",
        label: "Acceleration",
        type: "range",
        defaultValue: 1,
        min: -5,
        max: 5,
        step: 0.1,
        unit: "m/s²",
      },
      {
        key: "time",
        label: "Duration",
        type: "range",
        defaultValue: 4,
        min: 0,
        max: 10,
        step: 0.5,
        unit: "s",
      },
    ],
    outputs: [
      { key: "position", label: "Position", type: "value", unit: "m" },
      { key: "velocityOut", label: "Velocity", type: "value", unit: "m/s" },
      { key: "motion", label: "Position-time", type: "line" },
    ],
    presets: [preset("Rest then accelerate", { velocity: 0, acceleration: 2, time: 4 })],
    guidedTasks: [
      {
        id: "double-time",
        title: "Double the time",
        instruction: "Set duration to 8 seconds.",
        targetInput: "time",
        targetValue: 8,
        tolerance: 0.1,
      },
    ],
    initialState: () => ({ time: 0 }),
    step: (state, values, delta) => ({
      time: Math.min(number(values.time, 4), state.time + delta),
    }),
    frame: (state, values) => {
      const t = state.time;
      const v = number(values.velocity, 2);
      const a = number(values.acceleration, 1);
      return frame(
        t,
        { position: v * t + 0.5 * a * t * t, velocityOut: v + a * t },
        {
          motion: Array.from({ length: 21 }, (_, i) => {
            const x = (number(values.time, 4) * i) / 20;
            return { x, y: v * x + 0.5 * a * x * x };
          }),
        },
      );
    },
  }),
  definition({
    id: "simulation-projectile-motion",
    slug: "projectile-motion",
    title: "Projectile motion",
    description:
      "Explore the trajectory of a projectile launched through a uniform gravitational field.",
    subject: "physics",
    estimatedDurationMinutes: 15,
    inputs: [
      {
        key: "speed",
        label: "Launch speed",
        type: "range",
        defaultValue: 18,
        min: 1,
        max: 40,
        step: 1,
        unit: "m/s",
      },
      {
        key: "angle",
        label: "Launch angle",
        type: "range",
        defaultValue: 45,
        min: 5,
        max: 85,
        step: 1,
        unit: "°",
      },
      {
        key: "time",
        label: "Time",
        type: "range",
        defaultValue: 1,
        min: 0,
        max: 5,
        step: 0.1,
        unit: "s",
      },
    ],
    outputs: [
      { key: "x", label: "Horizontal range", type: "value", unit: "m" },
      { key: "y", label: "Height", type: "value", unit: "m" },
      { key: "trajectory", label: "Trajectory", type: "line" },
    ],
    presets: [preset("Maximum range", { speed: 18, angle: 45, time: 1 })],
    guidedTasks: [],
    frame: (state, values) => {
      const t = state.time || number(values.time, 1);
      const angle = (number(values.angle, 45) * Math.PI) / 180;
      const speed = number(values.speed, 18);
      const x = speed * Math.cos(angle) * t;
      const y = Math.max(0, speed * Math.sin(angle) * t - 4.9 * t * t);
      return frame(
        t,
        { x, y },
        {
          trajectory: Array.from({ length: 21 }, (_, i) => {
            const q = (t * i) / 20;
            return {
              x: speed * Math.cos(angle) * q,
              y: Math.max(0, speed * Math.sin(angle) * q - 4.9 * q * q),
            };
          }),
        },
      );
    },
  }),
  definition({
    id: "simulation-force-mass-acceleration",
    slug: "force-mass-acceleration",
    title: "Force, mass, and acceleration",
    description: "Change two quantities and observe Newton's second law.",
    subject: "physics",
    estimatedDurationMinutes: 8,
    inputs: [
      {
        key: "force",
        label: "Force",
        type: "range",
        defaultValue: 10,
        min: 0,
        max: 50,
        step: 1,
        unit: "N",
      },
      {
        key: "mass",
        label: "Mass",
        type: "range",
        defaultValue: 2,
        min: 0.1,
        max: 20,
        step: 0.1,
        unit: "kg",
      },
    ],
    outputs: [{ key: "acceleration", label: "Acceleration", type: "value", unit: "m/s²" }],
    presets: [preset("Balanced", { force: 10, mass: 2 })],
    guidedTasks: [],
    frame: (state, values) =>
      frame(state.time, {
        acceleration: number(values.force) / Math.max(0.1, number(values.mass, 2)),
      }),
  }),
  definition({
    id: "simulation-energy-conservation",
    slug: "energy-conservation",
    title: "Energy conservation",
    description: "Trade gravitational potential energy for kinetic energy.",
    subject: "physics",
    estimatedDurationMinutes: 12,
    inputs: [
      {
        key: "mass",
        label: "Mass",
        type: "range",
        defaultValue: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
        unit: "kg",
      },
      {
        key: "height",
        label: "Height",
        type: "range",
        defaultValue: 5,
        min: 0,
        max: 20,
        step: 0.5,
        unit: "m",
      },
      {
        key: "speed",
        label: "Speed",
        type: "range",
        defaultValue: 4,
        min: 0,
        max: 20,
        step: 0.5,
        unit: "m/s",
      },
    ],
    outputs: [
      { key: "potential", label: "Potential energy", type: "value", unit: "J" },
      { key: "kinetic", label: "Kinetic energy", type: "value", unit: "J" },
      { key: "total", label: "Total energy", type: "value", unit: "J" },
    ],
    presets: [preset("Drop", { mass: 1, height: 10, speed: 0 })],
    guidedTasks: [],
    frame: (state, values) => {
      const m = number(values.mass, 1);
      const potential = m * 9.81 * number(values.height, 5);
      const kinetic = 0.5 * m * number(values.speed) ** 2;
      return frame(state.time, { potential, kinetic, total: potential + kinetic });
    },
  }),
  definition({
    id: "simulation-orbital-motion",
    slug: "orbital-motion",
    title: "Orbital motion",
    description: "Plot a simple circular orbit and compare angular speed.",
    subject: "physics",
    estimatedDurationMinutes: 14,
    inputs: [
      {
        key: "radius",
        label: "Orbit radius",
        type: "range",
        defaultValue: 5,
        min: 1,
        max: 10,
        step: 0.5,
        unit: "units",
      },
      {
        key: "period",
        label: "Period",
        type: "range",
        defaultValue: 6,
        min: 1,
        max: 20,
        step: 0.5,
        unit: "s",
      },
      {
        key: "time",
        label: "Time",
        type: "range",
        defaultValue: 1,
        min: 0,
        max: 20,
        step: 0.1,
        unit: "s",
      },
    ],
    outputs: [
      { key: "x", label: "x position", type: "value" },
      { key: "y", label: "y position", type: "value" },
    ],
    presets: [preset("Low orbit", { radius: 3, period: 4, time: 1 })],
    guidedTasks: [],
    frame: (state, values) => {
      const radius = number(values.radius, 5);
      const angle =
        (2 * Math.PI * (state.time || number(values.time, 1))) / number(values.period, 6);
      return frame(
        state.time,
        { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
        {
          orbit: Array.from({ length: 25 }, (_, i) => ({
            x: radius * Math.cos((2 * Math.PI * i) / 24),
            y: radius * Math.sin((2 * Math.PI * i) / 24),
          })),
        },
      );
    },
  }),
];

const chemistry: SimulationDefinition[] = [
  definition({
    id: "simulation-gas-law",
    slug: "gas-law",
    title: "Gas-law explorer",
    description:
      "Explore the relationship between pressure, volume, temperature, and amount of gas.",
    subject: "chemistry",
    estimatedDurationMinutes: 12,
    inputs: [
      {
        key: "pressure",
        label: "Pressure",
        type: "range",
        defaultValue: 1,
        min: 0.1,
        max: 5,
        step: 0.1,
        unit: "atm",
      },
      {
        key: "volume",
        label: "Volume",
        type: "range",
        defaultValue: 10,
        min: 1,
        max: 50,
        step: 1,
        unit: "L",
      },
      {
        key: "temperature",
        label: "Temperature",
        type: "range",
        defaultValue: 300,
        min: 100,
        max: 600,
        step: 10,
        unit: "K",
      },
    ],
    outputs: [{ key: "moles", label: "Amount", type: "value", unit: "mol" }],
    presets: [preset("Room conditions", { pressure: 1, volume: 24.5, temperature: 300 })],
    guidedTasks: [],
    frame: (state, values) =>
      frame(state.time, {
        moles:
          (number(values.pressure) * number(values.volume, 10)) /
          (0.0821 * number(values.temperature, 300)),
      }),
  }),
  definition({
    id: "simulation-reaction-balancing",
    slug: "reaction-balancing",
    title: "Reaction balancing",
    description: "Adjust coefficients to conserve atoms in a model reaction.",
    subject: "chemistry",
    estimatedDurationMinutes: 10,
    inputs: [
      {
        key: "hydrogen",
        label: "Hydrogen coefficient",
        type: "range",
        defaultValue: 2,
        min: 1,
        max: 6,
        step: 1,
      },
      {
        key: "oxygen",
        label: "Oxygen coefficient",
        type: "range",
        defaultValue: 1,
        min: 1,
        max: 4,
        step: 1,
      },
    ],
    outputs: [
      { key: "equation", label: "Model equation", type: "text" },
      { key: "balanced", label: "Balanced", type: "value" },
    ],
    presets: [preset("Water formation", { hydrogen: 2, oxygen: 1 })],
    guidedTasks: [
      {
        id: "balance",
        title: "Balance water",
        instruction: "Use 2 H₂ and 1 O₂.",
        targetInput: "hydrogen",
        targetValue: 2,
        tolerance: 0.1,
      },
    ],
    frame: (state, values) => {
      const h = number(values.hydrogen, 2);
      const o = number(values.oxygen, 1);
      return frame(state.time, {
        equation: `${h} H₂ + ${o} O₂ → ${2 * Math.min(h / 2, o)} H₂O`,
        balanced: h === 2 && o === 1 ? 1 : 0,
      });
    },
  }),
  definition({
    id: "simulation-acid-base-titration",
    slug: "acid-base-titration",
    title: "Acid-base titration model",
    description: "Add titrant and see the pH curve move through equivalence.",
    subject: "chemistry",
    estimatedDurationMinutes: 15,
    inputs: [
      {
        key: "acidConcentration",
        label: "Acid concentration",
        type: "range",
        defaultValue: 0.1,
        min: 0.01,
        max: 1,
        step: 0.01,
        unit: "M",
      },
      {
        key: "baseVolume",
        label: "Base volume added",
        type: "range",
        defaultValue: 10,
        min: 0,
        max: 30,
        step: 0.5,
        unit: "mL",
      },
    ],
    outputs: [
      { key: "pH", label: "Approximate pH", type: "value" },
      { key: "curve", label: "Titration curve", type: "line" },
    ],
    presets: [preset("Half-equivalence", { acidConcentration: 0.1, baseVolume: 5 })],
    guidedTasks: [],
    frame: (state, values) => {
      const pH = Math.max(1, Math.min(14, 7 + (number(values.baseVolume, 10) - 10) / 2));
      return frame(
        state.time,
        { pH },
        {
          curve: Array.from({ length: 21 }, (_, i) => ({
            x: i * 1.5,
            y: Math.max(1, Math.min(14, 7 + (i * 1.5 - 10) / 2)),
          })),
        },
      );
    },
  }),
];

const biology: SimulationDefinition[] = [
  definition({
    id: "simulation-punnett-square",
    slug: "punnett-square",
    title: "Punnett-square simulator",
    description: "Model inheritance probabilities for a single gene.",
    subject: "biology",
    estimatedDurationMinutes: 10,
    inputs: [
      {
        key: "dominantParent",
        label: "Dominant allele chance",
        type: "range",
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
      },
    ],
    outputs: [
      { key: "dominant", label: "Dominant phenotype", type: "value", unit: "%" },
      { key: "recessive", label: "Recessive phenotype", type: "value", unit: "%" },
      { key: "grid", label: "Punnett grid", type: "table" },
    ],
    presets: [preset("Two heterozygous parents", { dominantParent: 0.5 })],
    guidedTasks: [],
    frame: (state, values) => {
      const p = number(values.dominantParent, 0.5);
      return frame(
        state.time,
        { dominant: (1 - (1 - p) ** 2) * 100, recessive: (1 - p) ** 2 * 100 },
        {},
        [
          { cross: "A × a", outcome: "Dominant" },
          { cross: "a × a", outcome: "Recessive" },
        ],
      );
    },
  }),
  definition({
    id: "simulation-enzyme-activity",
    slug: "enzyme-activity",
    title: "Enzyme activity",
    description: "See how temperature changes a simple enzyme activity curve.",
    subject: "biology",
    estimatedDurationMinutes: 12,
    inputs: [
      {
        key: "temperature",
        label: "Temperature",
        type: "range",
        defaultValue: 37,
        min: 0,
        max: 80,
        step: 1,
        unit: "°C",
      },
      {
        key: "substrate",
        label: "Substrate",
        type: "range",
        defaultValue: 5,
        min: 0,
        max: 10,
        step: 0.5,
        unit: "mM",
      },
    ],
    outputs: [
      { key: "rate", label: "Relative rate", type: "value" },
      { key: "curve", label: "Activity curve", type: "line" },
    ],
    presets: [preset("Human enzyme", { temperature: 37, substrate: 5 })],
    guidedTasks: [],
    frame: (state, values) => {
      const temperature = number(values.temperature, 37);
      const rate = Math.max(0, number(values.substrate, 5) * (1 - Math.abs(temperature - 37) / 50));
      return frame(
        state.time,
        { rate },
        {
          curve: Array.from({ length: 21 }, (_, i) => ({
            x: i * 4,
            y: Math.max(0, 1 - Math.abs(i * 4 - 37) / 50),
          })),
        },
      );
    },
  }),
  definition({
    id: "simulation-population-growth",
    slug: "population-growth",
    title: "Population growth",
    description: "Compare exponential growth at different rates.",
    subject: "biology",
    estimatedDurationMinutes: 10,
    inputs: [
      {
        key: "initial",
        label: "Initial population",
        type: "number",
        defaultValue: 100,
        min: 1,
        max: 10000,
        step: 10,
      },
      {
        key: "growthRate",
        label: "Growth rate",
        type: "range",
        defaultValue: 0.2,
        min: -0.5,
        max: 1,
        step: 0.05,
        unit: "/t",
      },
      { key: "time", label: "Time", type: "range", defaultValue: 5, min: 0, max: 20, step: 0.5 },
    ],
    outputs: [
      { key: "population", label: "Population", type: "value" },
      { key: "curve", label: "Growth curve", type: "line" },
    ],
    presets: [preset("Steady growth", { initial: 100, growthRate: 0.2, time: 5 })],
    guidedTasks: [],
    frame: (state, values) => {
      const initial = number(values.initial, 100);
      const rate = number(values.growthRate, 0.2);
      const t = state.time || number(values.time, 5);
      return frame(
        t,
        { population: initial * Math.exp(rate * t) },
        {
          curve: Array.from({ length: 21 }, (_, i) => ({
            x: (t * i) / 20,
            y: initial * Math.exp((rate * t * i) / 20),
          })),
        },
      );
    },
  }),
];

const astronomy: SimulationDefinition[] = [
  definition({
    id: "simulation-planetary-orbit",
    slug: "planetary-orbit",
    title: "Planetary orbit explorer",
    description: "Explore orbital shape and position around a star.",
    subject: "astronomy",
    estimatedDurationMinutes: 15,
    inputs: [
      {
        key: "semiMajor",
        label: "Semi-major axis",
        type: "range",
        defaultValue: 5,
        min: 1,
        max: 10,
        step: 0.5,
        unit: "AU",
      },
      {
        key: "eccentricity",
        label: "Eccentricity",
        type: "range",
        defaultValue: 0.2,
        min: 0,
        max: 0.8,
        step: 0.05,
      },
      {
        key: "time",
        label: "Orbital phase",
        type: "range",
        defaultValue: 0.25,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
    outputs: [
      { key: "distance", label: "Distance", type: "value", unit: "AU" },
      { key: "orbit", label: "Orbit", type: "line" },
    ],
    presets: [preset("Earth-like", { semiMajor: 1, eccentricity: 0.017, time: 0.25 })],
    guidedTasks: [],
    frame: (state, values) => {
      const a = number(values.semiMajor, 5);
      const e = number(values.eccentricity, 0.2);
      const phase = 2 * Math.PI * (state.time || number(values.time, 0.25));
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(phase));
      return frame(
        state.time,
        { distance: r },
        {
          orbit: Array.from({ length: 25 }, (_, i) => {
            const p = (2 * Math.PI * i) / 24;
            const radius = (a * (1 - e * e)) / (1 + e * Math.cos(p));
            return { x: radius * Math.cos(p), y: radius * Math.sin(p) };
          }),
        },
      );
    },
  }),
  definition({
    id: "simulation-moon-phases",
    slug: "moon-phases",
    title: "Moon phases",
    description: "Change the Moon's orbital angle to model illuminated fraction.",
    subject: "astronomy",
    estimatedDurationMinutes: 8,
    inputs: [
      {
        key: "angle",
        label: "Orbital angle",
        type: "range",
        defaultValue: 0,
        min: 0,
        max: 360,
        step: 1,
        unit: "°",
      },
    ],
    outputs: [
      { key: "illumination", label: "Illuminated fraction", type: "value", unit: "%" },
      { key: "phase", label: "Phase", type: "text" },
    ],
    presets: [preset("Full moon", { angle: 180 })],
    guidedTasks: [],
    frame: (state, values) => {
      const angle = number(values.angle);
      const illumination = (1 - Math.cos((angle * Math.PI) / 180)) / 2;
      const phase =
        illumination < 0.05
          ? "New moon"
          : illumination > 0.95
            ? "Full moon"
            : illumination < 0.5
              ? "Crescent"
              : "Quarter / gibbous";
      return frame(state.time, { illumination: illumination * 100, phase });
    },
  }),
  definition({
    id: "simulation-stellar-spectrum",
    slug: "stellar-spectrum",
    title: "Stellar spectrum explorer",
    description: "Compare the peak wavelength of stars at different temperatures.",
    subject: "astronomy",
    estimatedDurationMinutes: 12,
    inputs: [
      {
        key: "temperature",
        label: "Star temperature",
        type: "range",
        defaultValue: 5800,
        min: 2500,
        max: 15000,
        step: 100,
        unit: "K",
      },
    ],
    outputs: [
      { key: "peakWavelength", label: "Peak wavelength", type: "value", unit: "nm" },
      { key: "spectrum", label: "Spectrum", type: "line" },
    ],
    presets: [preset("Sun-like", { temperature: 5800 })],
    guidedTasks: [],
    frame: (state, values) => {
      const temperature = number(values.temperature, 5800);
      const peak = 2_897_771 / temperature;
      return frame(
        state.time,
        { peakWavelength: peak },
        {
          spectrum: Array.from({ length: 21 }, (_, i) => ({
            x: 300 + i * 35,
            y: Math.exp(-((300 + i * 35 - peak) ** 2) / (2 * 5000)),
          })),
        },
      );
    },
  }),
];

export const simulationRegistry: readonly SimulationDefinition[] = [
  ...math,
  ...physics,
  ...chemistry,
  ...biology,
  ...astronomy,
];
export function getRegisteredSimulation(idOrSlug: string): SimulationDefinition | null {
  return (
    simulationRegistry.find(
      (simulation) => simulation.id === idOrSlug || simulation.slug === idOrSlug,
    ) ?? null
  );
}
export function listRegisteredSimulations(
  subject?: SimulationSubject,
): readonly SimulationDefinition[] {
  return subject
    ? simulationRegistry.filter((simulation) => simulation.subject === subject)
    : simulationRegistry;
}
export function publicSimulationDefinition(definition: SimulationDefinition) {
  return {
    ...definition,
    initialState: undefined,
    step: undefined,
    frame: undefined,
    validate: undefined,
    defaultInputs: defaultInputs(definition),
  };
}
