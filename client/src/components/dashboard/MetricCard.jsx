
import Icon from '../common/Icon';

export default function MetricCard({ metric }) {
  return (
    <article className="metric-card card">
      <div className="metric-top">
        <span className="metric-label">{metric.label}</span>
        <span className="metric-icon">
          <Icon>{metric.icon}</Icon>
        </span>
      </div>

      <strong className="metric-value">{metric.value}</strong>
      <span className="metric-note">{metric.note}</span>
    </article>
  );
}
