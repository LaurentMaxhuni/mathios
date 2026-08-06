import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface ErrorTrackingContext {
  requestId?: string;
  route?: string;
  profileId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ErrorTracker {
  captureException(error: unknown, context?: ErrorTrackingContext): void;
}

class NoopErrorTracker implements ErrorTracker {
  captureException(): void {
    return undefined;
  }
}

class HttpErrorTracker implements ErrorTracker {
  constructor(private readonly dsn: string) {}

  captureException(error: unknown, context: ErrorTrackingContext = {}): void {
    const payload = JSON.stringify({
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "UnknownError",
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
    });
    void fetch(this.dsn, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(3000),
    }).catch((trackingError: unknown) => {
      logger.warn("Error tracking delivery failed", {
        error: trackingError instanceof Error ? trackingError.message : String(trackingError),
      });
    });
  }
}

let tracker: ErrorTracker | undefined;

export function getErrorTracker(): ErrorTracker {
  if (tracker) return tracker;
  tracker = env.ERROR_TRACKING_DSN
    ? new HttpErrorTracker(env.ERROR_TRACKING_DSN)
    : new NoopErrorTracker();
  return tracker;
}

export function setErrorTrackerForTests(nextTracker: ErrorTracker): void {
  tracker = nextTracker;
}
