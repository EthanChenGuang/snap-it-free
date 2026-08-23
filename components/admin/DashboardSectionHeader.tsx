import Link from 'next/link';

type DashboardSectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  titleHref?: string;
};

export function DashboardSectionHeader({
  title,
  subtitle,
  action,
  titleHref,
}: DashboardSectionHeaderProps) {
  const titleNode = titleHref ? (
    <Link href={titleHref} className="dashboard-section-header-title-link">
      <h2 className="dashboard-section-header-title">{title}</h2>
    </Link>
  ) : (
    <h2 className="dashboard-section-header-title">{title}</h2>
  );

  return (
    <div className="dashboard-section-header">
      <div>
        {titleNode}
        {subtitle ? <p className="dashboard-section-header-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
