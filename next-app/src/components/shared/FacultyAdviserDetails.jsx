export default function FacultyAdviserDetails({ name, email }) {
  return (
    <>
      <div className="truncate text-xs font-medium text-gray-900 dark:text-zinc-100" title={name}>
        {name || <span className="italic text-gray-400">Not assigned</span>}
      </div>
      {email && (
        <div
          className="mt-0.5 truncate font-sans text-[11px] tabular-nums text-gray-400 dark:text-zinc-500"
          title={email}
        >
          {email}
        </div>
      )}
    </>
  );
}
