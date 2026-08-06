export interface MetricLabels {
  [key: string]: string | number | boolean | undefined;
}

export interface MetricsSnapshot {
  generatedAt: string;
  counters: readonly {
    name: string;
    labels: MetricLabels;
    value: number;
  }[];
  process: {
    uptimeSeconds: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
  };
}

interface Counter {
  name: string;
  labels: MetricLabels;
  value: number;
}

const counters = new Map<string, Counter>();

export function incrementMetric(name: string, labels: MetricLabels = {}, value = 1): void {
  const normalizedLabels = Object.fromEntries(
    Object.entries(labels)
      .filter(([, labelValue]) => labelValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const key = `${name}:${JSON.stringify(normalizedLabels)}`;
  const counter = counters.get(key) ?? { name, labels: normalizedLabels, value: 0 };
  counter.value += value;
  counters.set(key, counter);
}

export function recordHttpRequest(input: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}): void {
  incrementMetric("mathios_http_requests_total", {
    method: input.method,
    path: normalizeMetricPath(input.path),
    status: input.status,
  });
  incrementMetric(
    "mathios_http_request_duration_ms_total",
    {
      method: input.method,
      path: normalizeMetricPath(input.path),
    },
    input.durationMs,
  );
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const memory = process.memoryUsage();
  return {
    generatedAt: new Date().toISOString(),
    counters: [...counters.values()].sort((left, right) => left.name.localeCompare(right.name)),
    process: {
      uptimeSeconds: Math.round(process.uptime()),
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
    },
  };
}

export function renderPrometheusMetrics(snapshot = getMetricsSnapshot()): string {
  const lines = [
    "# HELP mathios_process_uptime_seconds Process uptime in seconds.",
    "# TYPE mathios_process_uptime_seconds gauge",
    `mathios_process_uptime_seconds ${snapshot.process.uptimeSeconds}`,
    "# HELP mathios_process_heap_used_bytes Process heap used in bytes.",
    "# TYPE mathios_process_heap_used_bytes gauge",
    `mathios_process_heap_used_bytes ${snapshot.process.heapUsedBytes}`,
    "# HELP mathios_process_heap_total_bytes Process heap total in bytes.",
    "# TYPE mathios_process_heap_total_bytes gauge",
    `mathios_process_heap_total_bytes ${snapshot.process.heapTotalBytes}`,
  ];
  for (const counter of snapshot.counters) {
    lines.push(`${counter.name}{${formatLabels(counter.labels)}} ${counter.value}`);
  }
  return `${lines.join("\n")}\n`;
}

export function resetMetricsForTests(): void {
  counters.clear();
}

function normalizeMetricPath(path: string): string {
  return path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").slice(0, 160);
}

function formatLabels(labels: MetricLabels): string {
  return Object.entries(labels)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) => `${key}="${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
    )
    .join(",");
}
