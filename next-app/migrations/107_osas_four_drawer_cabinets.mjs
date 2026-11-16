export default async function migrate(client) {
  const { rows: [setting] } = await client.query(
    "SELECT value FROM settings WHERE key='storage_layout:osas' FOR UPDATE",
  );
  if (!setting) return;

  let layout;
  try {
    layout = JSON.parse(setting.value);
  } catch {
    return;
  }

  const cabinets = ["ACADEMIC ORGANIZATIONS", "NON-ACADEMIC ORGANIZATIONS"];
  const room = layout?.rooms?.[0];
  if (layout?.rooms?.length !== 1 || Number(room?.id) !== 1 || room?.cabinets?.length !== 2) return;
  if (!cabinets.every((id) => room.cabinets.some((cabinet) =>
    cabinet?.id === id && cabinet.drawerIds?.map(String).join(",") === "1,2,3,4,5,6,7"
  ))) return;

  await client.query(
    `UPDATE student_organizations
     SET storage_drawer=(storage_drawer::int - 4)::text, updated_at=NOW()
     WHERE storage_room=1 AND storage_cabinet=ANY($1::text[])
       AND storage_drawer IN ('5','6','7')`,
    [cabinets],
  );

  for (const cabinet of room.cabinets) cabinet.drawerIds = [1, 2, 3, 4];
  await client.query(
    "UPDATE settings SET value=$1, updated_at=NOW() WHERE key='storage_layout:osas'",
    [JSON.stringify(layout)],
  );
}
