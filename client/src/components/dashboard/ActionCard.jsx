
import Icon from '../common/Icon';

export default function ActionCard({ action, onNavigate }) {
  return (
    <button
      className="action-card card"
      onClick={() => onNavigate(action.id)}
    >
      <div className="action-card-top">
        <span className="action-icon">
          <Icon>{action.icon}</Icon>
        </span>
        <span className="action-number">{action.number}</span>
      </div>

      <h3>{action.title}</h3>
      <p>{action.description}</p>

      <span className="action-link">
        {action.link} <span>↗</span>
      </span>
    </button>
  );
}