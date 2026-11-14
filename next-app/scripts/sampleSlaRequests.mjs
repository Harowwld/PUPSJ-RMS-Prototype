import {
  buildSlaTiers,
  calculateDeadline,
  getArtaClassification,
} from "../src/lib/citizenCharter.js";

const dayMs = 24 * 60 * 60 * 1000;
const weeklyVolumes = [24, 21, 28, 19, 16, 23, 30, 25, 17, 22, 15, 20];
const requestTypes = [
  "Certificate of Enrollment",
  "Transcript of Records",
  "Certificate of Registration",
  "Certificate of Good Moral",
  "Diploma",
  "Transcript of Records",
  "Certified True Copy of Records",
  "Certificate of Transfer Credentials (Honorable Dismissal)",
  "Certificate of Graduation",
  "Certification of Grades (Cross-Enrollee)",
];

const statusNotes = {
  Pending: "Request received by the Registrar.",
  InProgress: "Registrar is verifying the academic record.",
  Ready: "Document is ready for pickup at the Registrar counter.",
  Completed: "Document released and receipt acknowledged.",
  Cancelled: "Requester withdrew the application before release.",
};

const feedbackByRating = {
  1: [[], "I had to follow up twice before receiving a pickup update."],
  2: [["Clear document options"], "The request was easy to find, but the wait was longer than expected."],
  3: [["Clear requirements"], "The requirements were clear. An earlier pickup update would help."],
  4: [["Easy process", "Helpful notifications"], "The pickup notice made it easy to plan my visit."],
  5: [["Easy process", "Clear requirements", "Fast submission"], "I knew what to submit and collected the document in one visit."],
};

export function buildSampleSlaRequests(students, standards, now = new Date()) {
  const tiers = buildSlaTiers(standards);
  const workingDaysOnly = standards.workingDaysOnly !== false;
  const ratings = [5, 4, 5, 3, 5, 4, 2, 5, 4, 5];
  const activeStatuses = ["Pending", "InProgress", "Ready"];
  const records = [];

  for (const [week, volume] of weeklyVolumes.entries()) {
    for (let slot = 0; slot < volume; slot++) {
      const index = records.length;
      const docType = requestTypes[(index + week * 3) % requestTypes.length];
      const tier = getArtaClassification(docType, tiers);
      const outcome = (slot + week * 3) % 20;
      const active = week === 0 && outcome < 12 || week < 4 && outcome === 14;
      const status = active ? activeStatuses[(slot + week) % activeStatuses.length]
        : outcome === 16 ? "Cancelled" : "Completed";

      let ageDays = week * 7 + (slot * 5 + week) % 7 + 1;
      if (active && outcome === 14) {
        // Allow for weekends when choosing a request old enough to breach its target.
        ageDays = Math.max(ageDays, Math.ceil(tier.days * (workingDaysOnly ? 1.5 : 1)) + 3);
      }
      let createdAt = new Date(now.getTime() - ageDays * dayMs - (slot * 47 % 480) * 60_000);
      let deadline = calculateDeadline(createdAt, tier.days, workingDaysOnly);
      const late = outcome === 12 || outcome === 13 || outcome === 17 || (week === 3 && outcome === 18);
      let updatedAt = createdAt;
      if (status === "Completed") {
        if (late && deadline.getTime() + 3 * dayMs > now.getTime()) {
          createdAt = new Date(createdAt.getTime() - (tier.days * 2 + 3) * dayMs);
          deadline = calculateDeadline(createdAt, tier.days, workingDaysOnly);
        }
        const turnaroundMs = deadline - createdAt;
        const completionTime = late
          ? deadline.getTime() + (1 + (slot + week) % 3) * dayMs
          : Math.min(now.getTime() - 3_600_000, createdAt.getTime() + turnaroundMs * (0.3 + (slot % 6) * 0.12));
        updatedAt = new Date(completionTime);
      } else if (status !== "Pending") {
        updatedAt = new Date(createdAt.getTime() + (4 + slot % 13) * 3_600_000);
      }

      const stages = ["Pending", "InProgress", "Ready", "Completed"];
      const timeline = status === "Cancelled" ? ["Pending", "Cancelled"] : stages.slice(0, stages.indexOf(status) + 1);
      const updates = timeline.map((stage, step) => ({
        status: stage,
        message: statusNotes[stage],
        at: new Date(createdAt.getTime() + (updatedAt - createdAt) * step / Math.max(1, timeline.length - 1)),
      }));

      const rating = late ? 1 + (slot + week) % 4 : ratings[(index + week) % ratings.length];
      const [tags, comments] = feedbackByRating[rating];
      records.push({
        // Dedicated IDs keep this history independent of the original demo requests.
        legacyId: 100_001 + index,
        student: students[(index * 17 + week * 7) % students.length],
        docType,
        status,
        createdAt,
        updatedAt,
        updates,
        feedback: status === "Completed" && index % 3 !== 0
          ? { rating, tags, comments, at: new Date(Math.min(now.getTime(), updatedAt.getTime() + 2 * 3_600_000)) }
          : null,
      });
    }
  }
  return records;
}
