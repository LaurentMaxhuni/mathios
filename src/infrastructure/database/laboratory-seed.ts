import type {
  LaboratoryActivityRecord,
  LaboratoryConfiguration,
  LaboratoryDataType,
  LaboratoryMode,
  LaboratoryStepType,
  LaboratoryVariableRole,
} from "@/domain/laboratory/types";

export interface LaboratorySeedStep {
  id: string;
  type: LaboratoryStepType;
  title: string;
  instructions: string;
  expectedObservation: string;
  sortOrder: number;
  isRequired: boolean;
}

export interface LaboratorySeedVariable {
  id: string;
  key: string;
  label: string;
  symbol: string;
  role: LaboratoryVariableRole;
  dataType: LaboratoryDataType;
  unit: string | null;
  description: string;
  defaultValue: number | string | boolean | null;
  minValue: number | null;
  maxValue: number | null;
  uncertainty: number | null;
  significantFigures: number | null;
  theoreticalValue: number | null;
  configuration: LaboratoryConfiguration;
  sortOrder: number;
}

export interface LaboratorySeedActivity {
  id: string;
  slug: string;
  title: string;
  description: string;
  subjectId: string;
  mode: LaboratoryMode;
  status: LaboratoryActivityRecord["status"];
  objective: string;
  theory: string;
  materials: readonly string[];
  safetyNotes: readonly string[];
  analysisPrompt: string;
  graphingInstructions: string;
  questions: readonly string[];
  conclusionPrompt: string;
  extensionActivity: string;
  simulationId: string | null;
  estimatedDurationMinutes: number;
  steps: readonly LaboratorySeedStep[];
  variables: readonly LaboratorySeedVariable[];
}

const step = (
  id: string,
  type: LaboratoryStepType,
  title: string,
  instructions: string,
  sortOrder: number,
  expectedObservation = "",
  isRequired = true,
): LaboratorySeedStep => ({
  id,
  type,
  title,
  instructions,
  expectedObservation,
  sortOrder,
  isRequired,
});

const variable = (
  id: string,
  key: string,
  label: string,
  role: LaboratoryVariableRole,
  unit: string | null,
  options: Partial<LaboratorySeedVariable> = {},
): LaboratorySeedVariable => ({
  id,
  key,
  label,
  symbol: options.symbol ?? key,
  role,
  dataType: options.dataType ?? "number",
  unit,
  description: options.description ?? "",
  defaultValue: options.defaultValue ?? null,
  minValue: options.minValue ?? null,
  maxValue: options.maxValue ?? null,
  uncertainty: options.uncertainty ?? null,
  significantFigures: options.significantFigures ?? 3,
  theoreticalValue: options.theoreticalValue ?? null,
  configuration: options.configuration ?? {},
  sortOrder: options.sortOrder ?? 0,
});

export const laboratoryActivitySeed: readonly LaboratorySeedActivity[] = [
  {
    id: "laboratory-acceleration-motion-data",
    slug: "determine-acceleration-from-motion-data",
    title: "Determine acceleration from motion data",
    description:
      "Use a motion model or measured time-position pairs to estimate constant acceleration.",
    subjectId: "subject-physics",
    mode: "hybrid",
    status: "published",
    objective:
      "Estimate constant acceleration from a set of position and time measurements, then compare the fitted model with the theoretical equation x = x₀ + v₀t + ½at².",
    theory:
      "For one-dimensional motion with constant acceleration, velocity changes linearly with time and position follows a quadratic relationship. A graph of position against time can be interpreted with a model fit, while a graph of velocity against time has a slope equal to acceleration.",
    materials: [
      "Toy cart or motion sensor",
      "Measuring tape",
      "Stopwatch or phone camera",
      "Flat track",
      "Spreadsheet or graph paper",
    ],
    safetyNotes: [
      "Keep the track clear of feet and bags.",
      "Do not place fingers in front of a moving cart.",
      "Check that the cart cannot fall from the table.",
    ],
    analysisPrompt:
      "Graph position against time and describe the trend. Use the data to estimate acceleration and explain residuals or outliers.",
    graphingInstructions:
      "Plot time on the horizontal axis and position on the vertical axis. Add a smooth trendline and report its fit quality.",
    questions: [
      "What does the slope of a velocity-time graph represent?",
      "Why can timing errors have a larger effect at short times?",
      "Which observation is the strongest outlier and why?",
    ],
    conclusionPrompt:
      "State the measured acceleration, compare it with the expected value, and identify one improvement to the method.",
    extensionActivity:
      "Repeat the experiment with a different starting velocity and compare the fitted acceleration.",
    simulationId: "simulation-one-dimensional-motion",
    estimatedDurationMinutes: 30,
    steps: [
      step(
        "laboratory-acceleration-step-1",
        "setup",
        "Prepare the track",
        "Set the track level and mark a clear starting point. Decide where time zero will be.",
        0,
        "The cart starts from the same location for each run.",
      ),
      step(
        "laboratory-acceleration-step-2",
        "procedure",
        "Collect measurements",
        "Record at least five paired time and position measurements. Keep the units consistent.",
        1,
      ),
      step(
        "laboratory-acceleration-step-3",
        "analysis",
        "Fit the motion model",
        "Graph the data, estimate the trend, and record the fitted acceleration in the data table.",
        2,
      ),
      step(
        "laboratory-acceleration-step-4",
        "conclusion",
        "Write the conclusion",
        "Answer the questions and explain whether the evidence supports constant acceleration.",
        3,
      ),
    ],
    variables: [
      variable("laboratory-acceleration-time", "time", "Time", "independent", "s", {
        symbol: "t",
        minValue: 0,
        maxValue: 20,
        configuration: { simulationKey: "time" },
        sortOrder: 0,
      }),
      variable("laboratory-acceleration-position", "position", "Position", "dependent", "m", {
        symbol: "x",
        minValue: -100,
        maxValue: 100,
        configuration: { simulationKey: "position" },
        sortOrder: 1,
      }),
      variable("laboratory-acceleration-velocity", "velocity", "Velocity", "measured", "m/s", {
        symbol: "v",
        minValue: -100,
        maxValue: 100,
        configuration: { simulationKey: "velocityOut" },
        sortOrder: 2,
      }),
      variable(
        "laboratory-acceleration-estimated",
        "estimated_acceleration",
        "Estimated acceleration",
        "measured",
        "m/s²",
        {
          symbol: "a",
          minValue: -100,
          maxValue: 100,
          uncertainty: 0.1,
          theoreticalValue: 1,
          configuration: { calculation: "regression" },
          sortOrder: 3,
        },
      ),
    ],
  },
  {
    id: "laboratory-pendulum-gravity",
    slug: "estimate-gravitational-acceleration-pendulum",
    title: "Estimate gravitational acceleration using a pendulum",
    description:
      "Measure pendulum periods at several lengths and use the period-length relationship to estimate g.",
    subjectId: "subject-physics",
    mode: "real-world",
    status: "published",
    objective: "Use repeated pendulum timing to estimate the local gravitational acceleration.",
    theory:
      "For small angular amplitudes, the period of a simple pendulum is T = 2π√(L/g). A graph of T² against L should be approximately linear, with gradient 4π²/g.",
    materials: [
      "String",
      "Small dense mass",
      "Meter ruler",
      "Stopwatch",
      "Support stand",
      "Protractor",
    ],
    safetyNotes: [
      "Secure the support before releasing the mass.",
      "Keep the swing area clear.",
      "Use a small angle and do not swing the mass toward people.",
    ],
    analysisPrompt:
      "Calculate the mean period and uncertainty for each length. Graph T² against L and use the gradient to estimate g.",
    graphingInstructions:
      "Plot length L on the horizontal axis and period squared T² on the vertical axis. Include a line of best fit.",
    questions: [
      "Why should the release angle be small?",
      "How does repeating timing reduce random uncertainty?",
      "What systematic error could change every period measurement?",
    ],
    conclusionPrompt: "Report g with uncertainty and compare it with 9.81 m/s².",
    extensionActivity: "Investigate whether changing the bob mass changes the period.",
    simulationId: null,
    estimatedDurationMinutes: 40,
    steps: [
      step(
        "laboratory-pendulum-step-1",
        "setup",
        "Build the pendulum",
        "Measure length from the pivot to the centre of the bob. Keep the support rigid.",
        0,
      ),
      step(
        "laboratory-pendulum-step-2",
        "procedure",
        "Time repeated swings",
        "For each length, time ten complete oscillations at least three times. Divide by ten to find T.",
        1,
      ),
      step(
        "laboratory-pendulum-step-3",
        "analysis",
        "Calculate g",
        "Compute T², draw the graph, and use the gradient to calculate g.",
        2,
      ),
      step(
        "laboratory-pendulum-step-4",
        "conclusion",
        "Evaluate the method",
        "Write the conclusion and identify the largest source of uncertainty.",
        3,
      ),
    ],
    variables: [
      variable("laboratory-pendulum-length", "length", "Pendulum length", "independent", "m", {
        symbol: "L",
        minValue: 0.05,
        maxValue: 5,
        uncertainty: 0.001,
        sortOrder: 0,
      }),
      variable("laboratory-pendulum-period", "period", "Period", "dependent", "s", {
        symbol: "T",
        minValue: 0,
        maxValue: 30,
        uncertainty: 0.05,
        sortOrder: 1,
      }),
      variable(
        "laboratory-pendulum-g",
        "gravity",
        "Gravitational acceleration",
        "measured",
        "m/s²",
        {
          symbol: "g",
          minValue: 0,
          maxValue: 20,
          uncertainty: 0.2,
          theoreticalValue: 9.81,
          configuration: { calculation: "pendulum-gradient" },
          sortOrder: 2,
        },
      ),
      variable("laboratory-pendulum-angle", "angle", "Release angle", "controlled", "°", {
        symbol: "θ",
        minValue: 0,
        maxValue: 20,
        defaultValue: 8,
        sortOrder: 3,
      }),
    ],
  },
  {
    id: "laboratory-ohms-law",
    slug: "verify-ohms-law",
    title: "Verify Ohm's law",
    description:
      "Measure potential difference and current through a resistor to test the linear relationship V = IR.",
    subjectId: "subject-physics",
    mode: "real-world",
    status: "published",
    objective:
      "Determine whether current through a resistor is proportional to potential difference and estimate resistance from the gradient.",
    theory:
      "Ohm's law states that V = IR for an ohmic conductor at constant temperature. A voltage-current graph is linear and its gradient is resistance.",
    materials: [
      "Low-voltage power supply",
      "Resistor",
      "Ammeter",
      "Voltmeter",
      "Switch",
      "Connecting leads",
    ],
    safetyNotes: [
      "Use a low-voltage supply only.",
      "Switch off the circuit before changing connections.",
      "The resistor may become hot; allow it to cool.",
    ],
    analysisPrompt:
      "Graph voltage against current, estimate resistance from the gradient, and discuss whether the graph passes through the origin.",
    graphingInstructions:
      "Plot current I on the horizontal axis and voltage V on the vertical axis. Draw a best-fit line.",
    questions: [
      "Why should the switch be opened between readings?",
      "What does a non-zero intercept suggest?",
      "How would heating change the resistance?",
    ],
    conclusionPrompt:
      "State whether the evidence supports Ohm's law and report the resistance with uncertainty.",
    extensionActivity: "Replace the resistor with a filament lamp and compare the graph shape.",
    simulationId: null,
    estimatedDurationMinutes: 35,
    steps: [
      step(
        "laboratory-ohms-step-1",
        "setup",
        "Build the circuit",
        "Connect the ammeter in series and the voltmeter in parallel across the resistor.",
        0,
      ),
      step(
        "laboratory-ohms-step-2",
        "procedure",
        "Vary the supply",
        "Take at least six pairs of voltage and current readings, starting at the lowest setting.",
        1,
      ),
      step(
        "laboratory-ohms-step-3",
        "analysis",
        "Find the resistance",
        "Plot V against I and calculate the gradient and its uncertainty.",
        2,
      ),
      step(
        "laboratory-ohms-step-4",
        "conclusion",
        "Evaluate Ohm's law",
        "Use the graph and your questions to write a conclusion.",
        3,
      ),
    ],
    variables: [
      variable("laboratory-ohms-current", "current", "Current", "independent", "A", {
        symbol: "I",
        minValue: 0,
        maxValue: 2,
        uncertainty: 0.005,
        configuration: { simulationKey: "current" },
        sortOrder: 0,
      }),
      variable("laboratory-ohms-voltage", "voltage", "Potential difference", "dependent", "V", {
        symbol: "V",
        minValue: 0,
        maxValue: 24,
        uncertainty: 0.05,
        configuration: { simulationKey: "voltage" },
        sortOrder: 1,
      }),
      variable("laboratory-ohms-resistance", "resistance", "Resistance", "measured", "Ω", {
        symbol: "R",
        minValue: 0,
        maxValue: 10000,
        uncertainty: 2,
        theoreticalValue: 100,
        configuration: { calculation: "gradient" },
        sortOrder: 2,
      }),
      variable(
        "laboratory-ohms-temperature",
        "temperature",
        "Resistor temperature",
        "controlled",
        "°C",
        { symbol: "T", minValue: 0, maxValue: 120, sortOrder: 3 },
      ),
    ],
  },
  {
    id: "laboratory-gas-laws",
    slug: "explore-gas-laws",
    title: "Explore gas laws",
    description:
      "Change the state variables of a gas and compare measured amounts with the ideal gas law.",
    subjectId: "subject-chemistry",
    mode: "hybrid",
    status: "published",
    objective:
      "Investigate how pressure, volume, and temperature determine the amount of gas in a closed system.",
    theory:
      "The ideal gas law is PV = nRT. Holding two variables constant makes the relationship between the remaining variables easier to test.",
    materials: [
      "Gas syringe or simulation",
      "Pressure sensor",
      "Thermometer",
      "Water bath",
      "Sealed flask",
      "Spreadsheet",
    ],
    safetyNotes: [
      "Never heat a sealed container without a pressure-rated apparatus.",
      "Use eye protection around glassware.",
      "Do not exceed the pressure range of the sensor.",
    ],
    analysisPrompt:
      "Calculate n for each trial and discuss how closely the values agree. Identify whether pressure, volume, or temperature dominates the uncertainty.",
    graphingInstructions:
      "Choose a controlled relationship such as volume against inverse pressure and label every axis with units.",
    questions: [
      "Why must temperature be measured in kelvin?",
      "Which variables are controlled in your chosen test?",
      "What assumption does the ideal gas model make?",
    ],
    conclusionPrompt: "Describe the relationship you tested and evaluate the ideal-gas prediction.",
    extensionActivity: "Compare a real gas with the ideal model at a higher pressure.",
    simulationId: "simulation-gas-law",
    estimatedDurationMinutes: 30,
    steps: [
      step(
        "laboratory-gas-step-1",
        "setup",
        "Choose a controlled test",
        "Select which two variables will remain fixed and record the range of the changing variable.",
        0,
      ),
      step(
        "laboratory-gas-step-2",
        "procedure",
        "Collect state data",
        "Record pressure, volume, and temperature for at least five states.",
        1,
      ),
      step(
        "laboratory-gas-step-3",
        "analysis",
        "Calculate amount",
        "Use PV = nRT and compare the calculated amount across trials.",
        2,
      ),
      step(
        "laboratory-gas-step-4",
        "conclusion",
        "Explain the model",
        "Write your conclusion and explain one limitation of the ideal-gas assumption.",
        3,
      ),
    ],
    variables: [
      variable("laboratory-gas-temperature", "temperature", "Temperature", "independent", "K", {
        symbol: "T",
        minValue: 1,
        maxValue: 1000,
        configuration: { simulationKey: "temperature" },
        sortOrder: 0,
      }),
      variable("laboratory-g-moles", "moles", "Amount of gas", "dependent", "mol", {
        symbol: "n",
        minValue: 0,
        maxValue: 100,
        uncertainty: 0.01,
        configuration: { simulationKey: "moles" },
        sortOrder: 1,
      }),
      variable("laboratory-gas-pressure", "pressure", "Pressure", "controlled", "atm", {
        symbol: "P",
        minValue: 0.01,
        maxValue: 100,
        defaultValue: 1,
        sortOrder: 2,
      }),
      variable("laboratory-gas-volume", "volume", "Volume", "controlled", "L", {
        symbol: "V",
        minValue: 0.01,
        maxValue: 1000,
        defaultValue: 24.5,
        sortOrder: 3,
      }),
    ],
  },
  {
    id: "laboratory-enzyme-activity",
    slug: "analyze-enzyme-activity",
    title: "Analyze enzyme activity",
    description:
      "Measure or model reaction rate at different temperatures and identify the optimum range.",
    subjectId: "subject-biology",
    mode: "hybrid",
    status: "published",
    objective:
      "Analyze how temperature affects enzyme-catalyzed reaction rate and explain the shape of the activity curve.",
    theory:
      "Increasing temperature raises collision frequency up to an optimum. Above the optimum, bonds maintaining the enzyme's active-site shape are disrupted and rate falls.",
    materials: [
      "Catalase or amylase",
      "Substrate",
      "Water baths",
      "Thermometer",
      "Stopwatch",
      "Gas syringe or colorimeter",
    ],
    safetyNotes: [
      "Wear eye protection and gloves when handling biological materials.",
      "Label all samples clearly.",
      "Clean spills and wash hands after the experiment.",
    ],
    analysisPrompt:
      "Graph rate against temperature, identify the optimum, and distinguish random scatter from the overall biological trend.",
    graphingInstructions:
      "Plot temperature on the horizontal axis and reaction rate on the vertical axis. Use points and a smooth trend line.",
    questions: [
      "Why does the rate initially increase?",
      "What evidence suggests denaturation?",
      "How could pH be controlled in a follow-up experiment?",
    ],
    conclusionPrompt: "Describe the temperature response and support your explanation with data.",
    extensionActivity:
      "Repeat at several pH values and compare the optimum pH with the optimum temperature.",
    simulationId: "simulation-enzyme-activity",
    estimatedDurationMinutes: 35,
    steps: [
      step(
        "laboratory-enzyme-step-1",
        "setup",
        "Prepare temperature conditions",
        "Prepare at least five temperature conditions and keep substrate concentration constant.",
        0,
      ),
      step(
        "laboratory-enzyme-step-2",
        "procedure",
        "Measure rate",
        "Start each reaction consistently and record product formation per unit time.",
        1,
      ),
      step(
        "laboratory-enzyme-step-3",
        "analysis",
        "Find the optimum",
        "Graph rate against temperature and estimate the temperature of maximum activity.",
        2,
      ),
      step(
        "laboratory-enzyme-step-4",
        "conclusion",
        "Explain the curve",
        "Use enzyme structure and collision theory to explain your conclusion.",
        3,
      ),
    ],
    variables: [
      variable("laboratory-enzyme-temperature", "temperature", "Temperature", "independent", "°C", {
        symbol: "T",
        minValue: 0,
        maxValue: 100,
        configuration: { simulationKey: "temperature" },
        sortOrder: 0,
      }),
      variable("laboratory-enzyme-rate", "rate", "Reaction rate", "dependent", null, {
        symbol: "v",
        minValue: 0,
        maxValue: 1000,
        uncertainty: 0.1,
        configuration: { simulationKey: "rate" },
        sortOrder: 1,
      }),
      variable(
        "laboratory-enzyme-substrate",
        "substrate",
        "Substrate concentration",
        "controlled",
        "mM",
        { symbol: "[S]", minValue: 0, maxValue: 100, defaultValue: 5, sortOrder: 2 },
      ),
      variable("laboratory-enzyme-ph", "pH", "pH", "controlled", null, {
        symbol: "pH",
        minValue: 0,
        maxValue: 14,
        defaultValue: 7,
        sortOrder: 3,
      }),
    ],
  },
  {
    id: "laboratory-planetary-periods",
    slug: "model-planetary-orbital-periods",
    title: "Model planetary orbital periods",
    description:
      "Use orbital data to explore Kepler's third law and compare period with semi-major axis.",
    subjectId: "subject-astronomy",
    mode: "simulated",
    status: "published",
    objective:
      "Investigate how orbital period depends on semi-major axis and test the proportionality T² ∝ a³.",
    theory:
      "For objects orbiting the same central mass, Kepler's third law states that T²/a³ is approximately constant.",
    materials: ["Planetary orbit simulation", "Planet data table", "Calculator", "Graphing tool"],
    safetyNotes: [
      "This is a computer model; record the assumptions made by the model.",
      "Use consistent units for period and distance.",
    ],
    analysisPrompt:
      "Calculate T² and a³, graph them, and judge whether the relationship is consistent with Kepler's third law.",
    graphingInstructions:
      "Plot a³ on the horizontal axis and T² on the vertical axis. Compare the gradient for more than one orbit.",
    questions: [
      "Why do planets farther from the Sun take longer to orbit?",
      "Which model assumptions are hidden in the simulation?",
      "How would an eccentric orbit affect the interpretation?",
    ],
    conclusionPrompt: "Use the graph to conclude whether the model supports Kepler's third law.",
    extensionActivity:
      "Change eccentricity and compare instantaneous distance with the average orbital period.",
    simulationId: "simulation-planetary-orbit",
    estimatedDurationMinutes: 25,
    steps: [
      step(
        "laboratory-planetary-step-1",
        "setup",
        "Set model parameters",
        "Choose a semi-major axis and eccentricity, then note the model assumptions.",
        0,
      ),
      step(
        "laboratory-planetary-step-2",
        "procedure",
        "Record orbital states",
        "Record phase, distance, and any calculated period for several model runs.",
        1,
      ),
      step(
        "laboratory-planetary-step-3",
        "analysis",
        "Test the law",
        "Transform the variables to T² and a³, then inspect the relationship.",
        2,
      ),
      step(
        "laboratory-planetary-step-4",
        "conclusion",
        "Explain the pattern",
        "Connect the pattern to gravitational attraction and orbital size.",
        3,
      ),
    ],
    variables: [
      variable("laboratory-planetary-time", "time", "Orbital phase", "independent", null, {
        symbol: "t",
        minValue: 0,
        maxValue: 1,
        configuration: { simulationKey: "time" },
        sortOrder: 0,
      }),
      variable("laboratory-planetary-distance", "distance", "Orbital distance", "dependent", "AU", {
        symbol: "r",
        minValue: 0,
        maxValue: 100,
        uncertainty: 0.01,
        configuration: { simulationKey: "distance" },
        sortOrder: 1,
      }),
      variable(
        "laboratory-planetary-semi-major",
        "semi_major_axis",
        "Semi-major axis",
        "controlled",
        "AU",
        { symbol: "a", minValue: 0, maxValue: 100, defaultValue: 1, sortOrder: 2 },
      ),
      variable("laboratory-planetary-period", "period", "Orbital period", "measured", "year", {
        symbol: "T",
        minValue: 0,
        maxValue: 1000,
        theoreticalValue: 1,
        configuration: { calculation: "kepler" },
        sortOrder: 3,
      }),
    ],
  },
  {
    id: "laboratory-planck-led-data",
    slug: "estimate-plancks-constant-led-data",
    title: "Estimate Planck's constant using LED data",
    description: "Use LED threshold voltages and wavelengths to estimate Planck's constant.",
    subjectId: "subject-physics",
    mode: "real-world",
    status: "published",
    objective:
      "Estimate Planck's constant from the relationship between LED threshold voltage and emitted wavelength.",
    theory:
      "A photon has energy E = hf. At threshold, the electrical energy eV is approximately equal to photon energy hc/λ, so V is proportional to 1/λ.",
    materials: [
      "LEDs of different colours",
      "Variable low-voltage supply",
      "Resistor",
      "Multimeter",
      "LED wavelength data",
      "Protective glasses",
    ],
    safetyNotes: [
      "Always use a current-limiting resistor.",
      "Do not exceed the rated current of an LED.",
      "Disconnect the supply before rewiring.",
    ],
    analysisPrompt:
      "Graph threshold voltage against reciprocal wavelength. Use the gradient and known constants to estimate h.",
    graphingInstructions:
      "Plot 1/λ on the horizontal axis and threshold voltage on the vertical axis. Include uncertainty bars if available.",
    questions: [
      "Why is a resistor needed in series with the LED?",
      "What does the intercept represent physically?",
      "Why is threshold voltage only an approximation to photon energy?",
    ],
    conclusionPrompt:
      "Report your estimate of Planck's constant and compare it with 6.626 × 10⁻³⁴ J·s.",
    extensionActivity:
      "Compare LEDs from different manufacturers and investigate the effect of temperature.",
    simulationId: null,
    estimatedDurationMinutes: 45,
    steps: [
      step(
        "laboratory-planck-step-1",
        "setup",
        "Prepare the circuit",
        "Connect one LED with a current-limiting resistor and check polarity before switching on.",
        0,
      ),
      step(
        "laboratory-planck-step-2",
        "procedure",
        "Find threshold voltage",
        "Slowly raise the supply until each LED just begins to emit light, then record voltage and wavelength.",
        1,
      ),
      step(
        "laboratory-planck-step-3",
        "analysis",
        "Estimate h",
        "Graph voltage against reciprocal wavelength and use the gradient to estimate Planck's constant.",
        2,
      ),
      step(
        "laboratory-planck-step-4",
        "conclusion",
        "Evaluate the estimate",
        "Discuss threshold subjectivity and other uncertainty sources.",
        3,
      ),
    ],
    variables: [
      variable("laboratory-planck-wavelength", "wavelength", "Wavelength", "independent", "nm", {
        symbol: "λ",
        minValue: 300,
        maxValue: 1000,
        uncertainty: 5,
        sortOrder: 0,
      }),
      variable("laboratory-planck-voltage", "voltage", "Threshold voltage", "dependent", "V", {
        symbol: "V",
        minValue: 0,
        maxValue: 10,
        uncertainty: 0.02,
        sortOrder: 1,
      }),
      variable("laboratory-planck-h", "planck_constant", "Planck's constant", "measured", "J·s", {
        symbol: "h",
        minValue: 0,
        maxValue: 1e-33,
        uncertainty: 1e-35,
        theoreticalValue: 6.626e-34,
        configuration: { calculation: "led-gradient" },
        sortOrder: 2,
      }),
      variable("laboratory-planck-current", "current", "LED current", "controlled", "mA", {
        symbol: "I",
        minValue: 0,
        maxValue: 50,
        defaultValue: 10,
        sortOrder: 3,
      }),
    ],
  },
] as const;
