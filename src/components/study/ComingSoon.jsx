export default function ComingSoon({ title, note }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-theme-surface-2 px-6 py-10 text-center">
      <span aria-hidden="true" className="text-3xl">🌱</span>
      <p className="mt-3 font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-theme-muted">{note ?? "Still growing. This one's coming soon."}</p>
    </div>
  );
}
