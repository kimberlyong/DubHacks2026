export default function ComingSoon({ title, note }) {
  return (
    <div className="rounded-xl border border-dashed border-theme-border p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-theme-muted">{note ?? "Coming soon."}</p>
    </div>
  );
}
