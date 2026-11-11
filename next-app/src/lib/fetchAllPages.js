export async function fetchAllPages(path, pageSize) {
  const rows = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams(path.split("?")[1] || "");
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));
    const res = await fetch(`${path.split("?")[0]}?${params}`, { cache: "no-store" });
    let json = null;
    try {
      json = await res.json();
    } catch {
      // Response was empty or not valid JSON (e.g. 500 error page or HTML redirect)
    }
    if (!res.ok || !json?.ok || !Array.isArray(json.data)) {
      throw new Error(json?.error || (res.statusText ? `Server returned ${res.status} (${res.statusText})` : "Unable to load records"));
    }
    rows.push(...json.data);
    if (json.data.length < pageSize) return rows;
    offset += pageSize;
  }
}
