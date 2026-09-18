const inFlightRequests = new Map();

export function fetchJsonOnce(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET") return fetchJson(url, options);

  const key = `${method}:${url}`;
  const existing = inFlightRequests.get(key);
  if (existing) return existing;

  const request = fetchJson(url, options).finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, request);
  return request;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    data: body?.data ?? null,
    error: body?.error || null,
    body,
  };
}

export function invalidateInFlightRequest(url) {
  if (url) {
    inFlightRequests.delete(`GET:${url}`);
    return;
  }
  inFlightRequests.clear();
}
