import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  gradient: string;
  detail?: string;
  negative?: boolean;
};

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  gradient,
  detail,
  negative = false,
}: StatsCardProps) {
  return (
    <article
      className="metric-card stats-card"
      style={{ "--stats-gradient": gradient } as CSSProperties}
    >
      <div className="metric-top">
        <span>{title}</span>
        <span className="stats-icon"><Icon size={18} /></span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        <span className={negative ? "negative" : "positive"}>
          <ArrowUpRight size={14} /> {change}%
        </span>
        <span>vs. mês anterior</span>
      </div>
      {detail && <small className="metric-caption">{detail}</small>}
    </article>
  );
}
