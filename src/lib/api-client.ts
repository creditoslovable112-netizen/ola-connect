type ApiRequestOptions = Omit<RequestInit, "signal"> & {
  timeoutMs?: number;
  signal?: AbortSignal;
};

const inFlightGetRequests = new Map<string, Promise<unknown>>();

/**
 * JSON API helper for the future backend.
 * GET requests with the same URL and headers share one in-flight request.
 * The timeout is enforced with AbortController and never hides HTTP errors.
 */
export async function apiJson<T>(
  input: string | URL,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { timeoutMs = 10_000, signal: callerSignal, headers, ...init } = options;
  const url = String(input);
  const method = (init.method ?? "GET").toUpperCase();
  const normalizedHeaders = new Headers(headers);
  if (!normalizedHeaders.has("Accept")) normalizedHeaders.set("Accept", "application/json");
  const requestKey = method === "GET"
    ? `${url}::${[...normalizedHeaders.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join("|")}`
    : null;

  if (requestKey) {
    const existing = inFlightGetRequests.get(requestKey) as Promise<T> | undefined;
    if (existing) return existing;
  }

  const request = (async () => {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(callerSignal?.reason);
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeout = setTimeout(() => controller.abort(new DOMException("A API excedeu o tempo limite.", "TimeoutError")), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        headers: normalizedHeaders,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Falha na API (${response.status}): ${response.statusText}`);
      }
      return await response.json() as T;
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }
  })();

  if (requestKey) {
    inFlightGetRequests.set(requestKey, request);
    request.finally(() => {
      if (inFlightGetRequests.get(requestKey) === request) inFlightGetRequests.delete(requestKey);
    }).catch(() => undefined);
  }

  return request;
}

/** Run unrelated API reads concurrently; each request still has its own timeout. */
export function apiParallel<T extends readonly unknown[]>(
  requests: { [K in keyof T]: Promise<T[K]> },
): Promise<T> {
  return Promise.all(requests) as Promise<T>;
}
