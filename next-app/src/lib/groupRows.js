// Keep the existing sort within each group, with groups ordered by first appearance.
export function orderRowsByGroup(rows, getGroup, compareGroups) {
  const groups = new Map();
  for (const row of rows) {
    const key = getGroup(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const entries = [...groups];
  if (compareGroups) entries.sort(([left], [right]) => compareGroups(left, right));
  return entries.flatMap(([, items]) => items);
}
