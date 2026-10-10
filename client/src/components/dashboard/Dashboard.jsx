import { metrics, actions } from '../../data/dashboard';
import MetricCard from './MetricCard';
import ActionCard from './ActionCard';
import WelcomeBanner from './WelcomeBanner';

export default function Dashboard({ onNavigate }) {
  return (
    <>
      <WelcomeBanner onNavigate={onNavigate} />

      <section className="metrics-grid" aria-label="Career metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR NEXT STEPS</span>
            <h2>Build your career, one step at a time.</h2>
            <p>Everything you need to move forward, all in one place.</p>
          </div>
          <span className="section-count">04 TOOLS</span>
        </div>

        <div className="actions-grid">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </section>

      <section className="bottom-note">
        <span className="bottom-note-icon">✳</span>
        <p>
          <strong>Your journey doesn't need to be perfect.</strong>{' '}
          It just needs a starting point.
        </p>
      </section>
    </>
  );
}
