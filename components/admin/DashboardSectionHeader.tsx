type DashboardSectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function DashboardSectionHeader({ title, subtitle, action }: DashboardSectionHeaderProps) {
  return (
    <div className="dashboard-section-header">
      <div>
        <h2 className="dashboard-section-header-title">{title}</h2>
        {subtitle ? <p className="dashboard-section-header-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
