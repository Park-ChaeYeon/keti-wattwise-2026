type DashboardFrameProps = {
  src: string;
  title: string;
  description: string;
  height?: string;
};

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function DashboardFrame({ src, title, description, height = "calc(100vh - 200px)" }: DashboardFrameProps) {
  const href = `${BP}${src}`;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <a href={href} target="_blank" rel="noreferrer" className="btn-ghost text-xs">새 창에서 열기 ↗</a>
      </div>
      <iframe
        src={href}
        title={title}
        className="w-full rounded-xl border border-slate-200 bg-white shadow-card"
        style={{ height, minHeight: 560 }}
      />
    </section>
  );
}
