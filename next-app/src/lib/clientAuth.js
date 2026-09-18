let inFlightSessionRequest = null;

/**
 * Share only a concurrent session request. Completed session responses are
 * never retained so auth status and role changes remain fresh.
 */
export function getClientSession() {
  if (inFlightSessionRequest) return inFlightSessionRequest;

  inFlightSessionRequest = fetch("/api/auth/me", {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
    .then(async (response) => ({
      ok: response.ok,
      status: response.status,
      data: (await response.json().catch(() => null))?.data || null,
    }))
    .finally(() => {
      inFlightSessionRequest = null;
    });

  return inFlightSessionRequest;
}

export function invalidateClientSession() {
  inFlightSessionRequest = null;
}
