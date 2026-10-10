
export default function WelcomeBanner({ onNavigate }) {
  return (
    <section className="welcome-banner">
      <div className="welcome-copy">
        <span className="eyebrow">YOUR CAREER WORKSPACE</span>
        <h1>Your next chapter<br />starts here.</h1>
        <p>
          A clearer path to your career goals starts with understanding
          where you are and deciding where to go next.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => onNavigate('resume')}
        >
          Analyze my resume <span>↗</span>
        </button>
      </div>

      <div className="welcome-art" aria-hidden="true">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-circle">
          <div className="art-leaf">✳</div>
        </div>

        <div className="art-note art-note-top">
          <span className="art-note-icon">✓</span>
          <div>
            <strong>Clear direction</strong>
            <small>One step at a time</small>
          </div>
        </div>

        <div className="art-note art-note-bottom">
          <span className="art-note-icon">↗</span>
          <div>
            <strong>Keep growing</strong>
            <small>Your journey, your pace</small>
          </div>
        </div>

        <span className="art-spark spark-one">✳</span>
        <span className="art-spark spark-two">✦</span>
      </div>

      <div className="banner-decoration" />
    </section>
  );
}
