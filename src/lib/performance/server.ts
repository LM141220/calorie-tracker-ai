type RequestKind = "auth" | "postgrest" | "rpc" | "storage" | "other";

type RequestMeasurement = {
  kind: RequestKind;
  startedAt: number;
  endedAt: number;
  durationMs: number;
};

function getRequestKind(input: RequestInfo | URL): RequestKind {
  const url =
    input instanceof Request
      ? new URL(input.url)
      : new URL(input instanceof URL ? input.href : input, "http://localhost");

  if (url.pathname.includes("/auth/v1/")) {
    return "auth";
  }
  if (url.pathname.includes("/storage/v1/")) {
    return "storage";
  }
  if (url.pathname.includes("/rest/v1/rpc/")) {
    return "rpc";
  }
  if (url.pathname.includes("/rest/v1/")) {
    return "postgrest";
  }
  return "other";
}

export class ServerPagePerformance {
  private readonly startedAt = performance.now();
  private readonly startedEpoch = Date.now();
  private readonly measurements: Array<{
    name: string;
    startedAt: number;
    endedAt: number;
    durationMs: number;
  }> = [];
  private readonly requests: RequestMeasurement[] = [];
  private reported = false;
  readonly enabled =
    process.env.NODE_ENV !== "production" || process.env.PERF_LOGS === "true";

  constructor(
    private readonly pageName: string,
    private readonly requestId = crypto.randomUUID(),
  ) {}

  readonly fetch: typeof fetch = async (input, init) => {
    if (!this.enabled) {
      return fetch(input, init);
    }

    const startedAt = performance.now();
    const startedEpoch = Date.now();
    const kind = getRequestKind(input);
    try {
      return await fetch(input, init);
    } finally {
      const endedAt = performance.now();
      const durationMs = endedAt - startedAt;
      this.requests.push({
        kind,
        startedAt,
        endedAt,
        durationMs,
      });
      this.logStep(
        `Supabase.${kind}.fetch-to-headers`,
        startedEpoch,
        durationMs,
        `request=${this.requests.length}`,
      );
    }
  };

  async measure<T>(
    name: string,
    operation: () => T | PromiseLike<T>,
  ): Promise<T> {
    if (!this.enabled) {
      return await operation();
    }

    const startedAt = performance.now();
    const startedEpoch = Date.now();
    try {
      return await operation();
    } finally {
      const endedAt = performance.now();
      const durationMs = endedAt - startedAt;
      this.measurements.push({
        name,
        startedAt,
        endedAt,
        durationMs,
      });
      this.logStep(name, startedEpoch, durationMs);
    }
  }

  private logStep(
    name: string,
    startedEpoch: number,
    durationMs: number,
    suffix = "",
  ) {
    if (!this.enabled) {
      return;
    }
    const endedEpoch = startedEpoch + durationMs;
    console.info(
      [
        `[PERF SERVER] ${this.pageName}.${name} request=${this.requestId}`,
        `start=${new Date(startedEpoch).toISOString()}`,
        `end=${new Date(endedEpoch).toISOString()}`,
        `duration=${durationMs.toFixed(1)}ms`,
        suffix,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  report(): void {
    if (!this.enabled || this.reported) {
      return;
    }
    this.reported = true;

    const requestCounts = {
      auth: this.requests.filter(({ kind }) => kind === "auth").length,
      postgrest: this.requests.filter(({ kind }) => kind === "postgrest")
        .length,
      rpc: this.requests.filter(({ kind }) => kind === "rpc").length,
      storage: this.requests.filter(({ kind }) => kind === "storage").length,
      other: this.requests.filter(({ kind }) => kind === "other").length,
    };
    const requestDuration = (kind: RequestKind) =>
      this.requests
        .filter((request) => request.kind === kind)
        .reduce((total, request) => total + request.durationMs, 0);
    const elapsedMs = performance.now() - this.startedAt;
    const endedEpoch = this.startedEpoch + elapsedMs;
    const lines = [
      `[PERF SERVER] ${this.pageName} request=${this.requestId}`,
      `start=${new Date(this.startedEpoch).toISOString()}`,
      `end=${new Date(endedEpoch).toISOString()}`,
      `duration=${elapsedMs.toFixed(1)}ms`,
      ...this.measurements.map(
        ({ name, startedAt, endedAt, durationMs }) =>
          `${name}: start+${(startedAt - this.startedAt).toFixed(1)}ms, end+${(endedAt - this.startedAt).toFixed(1)}ms, duration=${durationMs.toFixed(1)}ms`,
      ),
      ...this.requests.map(
        ({ kind, startedAt, endedAt, durationMs }, index) =>
          `Supabase.${kind}.fetch-to-headers #${index + 1}: start+${(startedAt - this.startedAt).toFixed(1)}ms, end+${(endedAt - this.startedAt).toFixed(1)}ms, duration=${durationMs.toFixed(1)}ms`,
      ),
      `Supabase/HTTP requests: ${this.requests.length} (auth ${requestCounts.auth}, PostgREST ${requestCounts.postgrest}, RPC/SQL ${requestCounts.rpc}, Storage ${requestCounts.storage}, other ${requestCounts.other})`,
      `Request time sum: auth ${requestDuration("auth").toFixed(1)}ms, PostgREST ${requestDuration("postgrest").toFixed(1)}ms, RPC/SQL ${requestDuration("rpc").toFixed(1)}ms, Storage ${requestDuration("storage").toFixed(1)}ms`,
      `route data-loader total (not full response time): ${elapsedMs.toFixed(1)}ms`,
      "RPC/SQL time is end-to-end HTTP time, not isolated PostgreSQL execution time.",
    ];
    console.info(lines.join("\n"));
  }
}
