import { query } from "./postgres.js";

/**
 * Get comprehensive student organization compliance summary for OSAS
 */
export async function getOrganizationComplianceSummary({
  status,
  category,
  search,
  complianceStatus,
  officeId = "osas",
} = {}) {
  // 1. Fetch all student organizations
  const conditions = [];
  const params = [];

  const statusList = status && status !== "All"
    ? (Array.isArray(status) ? status : String(status).split(",").map((s) => s.trim()).filter(Boolean))
    : [];

  if (statusList.length === 1) {
    params.push(statusList[0]);
    conditions.push(`so.status = $${params.length}`);
  } else if (statusList.length > 1) {
    const placeholders = statusList.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
    conditions.push(`so.status IN (${placeholders.join(", ")})`);
  } else {
    conditions.push("so.archived_at IS NULL");
  }

  const categoryList = category && category !== "All"
    ? (Array.isArray(category) ? category : String(category).split(",").map((c) => c.trim()).filter(Boolean))
    : [];

  if (categoryList.length === 1) {
    params.push(categoryList[0]);
    conditions.push(`so.category = $${params.length}`);
  } else if (categoryList.length > 1) {
    const placeholders = categoryList.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
    conditions.push(`so.category IN (${placeholders.join(", ")})`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(
      lower(so.name) LIKE $${params.length} OR
      lower(coalesce(so.acronym, '')) LIKE $${params.length} OR
      lower(coalesce(so.adviser_name, '')) LIKE $${params.length} OR
      lower(coalesce(so.adviser_email, '')) LIKE $${params.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const orgs = await query(
    `SELECT so.*
     FROM student_organizations so
     ${whereClause}
     ORDER BY so.name ASC`,
    params
  );

  // 2. Fetch all active officers grouped by organization_id
  const officers = await query(
    `SELECT id, organization_id, email, student_name, student_no, position, status, created_at
     FROM organization_officers
     ORDER BY
       CASE
         WHEN lower(position) = 'president' THEN 1
         WHEN lower(position) LIKE '%vice%' THEN 2
         WHEN lower(position) LIKE '%secretary%' THEN 3
         WHEN lower(position) LIKE '%treasurer%' THEN 4
         WHEN lower(position) LIKE '%auditor%' THEN 5
         ELSE 6
       END,
       created_at ASC`
  );

  const officersByOrg = new Map();
  for (const officer of officers) {
    const list = officersByOrg.get(officer.organization_id) || [];
    list.push(officer);
    officersByOrg.set(officer.organization_id, list);
  }

  // 3. Fetch proposals counts grouped by organization_id
  const proposalCounts = await query(
    `SELECT organization_id,
       COUNT(id)::int AS total_proposals,
       COUNT(id) FILTER (WHERE status = 'Approved')::int AS approved_proposals
     FROM event_proposals
     WHERE archived_at IS NULL AND status != 'Archived'
     GROUP BY organization_id`
  );

  const proposalsByOrg = new Map();
  for (const p of proposalCounts) {
    proposalsByOrg.set(p.organization_id, {
      total: p.total_proposals || 0,
      approved: p.approved_proposals || 0,
    });
  }

  // 4. Evaluate compliance for each organization
  let fullyCompliantCount = 0;
  let partiallyCompliantCount = 0;
  let actionRequiredCount = 0;
  let totalScoreSum = 0;
  let cblArchivedCount = 0;
  let withOfficersCount = 0;
  let withAdviserCount = 0;
  let totalActiveOfficers = 0;

  const categoryAgg = new Map();

  const evaluatedOrgs = orgs.map((so) => {
    const orgOfficers = officersByOrg.get(so.id) || [];
    const activeOfficers = orgOfficers.filter((o) => o.status === "Active");
    const pInfo = proposalsByOrg.get(so.id) || { total: 0, approved: 0 };

    const hasCbl = Boolean(so.bylaws_storage_filename);
    const hasOfficers = activeOfficers.length > 0;
    const hasAdviser = Boolean(so.adviser_name && so.adviser_name.trim() && so.adviser_email && so.adviser_email.trim());
    const isActiveStanding = so.status === "Active";

    if (hasCbl) cblArchivedCount++;
    if (hasOfficers) withOfficersCount++;
    if (hasAdviser) withAdviserCount++;
    totalActiveOfficers += activeOfficers.length;

    const checklist = {
      cbl: hasCbl,
      officers: hasOfficers,
      adviser: hasAdviser,
      activeStatus: isActiveStanding,
    };

    const metCount = (hasCbl ? 1 : 0) + (hasOfficers ? 1 : 0) + (hasAdviser ? 1 : 0) + (isActiveStanding ? 1 : 0);
    const complianceScore = Math.round((metCount / 4) * 100);
    totalScoreSum += complianceScore;

    let computedStatus = "Action Required";
    if (complianceScore === 100) {
      computedStatus = "Compliant";
      fullyCompliantCount++;
    } else if (complianceScore >= 50) {
      computedStatus = "Partially Compliant";
      partiallyCompliantCount++;
    } else {
      actionRequiredCount++;
    }

    const missingRequirements = [];
    if (!hasCbl) missingRequirements.push("Constitution & By-Laws (CBL)");
    if (!hasOfficers) missingRequirements.push("Accredited Officer Whitelist");
    if (!hasAdviser) missingRequirements.push("Designated Faculty Adviser");
    if (!isActiveStanding) missingRequirements.push("Active Accreditation Standing");

    // Category aggregation tracking
    const cat = so.category || "Academic";
    const catStats = categoryAgg.get(cat) || {
      category: cat,
      totalOrganizations: 0,
      fullyCompliantCount: 0,
      partiallyCompliantCount: 0,
      actionRequiredCount: 0,
      cblArchivedCount: 0,
      withOfficersCount: 0,
      totalScoreSum: 0,
    };
    catStats.totalOrganizations++;
    if (computedStatus === "Compliant") catStats.fullyCompliantCount++;
    else if (computedStatus === "Partially Compliant") catStats.partiallyCompliantCount++;
    else catStats.actionRequiredCount++;
    if (hasCbl) catStats.cblArchivedCount++;
    if (hasOfficers) catStats.withOfficersCount++;
    catStats.totalScoreSum += complianceScore;
    categoryAgg.set(cat, catStats);

    return {
      id: so.id,
      name: so.name,
      acronym: so.acronym,
      category: so.category || "Academic",
      status: so.status || "Active",
      adviserName: so.adviser_name || "",
      adviserEmail: so.adviser_email || "",
      description: so.description || "",
      hasCbl,
      cblFilename: so.bylaws_original_filename || (hasCbl ? `${so.acronym || so.name}-CBL.pdf` : null),
      cblStorageFilename: so.bylaws_storage_filename || null,
      cblUpdatedAt: so.bylaws_updated_at || null,
      activeOfficerCount: activeOfficers.length,
      officers: activeOfficers.map((o) => ({
        id: o.id,
        position: o.position,
        name: o.student_name || "Authorized Officer",
        email: o.email,
        studentNo: o.student_no,
      })),
      proposalCount: pInfo.total,
      approvedProposalCount: pInfo.approved,
      checklist,
      complianceScore,
      complianceStatus: computedStatus,
      missingRequirements,
      createdAt: so.created_at,
      updatedAt: so.updated_at,
    };
  });

  // Filter by compliance status if requested
  const filteredOrgs = complianceStatus && complianceStatus !== "All"
    ? evaluatedOrgs.filter((o) => o.complianceStatus.toLowerCase() === complianceStatus.toLowerCase())
    : evaluatedOrgs;

  const totalCount = orgs.length;
  const overallComplianceRate = totalCount > 0 ? Math.round(totalScoreSum / totalCount) : 0;
  const fullyCompliantRate = totalCount > 0 ? Math.round((fullyCompliantCount / totalCount) * 100) : 0;
  const cblArchivedRate = totalCount > 0 ? Math.round((cblArchivedCount / totalCount) * 100) : 0;
  const withOfficersRate = totalCount > 0 ? Math.round((withOfficersCount / totalCount) * 100) : 0;
  const withAdviserRate = totalCount > 0 ? Math.round((withAdviserCount / totalCount) * 100) : 0;

  const byCategory = Array.from(categoryAgg.values()).map((c) => ({
    category: c.category,
    totalOrganizations: c.totalOrganizations,
    fullyCompliantCount: c.fullyCompliantCount,
    complianceRate: c.totalOrganizations > 0 ? Math.round(c.totalScoreSum / c.totalOrganizations) : 0,
    cblArchivedCount: c.cblArchivedCount,
    cblArchivedRate: c.totalOrganizations > 0 ? Math.round((c.cblArchivedCount / c.totalOrganizations) * 100) : 0,
    withOfficersCount: c.withOfficersCount,
    withOfficersRate: c.totalOrganizations > 0 ? Math.round((c.withOfficersCount / c.totalOrganizations) * 100) : 0,
  })).sort((a, b) => a.category.localeCompare(b.category));

  return {
    type: "organization",
    officeId: "osas",
    officeName: "Office of Student Affairs and Services",
    summary: {
      totalOrganizations: totalCount,
      activeOrganizations: orgs.filter((o) => o.status === "Active").length,
      fullyCompliantCount,
      fullyCompliantRate,
      partiallyCompliantCount,
      actionRequiredCount,
      overallComplianceRate,
      cblArchivedCount,
      cblArchivedRate,
      withOfficersCount,
      withOfficersRate,
      withAdviserCount,
      withAdviserRate,
      totalActiveOfficers,
    },
    byCategory,
    organizations: filteredOrgs,
    meta: {
      officeId: "osas",
      officeName: "Office of Student Affairs and Services",
      generatedAt: new Date().toISOString(),
      definitions: {
        population: "Recognized student organizations registered under OSAS",
        criteriaFormula: "Institutional compliance score (0-100%) computed across 4 pillars: Archival CBL, Officer Whitelist, Faculty Adviser, and Active Standing.",
      },
      criteria: [
        {
          key: "cbl",
          label: "Archival Constitution & By-Laws (CBL)",
          description: "Official digitized CBL PDF uploaded and archived in OSAS records keeping system.",
        },
        {
          key: "officers",
          label: "Accredited Officer Whitelist",
          description: "Authorized student leadership roster whitelisted for proposal submissions and governance.",
        },
        {
          key: "adviser",
          label: "Designated Faculty Adviser",
          description: "Appointed faculty adviser with verified name and institutional email address.",
        },
        {
          key: "activeStatus",
          label: "Active Accreditation Standing",
          description: "Official recognized standing without probationary or disciplinary sanctions.",
        },
      ],
    },
  };
}
