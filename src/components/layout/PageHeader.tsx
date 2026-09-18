export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-4">
      <h1 className="page-title">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm font-normal text-muted">{subtitle}</p> : null}
    </header>
  );
}
