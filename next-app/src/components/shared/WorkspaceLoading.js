import styles from "./WorkspaceLoading.module.css";

export function WorkspaceLoaderMark({ variant }) {
  return (
    <span aria-hidden="true" data-variant={variant} className={`${styles.logo} ${variant ? "size-10" : "size-16 text-gray-900 dark:text-white"}`}>
      <span />
      <span />
      <span />
    </span>
  );
}

/** Neutral authentication state, before the user's navigation is available. */
export default function WorkspaceLoading() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-white px-6 font-jakarta dark:bg-zinc-950">
      <div role="status" className="flex flex-col items-center gap-3 text-[13px] font-medium text-gray-500 dark:text-zinc-400">
        <WorkspaceLoaderMark />
        <span>Opening eManage…</span>
      </div>
    </div>
  );
}
