import { cookies } from "next/headers";
import { readInitialLoaderPreference } from "@/lib/readInitialLoaderPreference";

export default async function DashboardLoaderLayout({ children }) {
  const loader = await readInitialLoaderPreference(await cookies());
  return (
    <div id="dashboard-loader-scope" className="contents" data-initial-loader={loader}>
      {children}
    </div>
  );
}
