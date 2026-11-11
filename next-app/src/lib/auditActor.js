import { query } from "./postgres.js";
import { decryptPII } from "./piiEncryption.js";
import { getStaffById, getStaffDisplayName } from "./staffRepo.js";
import { isSystemAdminRole } from "./roleUtils.js";

function normalizeActor(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveStaffActor(actor, role, staffRows) {
  const normalizedActor = normalizeActor(actor);
  if (!normalizedActor) return null;

  // 1. Exact ID match (e.g. 'PUPSUPERADMIN-001')
  const exactIdMatch = staffRows.find(
    (staff) => normalizeActor(staff.id) === normalizedActor
  );
  if (exactIdMatch) return exactIdMatch;

  // 2. Exact email match (e.g. 'superadmin@pup.local')
  const exactEmailMatch = staffRows.find(
    (staff) => normalizeActor(staff.email) === normalizedActor
  );
  if (exactEmailMatch) return exactEmailMatch;

  // 3. Exact full name match ('Fname Lname')
  let matches = staffRows.filter((staff) => {
    const fullName = `${staff.fname || ""} ${staff.lname || ""}`.trim();
    return normalizeActor(fullName) === normalizedActor;
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1 && role) {
    const roleMatches = matches.filter(
      (staff) => normalizeActor(staff.role) === normalizeActor(role)
    );
    if (roleMatches.length === 1) return roleMatches[0];
  }

  // 4. Exact last, first match ('Lname, Fname')
  matches = staffRows.filter((staff) => {
    const lastFirst = `${staff.lname || ""}, ${staff.fname || ""}`.trim();
    return normalizeActor(lastFirst) === normalizedActor;
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1 && role) {
    const roleMatches = matches.filter(
      (staff) => normalizeActor(staff.role) === normalizeActor(role)
    );
    if (roleMatches.length === 1) return roleMatches[0];
  }

  // 5. Preferred display name match (configured in preferences)
  matches = staffRows.filter((staff) => {
    const displayName = getStaffDisplayName(staff);
    return normalizeActor(displayName) === normalizedActor;
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1 && role) {
    const roleMatches = matches.filter(
      (staff) => normalizeActor(staff.role) === normalizeActor(role)
    );
    if (roleMatches.length === 1) return roleMatches[0];
  }

  // 6. Default superadmin alias ('System Administrator')
  if (normalizedActor === "system administrator") {
    const superAdmin = staffRows.find(
      (staff) => staff.id === "PUPSUPERADMIN-001" || isSystemAdminRole(staff.role)
    );
    if (superAdmin) return superAdmin;
  }

  // 7. Single name match: first name only ('Fname')
  matches = staffRows.filter((staff) => {
    return normalizeActor(staff.fname) === normalizedActor;
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1 && role) {
    const roleMatches = matches.filter(
      (staff) => normalizeActor(staff.role) === normalizeActor(role)
    );
    if (roleMatches.length === 1) return roleMatches[0];
  }

  // 8. Single name match: last name only ('Lname')
  matches = staffRows.filter((staff) => {
    return normalizeActor(staff.lname) === normalizedActor;
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1 && role) {
    const roleMatches = matches.filter(
      (staff) => normalizeActor(staff.role) === normalizeActor(role)
    );
    if (roleMatches.length === 1) return roleMatches[0];
  }

  return null;
}

export function resolveAuditActorIds(rows, staffRows = [], studentRows = []) {
  return rows.map((row) => {
    const role = normalizeActor(row.role);
    if (role === "system") {
      return { ...row, actor_id: null, avatar_filename: null };
    }

    if (role === "student") {
      const studentActorId = String(row.actor_id || row.actor || "").trim();
      const normStudentId = normalizeActor(studentActorId);
      const matchedStudent = studentRows.find((s) => {
        if (!normStudentId) return false;
        if (s.student_no && normalizeActor(s.student_no) === normStudentId) return true;
        if (s.id != null && String(s.id) === studentActorId) return true;
        if (s.email && normalizeActor(s.email) === normStudentId) return true;
        const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim();
        if (fullName && normalizeActor(fullName) === normStudentId) return true;
        if (s.display_name && normalizeActor(s.display_name) === normStudentId) return true;
        return false;
      });
      return {
        ...row,
        actor_id: matchedStudent?.student_no || (matchedStudent?.id ? String(matchedStudent.id) : null) || row.actor_id || studentActorId || null,
        avatar_filename: matchedStudent?.avatar_filename || null,
      };
    }

    const matchedStaff =
      (row.actor_id && staffRows.find((s) => normalizeActor(s.id) === normalizeActor(row.actor_id))) ||
      resolveStaffActor(row.actor, row.role, staffRows);

    return {
      ...row,
      actor_id: row.actor_id || matchedStaff?.id || null,
      avatar_filename: matchedStaff?.avatar_filename || null,
    };
  });
}

export function resolveAuditActorDisplayNames(rows, staffRows = [], studentRows = []) {
  const staffById = new Map(staffRows.map((staff) => [normalizeActor(staff.id), staff]));
  const studentsByNumber = new Map(studentRows.filter((student) => student.student_no).map((student) => [normalizeActor(student.student_no), student]));
  const studentsByAccountId = new Map(studentRows.filter((student) => student.id != null).map((student) => [normalizeActor(student.id), student]));

  return rows.map((row) => {
    const withDisplayName = (name) => {
      if (!name) return row;
      const details = String(row.details || "");
      const hasRecordedEmail = /'[^'\s]+@[^'\s]+'/.test(details);
      if (!hasRecordedEmail) return { ...row, actor_display_name: name };
      const action = normalizeActor(row.action);
      let displayDetails = details;
      if (action.includes("logout")) {
        displayDetails = details.replace(/((?:personnel|student)\s+)'[^'\s]+@[^'\s]+'/i, `$1'${name}'`);
      } else if (action === "login attempt") {
        displayDetails = details.replace(/(recognized account\s+)'[^'\s]+@[^'\s]+'/i, `$1'${name}'`);
        displayDetails = displayDetails.replace(/(personnel account\s+)'[^'\s]+@[^'\s]+'/i, `$1'${name}'`);
      }
      return displayDetails === details
        ? { ...row, actor_display_name: name }
        : { ...row, actor_display_name: name, recorded_details: row.details, details: displayDetails };
    };
    const role = normalizeActor(row.role);
    if (role === "system") return row;

    if (role === "student") {
      const student = studentsByNumber.get(normalizeActor(row.actor_id)) || studentsByAccountId.get(normalizeActor(row.actor_id));
      const fullName = [student?.first_name, student?.last_name].filter(Boolean).join(" ").trim() || student?.display_name || "";
      return withDisplayName(fullName);
    }

    const staff = staffById.get(normalizeActor(row.actor_id));
    const fullName = [staff?.fname, staff?.lname].filter(Boolean).join(" ").trim();
    return withDisplayName(fullName);
  });
}

export async function addAuditActorIds(rows) {
  const needsStaffLookup = rows.some(
    (row) => normalizeActor(row.role) !== "student" && normalizeActor(row.role) !== "system"
  );
  const needsStudentLookup = rows.some(
    (row) => normalizeActor(row.role) === "student"
  );

  const [staffRows, studentRows] = await Promise.all([
    needsStaffLookup
      ? query("SELECT id, fname, lname, email, role, avatar_filename, preferences, office_id FROM staff")
      : Promise.resolve([]),
    needsStudentLookup
      ? query(`
          SELECT sa.id, sa.student_no, sa.avatar_filename, sip.email,
                 sip.first_name, sip.last_name, sip.display_name
          FROM student_accounts sa
          LEFT JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
        `)
      : Promise.resolve([]),
  ]);

  const readableStaffRows = staffRows.map((staff) => ({
    ...staff,
    fname: decryptPII(staff.fname),
    lname: decryptPII(staff.lname),
    email: decryptPII(staff.email),
  }));

  const readableStudentRows = studentRows.map((student) => ({
    ...student,
    first_name: decryptPII(student.first_name),
    last_name: decryptPII(student.last_name),
    email: decryptPII(student.email),
    display_name: decryptPII(student.display_name),
  }));

  return resolveAuditActorDisplayNames(
    resolveAuditActorIds(rows, readableStaffRows, readableStudentRows),
    readableStaffRows,
    readableStudentRows
  );
}

/**
 * Resolves all possible actor strings/identities that could represent
 * the given principal in audit logs (e.g., student number, user ID, email,
 * full name, first name, last name, inverted name, preferred display format,
 * and legacy default account names).
 *
 * @param {object} user - The authenticated principal object
 * @returns {Promise<string[]>} Array of actor identity strings
 */
export async function getPrincipalActorIdentities(user) {
  if (!user) return [];
  const identities = new Set();

  const isStudent =
    user.principalType === "student" ||
    user.role === "Student" ||
    Boolean(user.studentNo || user.student_no);

  if (isStudent) {
    if (user.studentNo) identities.add(String(user.studentNo).trim());
    if (user.student_no) identities.add(String(user.student_no).trim());
    if (user.email) identities.add(String(user.email).trim());
    if (user.id) identities.add(String(user.id).trim());
    if (user.accountId) identities.add(String(user.accountId).trim());
    if (user.name) identities.add(String(user.name).trim());
    if (user.fname) identities.add(String(user.fname).trim());
    if (user.lname) identities.add(String(user.lname).trim());
    if (user.fname && user.lname) {
      identities.add(`${user.fname} ${user.lname}`.trim());
      identities.add(`${user.lname}, ${user.fname}`.trim());
    }
    if (user.payload?.username) identities.add(String(user.payload.username).trim());
    if (user.username) identities.add(String(user.username).trim());

    // Enrich with database identity profile if accessible
    try {
      const studentId = user.accountId || user.id;
      if (studentId) {
        const studentProfile = await query(
          `SELECT sa.student_no, sip.email, sip.first_name, sip.last_name, sip.display_name
           FROM student_accounts sa
           LEFT JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
           WHERE sa.id = $1 OR sa.student_no = $2
           LIMIT 1`,
          [Number.isFinite(Number(studentId)) ? Number(studentId) : null, user.studentNo || user.student_no || ""]
        );
        if (studentProfile?.length) {
          const sp = studentProfile[0];
          if (sp.student_no) identities.add(String(sp.student_no).trim());
          const email = decryptPII(sp.email);
          const fn = decryptPII(sp.first_name);
          const ln = decryptPII(sp.last_name);
          const dn = decryptPII(sp.display_name);
          if (email) identities.add(email.trim());
          if (fn) identities.add(fn.trim());
          if (ln) identities.add(ln.trim());
          if (fn && ln) {
            identities.add(`${fn} ${ln}`.trim());
            identities.add(`${ln}, ${fn}`.trim());
          }
          if (dn) identities.add(dn.trim());
        }
      }
    } catch {
      // Non-fatal profile lookup fallback
    }

    return [...identities].filter(Boolean);
  }

  // Staff / Admin principal
  if (user.id) identities.add(String(user.id).trim());
  if (user.email) identities.add(String(user.email).trim());
  if (user.username) identities.add(String(user.username).trim());
  if (user.payload?.username) identities.add(String(user.payload.username).trim());

  let staff = null;
  if (user.id) {
    try {
      staff = await getStaffById(user.id);
    } catch {
      staff = null;
    }
  }

  const fname = staff?.fname || user.fname || "";
  const lname = staff?.lname || user.lname || "";
  const cleanFname = fname && !fname.startsWith("enc:v1:") ? fname.trim() : "";
  const cleanLname = lname && !lname.startsWith("enc:v1:") ? lname.trim() : "";

  if (cleanFname) identities.add(cleanFname);
  if (cleanLname) identities.add(cleanLname);
  if (cleanFname && cleanLname) {
    identities.add(`${cleanFname} ${cleanLname}`);
    identities.add(`${cleanLname}, ${cleanFname}`);
  }

  if (staff) {
    const displayName = getStaffDisplayName(staff);
    if (displayName) identities.add(displayName.trim());
    if (staff.email && !staff.email.startsWith("enc:v1:")) {
      identities.add(staff.email.trim());
    }
  }

  // Handle default / legacy superadmin identities (seed defaults)
  if (user.id === "PUPSUPERADMIN-001" || isSystemAdminRole(user.role)) {
    identities.add("System Administrator");
  }

  return [...identities].filter(Boolean);
}
