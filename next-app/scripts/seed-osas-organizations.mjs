/**
 * Standalone seed script for OSAS student organizations.
 *
 * Populates all 14 student organizations listed on the OSAS office whiteboard:
 * 1. JFINEX (Junior Financial Executives)
 * 2. YES (Young Educators Society)
 * 3. JPIA (Junior Philippine Institute of Accountants)
 * 4. CEO (Collegiate Entrepreneurs' Organization)
 * 5. HM SOCIETY (Hospitality Management Society)
 * 6. GLITCH (Governing League of I.T. Challengers)
 * 7. PSYSOC (Psychological Society)
 * 8. PYLON E-SPORTS (Pylon Esports)
 * 9. ROTARACT (Rotaract Club of PUP San Juan)
 * 10. HHC (Helping Hands Community)
 * 11. ADC (Alab Danse Club)
 * 12. PARASEIST (The Paraseist)
 * 13. SA (Student Assembly)
 * 14. LENTE FILIKULAS (PUP Lente Filikulas)
 *
 * Usage:
 *   node scripts/seed-osas-organizations.mjs
 *   pnpm db:seed:organizations
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { pool, query, queryOne, transaction } = await import("../src/lib/postgres.js");

export const WHITEBOARD_ORGANIZATIONS = [
  {
    id: "jfinex",
    name: "Junior Financial Executives (JFINEX)",
    acronym: "JFINEX",
    category: "Academic",
    adviserName: "Dr. Milton Friedman",
    adviserEmail: "mfriedman@pup.edu.ph",
    description: "Academic student organization for Financial Management (BSBA-FM) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "1",
  },
  {
    id: "yes",
    name: "Young Educators Society (YES)",
    acronym: "YES",
    category: "Academic",
    adviserName: "Prof. Maria Montessori",
    adviserEmail: "mmontessori@pup.edu.ph",
    description: "Academic student organization for Teacher Education (BSEDUC) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "2",
  },
  {
    id: "jpia",
    name: "Junior Philippine Institute of Accountants (JPIA)",
    acronym: "JPIA",
    category: "Academic",
    adviserName: "Prof. Pacioli Luca",
    adviserEmail: "pluca@pup.edu.ph",
    description: "Academic student organization for Accountancy (BSA) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "3",
  },
  {
    id: "ceo",
    name: "Collegiate Entrepreneurs' Organization (CEO)",
    acronym: "CEO",
    category: "Academic",
    adviserName: "Prof. Joseph Schumpeter",
    adviserEmail: "jschumpeter@pup.edu.ph",
    description: "Academic student organization for Entrepreneurship (BSENT) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "4",
  },
  {
    id: "hm-society",
    name: "Hospitality Management Society (HM Society)",
    acronym: "HM SOCIETY",
    category: "Academic",
    adviserName: "Prof. Cesar Ritz",
    adviserEmail: "critz@pup.edu.ph",
    description: "Academic student organization for Hospitality Management students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "5",
  },
  {
    id: "glitch",
    name: "Governing League of I.T. Challengers (GLITCH)",
    acronym: "GLITCH",
    category: "Academic",
    adviserName: "Prof. Alan Turing",
    adviserEmail: "aturing@pup.edu.ph",
    description: "Academic student organization representing Information Technology (BSIT) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "6",
  },
  {
    id: "psysoc",
    name: "Psychological Society (PSYSOC)",
    acronym: "PSYSOC",
    category: "Academic",
    adviserName: "Dr. Carl Rogers",
    adviserEmail: "crogers@pup.edu.ph",
    description: "Academic student organization for Psychology (BSPSYCH) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "7",
  },
  {
    id: "pylon-esports",
    name: "PYLON E-Sports",
    acronym: "PYLON",
    category: "Non-Academic",
    adviserName: "Engr. Kevin Lim",
    adviserEmail: "klim@pup.edu.ph",
    description: "Special interest organization promoting competitive gaming, esports tournaments, and digital recreation.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "1",
  },
  {
    id: "rotaract",
    name: "Rotaract Club of PUP San Juan",
    acronym: "ROTARACT",
    category: "Non-Academic",
    adviserName: "Dr. Clara Barton",
    adviserEmail: "cbarton@pup.edu.ph",
    description: "Civic and youth leadership organization affiliated with Rotary International committed to community service.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "2",
  },
  {
    id: "hhc",
    name: "Helping Hands Community (HHC)",
    acronym: "HHC",
    category: "Non-Academic",
    adviserName: "Dr. Maria Santos",
    adviserEmail: "msantos@pup.edu.ph",
    description: "Civic and outreach organization dedicated to community extension programs and student volunteerism.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "3",
  },
  {
    id: "adc",
    name: "Alab Danse Club (ADC)",
    acronym: "ADC",
    category: "Non-Academic",
    adviserName: "Prof. Francisca Reyes-Aquino",
    adviserEmail: "faquino@pup.edu.ph",
    description: "Official university dance troupe and performing arts organization representing PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "4",
  },
  {
    id: "paraseist",
    name: "The Paraseist",
    acronym: "PARASEIST",
    category: "Non-Academic",
    adviserName: "Prof. Lamberto Avellana",
    adviserEmail: "lavellana@pup.edu.ph",
    description: "Official student publication and independent campus journalism organization of PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "5",
  },
  {
    id: "sa",
    name: "Student Assembly (SA)",
    acronym: "SA",
    category: "Non-Academic",
    adviserName: "Dean Roberto Gomez",
    adviserEmail: "rgomez@pup.edu.ph",
    description: "Campus student assembly and student representation body under OSAS.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "6",
  },
  {
    id: "lente-filikulas",
    name: "PUP Lente Filikulas",
    acronym: "LENTE FILIKULAS",
    category: "Non-Academic",
    adviserName: "Prof. Ishmael Bernal",
    adviserEmail: "ibernal@pup.edu.ph",
    description: "Creative arts and cinematography guild fostering student talent in photography and film production.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "7",
  },
];

export async function seedOrganizations() {
  console.log("=== POPULATING OSAS WHITEBOARD ORGANIZATIONS ===");

  const results = [];

  await transaction(async ({ query: run }) => {
    for (const org of WHITEBOARD_ORGANIZATIONS) {
      const res = await run(
        `INSERT INTO student_organizations (
           id, name, acronym, category, status,
           adviser_name, adviser_email, description,
           storage_room, storage_cabinet, storage_drawer,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'Active', $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           acronym = EXCLUDED.acronym,
           category = EXCLUDED.category,
           status = 'Active',
           adviser_name = EXCLUDED.adviser_name,
           adviser_email = EXCLUDED.adviser_email,
           description = EXCLUDED.description,
           storage_room = EXCLUDED.storage_room,
           storage_cabinet = EXCLUDED.storage_cabinet,
           storage_drawer = EXCLUDED.storage_drawer,
           updated_at = NOW()
         RETURNING id, name, acronym, category, storage_cabinet, storage_drawer`,
        [
          org.id,
          org.name,
          org.acronym,
          org.category,
          org.adviserName,
          org.adviserEmail,
          org.description,
          org.storageRoom,
          org.storageCabinet,
          org.storageDrawer,
        ]
      );
      results.push(res.rows[0]);
    }

    // Mirror whitelisted officers from 'helping-hands' to 'hhc' if present
    const hhRes = await run(
      `SELECT email, student_no, student_name, position, status
       FROM organization_officers
       WHERE organization_id = 'helping-hands'`
    );
    for (const off of hhRes.rows) {
      await run(
        `INSERT INTO organization_officers (
           organization_id, email, student_no, student_name, position, status, created_at, updated_at
         ) VALUES ('hhc', $1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (organization_id, email) DO UPDATE SET
           position = EXCLUDED.position,
           student_name = EXCLUDED.student_name,
           student_no = EXCLUDED.student_no,
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [off.email, off.student_no, off.student_name, off.position, off.status]
      );
    }
  });

  console.log(`\nSuccessfully seeded ${results.length} OSAS organizations:\n`);
  for (let i = 0; i < results.length; i++) {
    const o = results[i];
    console.log(`  ${String(i + 1).padStart(2, " ")}. [${o.acronym.padEnd(14, " ")}] ${o.name} (${o.category}) -> ${o.storage_cabinet} D${o.storage_drawer}`);
  }

  return results;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^[./\\]+/, ""))) {
  try {
    await seedOrganizations();
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed OSAS organizations:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
