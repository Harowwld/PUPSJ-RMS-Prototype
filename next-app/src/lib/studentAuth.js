import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSessionCookieName, signSessionToken, verifySessionToken } from "./jwt";
import { query, queryOne } from "./postgres";

const normalizeName = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export async function registerStudent({ studentNo, name, password }) {
  const cleanNo = String(studentNo || "").trim().toUpperCase();
  if (!cleanNo || !normalizeName(name) || String(password || "").length < 8) {
    throw new Error("Student number, name, and an 8-character password are required.");
  }
  const student = await queryOne(
    "SELECT student_no, name, status FROM students WHERE student_no = $1",
    [cleanNo]
  );
  if (!student || String(student.status).toLowerCase() !== "active" || normalizeName(student.name) !== normalizeName(name)) {
    throw new Error("Student record could not be verified.");
  }
  const existing = await queryOne("SELECT student_no FROM student_accounts WHERE student_no = $1", [cleanNo]);
  if (existing) throw new Error("This student account is already registered.");
  await query(
    "INSERT INTO student_accounts (student_no, password_hash, status) VALUES ($1, $2, 'Active')",
    [cleanNo, hashPassword(password)]
  );
  return student;
}

export async function authenticateStudent({ studentNo, password }) {
  const cleanNo = String(studentNo || "").trim().toUpperCase();
  const row = await queryOne(
    `SELECT sa.student_no, sa.password_hash, sa.status, s.name
     FROM student_accounts sa JOIN students s ON s.student_no = sa.student_no
     WHERE sa.student_no = $1`,
    [cleanNo]
  );
  if (!row || String(row.status).toLowerCase() !== "active" || !passwordMatches(password, row.password_hash)) return null;
  return row;
}

export async function createStudentSession(student) {
  return signSessionToken({ sub: student.student_no, role: "Student", principal_type: "student", student_no: student.student_no, username: student.student_no });
}

export async function getStudentSession() {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value || "";
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    if (payload?.role !== "Student" || !payload?.student_no) return null;
    return { studentNo: String(payload.student_no), payload };
  } catch {
    return null;
  }
}

export function setStudentSessionCookie(response, token) {
  response.cookies.set({
    name: getSessionCookieName(), value: token, httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production", path: "/",
  });
  return response;
}
