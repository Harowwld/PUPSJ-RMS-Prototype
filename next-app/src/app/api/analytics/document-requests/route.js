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
    const statusCounts = { Pending: 0, InProgress: 0, Ready: 0, Completed: 0, Cancelled: 0 };
    const docTypeCounts = {};
    
    // Summary metrics
    let totalCompleted = 0;
    let filteredTotalRequests = 0;

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
    }

    const sortedDocTypes = Object.entries(docTypeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    let topDocTypes = sortedDocTypes.slice(0, 7);
    
    if (sortedDocTypes.length > 7) {
        const othersCount = sortedDocTypes.slice(7).reduce((acc, curr) => acc + curr.count, 0);
        topDocTypes.push({ name: "Others", count: othersCount });
    }

    return NextResponse.json({
        ok: true,
        data: {
            totalRequests: filteredTotalRequests,
            statusCounts,
            topDocTypes,
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
