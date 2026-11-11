/** Neutral authentication state, before the user's navigation is available. */
export default function WorkspaceLoading() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-slate-50 px-6 font-jakarta dark:bg-zinc-950">
      <div role="status" aria-live="polite" className="flex items-center gap-3 text-[13px] font-medium text-gray-500 dark:text-zinc-400">
        <span aria-hidden="true" className="size-2 rounded-full bg-current motion-safe:animate-pulse" />
        <span>Loading workspace…</span>
      </div>
    </div>
  );
}
