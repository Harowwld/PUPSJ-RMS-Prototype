import { NextResponse } from "next/server";
import { dbAll } from "@/lib/sqlite";
import { verifySessionToken } from "@/lib/jwt";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const token = req.cookies.get("pup_session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await verifySessionToken(token);
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const rows = await dbAll(`
      SELECT 
        id, 
        doc_type, 
        status, 
        created_at, 
        updated_at
      FROM document_requests
    `);

    // We process analytics in memory to keep it manageable and extensible
    let startVal = startDate;
    let endVal = endDate;
    if (!startVal || !endVal) {
      const dates = (rows || [])
        .map(r => r.created_at ? String(r.created_at).substring(0, 10) : "")
        .filter(Boolean);
      if (dates.length > 0) {
        dates.sort();
        startVal = startVal || dates[0];
        endVal = endVal || dates[dates.length - 1];
      } else {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        startVal = startVal || thirtyDaysAgo.toISOString().substring(0, 10);
        endVal = endVal || today.toISOString().substring(0, 10);
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
      const startD = new Date(startVal);
      const endD = new Date(endVal);
      // Cap safety to prevent infinite loop
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

        // Weekly
        const dObj = new Date(dayStr);
        const dayOfWeek = dObj.getDay();
        const diff = dObj.getDate() - dayOfWeek;
        const startOfWeek = new Date(dObj.setDate(diff));
        const sY = startOfWeek.getFullYear();
        const sM = String(startOfWeek.getMonth() + 1).padStart(2, '0');
        const sD = String(startOfWeek.getDate()).padStart(2, '0');
        const weekKey = `${sY}-${sM}-${sD}`;
        weeklyMap[weekKey] = 0;

        curr.setDate(curr.getDate() + 1);
        iterations++;
      }
    } catch (e) {
      console.error("Error populating trend intervals:", e);
    }

    for (const r of (rows || [])) {
      // Lexicographical date filtering (User Recommendation)
      const createdDate = r.created_at ? String(r.created_at).substring(0, 10) : "";
      if (startDate && createdDate < startDate) continue;
      if (endDate && createdDate > endDate) continue;

      filteredTotalRequests++;
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      
      const dt = r.doc_type || "Unknown";
      docTypeCounts[dt] = (docTypeCounts[dt] || 0) + 1;

      if (r.status === "Completed") {
          totalCompleted++;
      }

      // Chronological Trends
      if (createdDate) {
        const [year, month] = createdDate.split("-");
        
        // Daily Grouping
        dailyMap[createdDate] = (dailyMap[createdDate] || 0) + 1;

        // Monthly Grouping
        const monthKey = `${year}-${month}`;
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;

        // Weekly Grouping
        const dObj = new Date(createdDate);
        const dayOfWeek = dObj.getDay();
        const diff = dObj.getDate() - dayOfWeek;
        const startOfWeek = new Date(dObj.setDate(diff));
        const sY = startOfWeek.getFullYear();
        const sM = String(startOfWeek.getMonth() + 1).padStart(2, '0');
        const sD = String(startOfWeek.getDate()).padStart(2, '0');
        const weekKey = `${sY}-${sM}-${sD}`;
        weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
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
    const monthlyTrend = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [, m] = key.split("-");
        return { name: monthNames[parseInt(m, 10) - 1] || m, count };
      });

    const weeklyTrend = Object.entries(weeklyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [, m, d] = key.split("-");
        return { name: `${monthNames[parseInt(m, 10) - 1] || m} ${parseInt(d, 10)}`, count };
      });

    const dailyTrend = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [, m, d] = key.split("-");
        return { name: `${monthNames[parseInt(m, 10) - 1] || m} ${parseInt(d, 10)}`, count };
      });

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
                totalCompleted
            }
        }
    });

  } catch (error) {
    console.error("[GET /api/analytics/document-requests Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
