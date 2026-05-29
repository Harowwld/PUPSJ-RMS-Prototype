import { dbRun, getDb, reloadDb } from "../src/lib/sqlite.js";

async function main() {
  console.log("Seeding taxonomy (courses & sections) from cleaned_student_data.csv...");

  const courses = [
    ["BSBA-FM", "Bachelor of Science in Business Administration major in Financial Management"],
    ["BSEDUC", "Bachelor of Secondary Education"],
    ["BSENT", "Bachelor of Science in Entrepreneurship"],
    ["BSIT", "Bachelor of Science in Information Technology"],
    ["BSPSYCH", "Bachelor of Science in Psychology"],
    ["DIT", "Diploma in Information Technology"]
  ];

  for (const [code, name] of courses) {
    await dbRun("INSERT OR IGNORE INTO courses (code, name) VALUES (?, ?)", [code, name]);
    console.log(`- Course registered: ${code}`);
  }

  const sections = [
    // BSBA-FM
    ["1-2", "BSBA-FM"],
    ["3-1", "BSBA-FM"],
    ["4-1", "BSBA-FM"],
    ["4-2", "BSBA-FM"],
    // BSEDUC
    ["1-2", "BSEDUC"],
    ["2-2", "BSEDUC"],
    ["3-1", "BSEDUC"],
    ["3-2", "BSEDUC"],
    ["4-2", "BSEDUC"],
    // BSENT
    ["2-1", "BSENT"],
    ["2-2", "BSENT"],
    ["3-1", "BSENT"],
    ["3-2", "BSENT"],
    ["4-1", "BSENT"],
    ["4-2", "BSENT"],
    // BSIT
    ["1-2", "BSIT"],
    ["2-1", "BSIT"],
    ["2-2", "BSIT"],
    ["3-1", "BSIT"],
    ["3-2", "BSIT"],
    ["4-1", "BSIT"],
    // BSPSYCH
    ["2-1", "BSPSYCH"],
    ["2-2", "BSPSYCH"],
    ["3-1", "BSPSYCH"],
    ["3-2", "BSPSYCH"],
    // DIT
    ["1-1", "DIT"],
    ["1-2", "DIT"],
    ["3-1", "DIT"]
  ];

  for (const [name, courseCode] of sections) {
    await dbRun("INSERT OR IGNORE INTO sections (name, course_code) VALUES (?, ?)", [
      name,
      courseCode,
    ]);
    console.log(`- Section registered: ${name} for course ${courseCode}`);
  }

  console.log("Taxonomy successfully seeded!");
  await new Promise(r => setTimeout(r, 200));
}

try {
  await main();
} catch (err) {
  console.error("Failed to seed taxonomy:", err);
} finally {
  reloadDb();
}
