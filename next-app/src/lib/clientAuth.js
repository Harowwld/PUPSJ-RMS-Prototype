let inFlightSessionRequest = null;
let inFlightRefresh = null;
let nativeFetch = null;
const sessionListeners = new Set();

function fetchDirect(input, init) {
  return (nativeFetch || globalThis.fetch)(input, init);
}

function publishExpiry(expiresAt) {
  for (const listener of sessionListeners) listener(expiresAt);
}

export function subscribeSessionExpiry(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

async function readSession() {
  const response = await fetchDirect("/api/auth/me", {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate", Pragma: "no-cache", Expires: "0" },
  });
  const data = (await response.json().catch(() => null))?.data || null;
  if (response.ok && data?.sessionExpiresAt) publishExpiry(data.sessionExpiresAt);
  return { ok: response.ok, status: response.status, data };
}

export function refreshClientSession() {
  if (inFlightRefresh) return inFlightRefresh;
  const rotate = async () => {
    // Another tab may have refreshed while this tab waited for the lock.
    const current = await readSession();
    if (current.ok && current.data?.sessionExpiresAt > Date.now() / 1000 + 60) return true;
    const response = await fetchDirect("/api/auth/refresh", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "x-session-refresh": "1" },
    });
    if (response.ok) {
      const data = (await response.json().catch(() => null))?.data;
      if (data?.expiresAt) publishExpiry(data.expiresAt);
      return true;
    }
    if (response.status === 409) {
      // A simultaneous rotation may still be applying its Set-Cookie response.
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        if ((await readSession()).ok) return true;
      }
    }
    if (response.status === 401 || response.status === 403) {
      publishExpiry(null);
      return false;
    }
    throw new Error("Session refresh is temporarily unavailable");
  };
  inFlightRefresh = (globalThis.navigator?.locks
    ? navigator.locks.request("pupsj-session-refresh", rotate)
    : rotate()).finally(() => { inFlightRefresh = null; });
  return inFlightRefresh;
}

function waitForRefresh(signal) {
  if (signal?.aborted) return Promise.reject(signal.reason || new DOMException("Aborted", "AbortError"));
  const refresh = refreshClientSession();
  if (!signal) return refresh;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason || new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    refresh.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export async function authFetch(input, init) {
  if (typeof window === "undefined") return fetchDirect(input, init);
  const url = new URL(input instanceof Request ? input.url : input, window.location.href);
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  const credentials = init?.credentials || (input instanceof Request ? input.credentials : "same-origin");
  const eligible = url.origin === window.location.origin && url.pathname.startsWith("/api/")
    && (!url.pathname.startsWith("/api/auth/") || url.pathname === "/api/auth/me")
    && !headers.has("Authorization") && credentials !== "omit";
  if (!eligible) return fetchDirect(input, init);

  // Clone before the first fetch consumes a Request body so POST retries retain it.
  const request = new Request(input instanceof Request ? input : url, init);
  const retry = request.clone();
  const response = await fetchDirect(request);
  if (response.status !== 401) return response;
  try {
    if (!(await waitForRefresh(request.signal))) return response;
  } catch (error) {
    if (request.signal.aborted) throw error;
    return response;
  }
  request.signal.throwIfAborted();
  return fetchDirect(retry);
}

export function installSessionFetch() {
  if (nativeFetch) return () => {};
  const previous = globalThis.fetch;
  nativeFetch = previous.bind(globalThis);
  globalThis.fetch = authFetch;
  return () => {
    if (globalThis.fetch === authFetch) globalThis.fetch = previous;
    nativeFetch = null;
  };
}

/** Share concurrent checks only; completed responses must stay fresh. */
export function getClientSession() {
  if (inFlightSessionRequest) return inFlightSessionRequest;
  const request = (async () => {
    let session = await readSession();
    if (session.status === 401 && typeof window !== "undefined" && await refreshClientSession()) {
      session = await readSession();
    }
    return session;
  })();
  inFlightSessionRequest = request;
  request.finally(() => {
    if (inFlightSessionRequest === request) inFlightSessionRequest = null;
  }).catch(() => {});
  return request;
}

export function invalidateClientSession() {
  inFlightSessionRequest = null;
  publishExpiry(null);
}
