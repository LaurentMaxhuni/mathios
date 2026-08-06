import { afterEach, describe, expect, it } from "vitest";
import {
  getMetricsSnapshot,
  incrementMetric,
  renderPrometheusMetrics,
  resetMetricsForTests,
} from "@/server/metrics";

describe("metrics", () => {
  afterEach(() => resetMetricsForTests());

  it("records counters and renders a bounded Prometheus view", () => {
    incrementMetric("mathios_test_total", { outcome: "ok" });
    const snapshot = getMetricsSnapshot();
    expect(snapshot.counters).toContainEqual({
      name: "mathios_test_total",
      labels: { outcome: "ok" },
      value: 1,
    });
    expect(renderPrometheusMetrics(snapshot)).toContain('mathios_test_total{outcome="ok"} 1');
  });
});
