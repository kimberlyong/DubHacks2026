export default function ComingSoon({ title, note }) {
  return (
    <div className="border border-dashed border-black p-4 dark:border-white">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{note ?? "Coming soon."}</p>
    </div>
  );
}
