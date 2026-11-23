import DashboardShellSkeleton from "@/components/shared/DashboardShellSkeleton";
import WorkspaceLoading from "@/components/shared/WorkspaceLoading";

export default function InitialDashboardLoader({ children = <DashboardShellSkeleton /> }) {
  return (
    <>
      <div className="initial-loader-skeleton">{children}</div>
      <div className="initial-loader-workspace"><WorkspaceLoading /></div>
    </>
  );
}
