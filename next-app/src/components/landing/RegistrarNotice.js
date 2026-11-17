export default function RegistrarNotice({ title, description, className = "" }) {
  return (
    <aside aria-label="Registrar notice" className={`bg-[#f5f5f7] px-5 py-3 text-center text-sm text-[#1d1d1f] ${className}`}>
      <p className="mx-auto max-w-5xl whitespace-pre-line break-words">
        <strong className="font-semibold text-[#800000]">{title}:</strong>{" "}{description}
      </p>
    </aside>
  );
}
