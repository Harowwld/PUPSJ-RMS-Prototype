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
    const statusCounts = { Pending: 0, InProgress: 0, Ready: 0, Completed: 0, Cancelled: 0 };
    const docTypeCounts = {};
    
    // SLA metrics (in hours)
    let totalCompleted = 0;
    let totalTurnaroundHours = 0;

    // Volume trend by month (last 6 months)
    const now = new Date();
    const trendMap = {};
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const sortKey = d.toISOString().substring(0, 7); // YYYY-MM
        const label = formatter.format(d); // e.g. "Apr 24"
        trendMap[sortKey] = { label, sortKey, received: 0, completed: 0 };
    }

    for (const r of (rows || [])) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      
      const dt = r.doc_type || "Unknown";
      docTypeCounts[dt] = (docTypeCounts[dt] || 0) + 1;

      const created = new Date(r.created_at);
      const updated = r.updated_at ? new Date(r.updated_at) : null;
      
      // Map to trend
      const monthKey = created.toISOString().substring(0, 7);
      if (trendMap[monthKey]) {
          trendMap[monthKey].received++;
      }

      if (r.status === "Completed" && updated) {
          const completedMonthKey = updated.toISOString().substring(0, 7);
          if (trendMap[completedMonthKey]) {
              trendMap[completedMonthKey].completed++;
          }
          const hours = Math.max(0, (updated - created) / (1000 * 60 * 60));
          totalTurnaroundHours += hours;
          totalCompleted++;
      }
    }

    const averageTurnaroundHours = totalCompleted > 0 ? (totalTurnaroundHours / totalCompleted) : null;

    const topDocTypes = Object.entries(docTypeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const volumeTrend = Object.values(trendMap);

    return NextResponse.json({
        ok: true,
        data: {
            totalRequests: rows?.length || 0,
            statusCounts,
            topDocTypes,
            volumeTrend,
            sla: {
                averageTurnaroundHours,
                totalCompleted
            }
        }
    });

  } catch (error) {
    console.error("[GET /api/analytics/document-requests Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
