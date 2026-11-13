export async function fetchAllPages(path, pageSize) {
  const rows = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams(path.split("?")[1] || "");
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));
    const res = await fetch(`${path.split("?")[0]}?${params}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json?.ok || !Array.isArray(json.data)) {
      throw new Error(json?.error || "Unable to load records");
    }
    rows.push(...json.data);
    if (json.data.length < pageSize) return rows;
    offset += pageSize;
  }
}
