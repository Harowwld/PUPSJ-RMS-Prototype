import { decryptPII, encryptPII } from "../src/lib/piiEncryption.js";

export default async function migrate(client) {
  const personnel = [
    ["PUPSUPERADMIN-001", "superadmin", "Ramon", "Villanueva"],
    ["PUPREGISTRAR-003", "admin.registrar"],
    ["PUPREGISTRAR-002", "staff.registrar"],
    ["PUPOSAS-001", "admin.osas"],
    ["PUPOSAS-002", "staff.osas"],
  ];
  for (const [id, address, firstName, lastName] of personnel) {
    const { rows: [staff] } = await client.query("SELECT email FROM staff WHERE id = $1", [id]);
    if (decryptPII(staff?.email)?.toLowerCase() !== `${address}@pup.local`) continue;

    await client.query(
      `UPDATE staff SET email = $2, fname = COALESCE($3, fname), lname = COALESCE($4, lname)
       WHERE id = $1`,
      [id, encryptPII(`${address}@pup.com`), firstName ? encryptPII(firstName) : null, lastName ? encryptPII(lastName) : null],
    );
  }

  for (const [studentNo, address] of [["2022-10001-SJ-0", "student"], ["2023-00001-SJ-0", "test.student"]]) {
    const { rows } = await client.query(
      `SELECT profile.id, profile.email FROM student_identity_profiles profile
       JOIN student_accounts account ON account.identity_profile_id = profile.id
       WHERE account.student_no = $1`,
      [studentNo],
    );
    for (const profile of rows) {
      if (decryptPII(profile.email)?.toLowerCase() !== `${address}@pup.local`) continue;
      await client.query("UPDATE student_identity_profiles SET email = $2 WHERE id = $1", [
        profile.id, encryptPII(`${address}@pup.com`),
      ]);
    }
  }
}
