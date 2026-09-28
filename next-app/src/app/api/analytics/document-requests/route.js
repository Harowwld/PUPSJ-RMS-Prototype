import { NextResponse } from "next/server";
import {
  getPrincipalOfficeId,
  requireAdmin,
  createAuthErrorResponse,
} from "@/lib/authHelpers";
import { isSystemAdminRole } from "@/lib/roleUtils";
import { dbAll } from "@/lib/postgresCompat";
import { getRequestCharterStatus, buildSlaTiers } from "@/lib/citizenCharter";
import { slaStandardsRepo } from "@/lib/slaStandardsRepo";

export const runtime = "nodejs";

const phDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toIsoDateString(val) {
  if (!val) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    try {
      return phDateFormatter.format(val);
    } catch {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    try {
      return phDateFormatter.format(parsed);
    } catch {
      return s.substring(0, 10);
    }
  }
  return "";
}

function parseIsoDateLocal(isoDateStr) {
  if (!isoDateStr) return null;
  const parts = isoDateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getWeekKey(d) {
  const dObj = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOfWeek = dObj.getDay();
  dObj.setDate(dObj.getDate() - dayOfWeek);
  const y = dObj.getFullYear();
  const m = String(dObj.getMonth() + 1).padStart(2, "0");
  const day = String(dObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const officeId = isSystemAdminRole(access.user.role) ? null : getPrincipalOfficeId(access.user);
    if (!isSystemAdminRole(access.user.role) && !officeId) {
      return createAuthErrorResponse("Office scope is required", 403);
    }
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const standards = await slaStandardsRepo.getStandards();
    const tiers = buildSlaTiers(standards);

    const officeFilter = officeId ? "WHERE dr.office_id = ?" : "";
    const rows = await dbAll(`
      SELECT 
        dr.id, 
        dr.doc_type, 
        dr.status, 
        dr.created_at, 
        dr.updated_at,
        f.rating AS feedback_rating,
        f.aspect_tags AS feedback_aspect_tags,
        f.comments AS feedback_comments
      FROM document_requests dr
      LEFT JOIN document_request_feedback f ON f.document_request_id = dr.id
      ${officeFilter}
    `, officeId ? [officeId] : []);

    // Normalize date filters
    let normStartDate = startDate ? toIsoDateString(startDate) : "";
    let normEndDate = endDate ? toIsoDateString(endDate) : "";
    if (normStartDate && normEndDate && normStartDate > normEndDate) {
      const temp = normStartDate;
      normStartDate = normEndDate;
      normEndDate = temp;
    }

    let startVal = normStartDate;
    let endVal = normEndDate;
    if (!startVal || !endVal) {
      const dates = (rows || [])
        .map(r => toIsoDateString(r.created_at))
        .filter(Boolean);
      if (dates.length > 0) {
        dates.sort();
        startVal = startVal || dates[0];
        endVal = endVal || dates[dates.length - 1];
      } else {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        startVal = startVal || toIsoDateString(thirtyDaysAgo);
        endVal = endVal || toIsoDateString(today);
      }
    }

    const statusCounts = { Pending: 0, InProgress: 0, Ready: 0, Completed: 0, Cancelled: 0 };
    const docTypeCounts = {};
    let totalCompleted = 0;
    let filteredTotalRequests = 0;
    const monthlyMap = {};
    const weeklyMap = {};
    const dailyMap = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Pre-populate maps with 0s for all intervals in the date range
    try {
      const startD = parseIsoDateLocal(startVal);
      const endD = parseIsoDateLocal(endVal);
      if (startD && endD) {
        let curr = new Date(startD);
        const maxDays = 500;
        let iterations = 0;

        while (curr <= endD && iterations < maxDays) {
          const yyyy = curr.getFullYear();
          const mm = String(curr.getMonth() + 1).padStart(2, '0');
          const dd = String(curr.getDate()).padStart(2, '0');
          const dayStr = `${yyyy}-${mm}-${dd}`;

          dailyMap[dayStr] = 0;

          const monthKey = `${yyyy}-${mm}`;
          monthlyMap[monthKey] = 0;

          const weekKey = getWeekKey(curr);
          weeklyMap[weekKey] = 0;

          curr.setDate(curr.getDate() + 1);
          iterations++;
        }
      }
    } catch (e) {
      console.error("Error populating trend intervals:", e);
    }

    let compliantCompleted = 0;
    let delayedCompleted = 0;
    let activeOverdue = 0;
    let activeDueSoon = 0;
    const tierStats = {
      Simple: { total: 0, compliant: 0, label: tiers.SIMPLE.shortLabel, days: tiers.SIMPLE.days },
      Complex: { total: 0, compliant: 0, label: tiers.COMPLEX.shortLabel, days: tiers.COMPLEX.days },
      HighlyTechnical: { total: 0, compliant: 0, label: tiers.HIGHLY_TECHNICAL.shortLabel, days: tiers.HIGHLY_TECHNICAL.days },
    };

    let feedbackTotal = 0;
    let feedbackSum = 0;
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const aspectCounts = {};

    for (const r of (rows || [])) {
      // Robust ISO date filtering
      const createdDate = toIsoDateString(r.created_at);
      if (normStartDate && createdDate < normStartDate) continue;
      if (normEndDate && createdDate > normEndDate) continue;

      filteredTotalRequests++;
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      
      const dt = r.doc_type || "Unknown";
      docTypeCounts[dt] = (docTypeCounts[dt] || 0) + 1;

      if (r.status === "Completed") {
          totalCompleted++;
      }

      // Dynamic Service Standards / Citizen's Charter Status Evaluation
      const charter = getRequestCharterStatus(r, standards);
      const tierKey = charter.tier.key;
      if (tierStats[tierKey]) {
        tierStats[tierKey].total++;
        if (charter.isCompliant) {
          tierStats[tierKey].compliant++;
        }
      }

      // Aggregate Student Rating & Feedback
      if (r.feedback_rating !== null && r.feedback_rating !== undefined) {
        const star = Number(r.feedback_rating);
        if (Number.isInteger(star) && star >= 1 && star <= 5) {
          feedbackTotal++;
          feedbackSum += star;
          ratingBreakdown[star] = (ratingBreakdown[star] || 0) + 1;

          let tags = r.feedback_aspect_tags;
          if (typeof tags === "string") {
            try {
              tags = JSON.parse(tags);
            } catch {
              tags = tags.replace(/[{}]/g, "").split(",").map((t) => t.trim().replace(/^"|"$/g, "")).filter(Boolean);
            }
          }
          if (Array.isArray(tags)) {
            for (const t of tags) {
              const cleanTag = String(t).trim();
              if (cleanTag) {
                aspectCounts[cleanTag] = (aspectCounts[cleanTag] || 0) + 1;
              }
            }
          }
        }
      }

      if (r.status === "Completed") {
        if (charter.isCompliant) {
          compliantCompleted++;
        } else {
          delayedCompleted++;
        }
      } else if (!["Cancelled", "Shredded"].includes(r.status)) {
        if (charter.isOverdue) {
          activeOverdue++;
        } else if (charter.isDueSoon) {
          activeDueSoon++;
        }
      }

      // Chronological Trends
      if (createdDate) {
        const parts = createdDate.split("-");
        const year = parts[0];
        const month = parts[1];
        
        // Daily Grouping
        dailyMap[createdDate] = (dailyMap[createdDate] || 0) + 1;

        // Monthly Grouping
        if (year && month) {
          const monthKey = `${year}-${month}`;
          monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
        }

        // Weekly Grouping
        const dObj = parseIsoDateLocal(createdDate);
        if (dObj) {
          const weekKey = getWeekKey(dObj);
          weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
        }
      }
    }

    const sortedDocTypes = Object.entries(docTypeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    let topDocTypes = sortedDocTypes.slice(0, 7);
    
    if (sortedDocTypes.length > 7) {
        const othersCount = sortedDocTypes.slice(7).reduce((acc, curr) => acc + curr.count, 0);
        topDocTypes.push({ name: "Others", count: othersCount });
    }

    // Format and Sort Trends
    const showYear = startVal && endVal && startVal.substring(0, 4) !== endVal.substring(0, 4);

    const monthlyTrend = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const parts = key.split("-");
        const mIdx = parseInt(parts[1], 10) - 1;
        const monthName = (mIdx >= 0 && mIdx < 12) ? monthNames[mIdx] : (parts[1] || "—");
        const name = showYear && parts[0] ? `${monthName} ${parts[0]}` : monthName;
        return { name, count };
      });

    const weeklyTrend = Object.entries(weeklyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const parts = key.split("-");
        const mIdx = parseInt(parts[1], 10) - 1;
        const monthName = (mIdx >= 0 && mIdx < 12) ? monthNames[mIdx] : (parts[1] || "—");
        const dayNum = parseInt(parts[2], 10);
        const name = `${monthName} ${isNaN(dayNum) ? "" : dayNum}`.trim();
        return { name: name || key, count };
      });

    const dailyTrend = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const parts = key.split("-");
        const mIdx = parseInt(parts[1], 10) - 1;
        const monthName = (mIdx >= 0 && mIdx < 12) ? monthNames[mIdx] : (parts[1] || "—");
        const dayNum = parseInt(parts[2], 10);
        const name = `${monthName} ${isNaN(dayNum) ? "" : dayNum}`.trim();
        return { name: name || key, count };
      });

    const overallComplianceRate = totalCompleted > 0
      ? Math.round((compliantCompleted / totalCompleted) * 100)
      : 100;

    const averageRating = feedbackTotal > 0 ? Number((feedbackSum / feedbackTotal).toFixed(1)) : 0;
    const positiveReviews = (ratingBreakdown[4] || 0) + (ratingBreakdown[5] || 0);
    const satisfactionRate = feedbackTotal > 0 ? Math.round((positiveReviews / feedbackTotal) * 100) : 0;

    const ASPECT_LABELS = {
      speed: "Fast Turnaround",
      clarity: "Clear Steps",
      staff_courtesy: "Courteous Staff",
      ease_of_use: "Easy to Use",
      accuracy: "Accurate Records",
      portal_ui: "Clean Portal UI",
      delayed: "Slow Response",
      confusing: "Confusing Steps",
      unclear_requirements: "Unclear Requirements",
      portal_bug: "Portal Issue",
    };

    const sortedAspects = Object.entries(aspectCounts)
      .map(([tag, count]) => ({
        tag,
        label: ASPECT_LABELS[tag] || tag.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        count,
        percentage: feedbackTotal > 0 ? Math.round((count / feedbackTotal) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const feedbackData = {
      totalResponses: feedbackTotal,
      averageRating,
      satisfactionRate,
      ratingBreakdown,
      topAspects: sortedAspects.slice(0, 6),
    };

    return NextResponse.json({
        ok: true,
        data: {
            totalRequests: filteredTotalRequests,
            statusCounts,
            topDocTypes,
            trends: {
                monthly: monthlyTrend,
                weekly: weeklyTrend,
                daily: dailyTrend
            },
            sla: {
                totalCompleted,
                compliantCompleted,
                delayedCompleted,
                activeOverdue,
                activeDueSoon,
                complianceRate: overallComplianceRate,
                tierStats,
                standards,
            },
            feedback: feedbackData
        }
    });

  } catch (error) {
    console.error("[GET /api/analytics/document-requests Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
