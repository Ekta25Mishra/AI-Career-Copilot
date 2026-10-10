
import { navGroups } from "../../data/navigation";
import Icon from "../common/Icon";

export default function Sidebar({
  activePage,
  onNavigate,
  open = false,
  onClose,
}) {
  function navigateTo(page) {
    onNavigate(page);
    onClose?.();
  }

  return (
    <>
      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        aria-label="Main sidebar"
      >
        <a
          className="brand"
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("dashboard");
          }}
        >
          <span className="brand-mark">c</span>

          <span className="brand-copy">
            <strong>
              career<span>copilot</span>
            </strong>
            <small>YOUR CAREER, IN FOCUS</small>
          </span>
        </a>

        <div className="sidebar-profile">
          <div className="profile-avatar">CC</div>

          <div className="profile-copy">
            <strong>Career workspace</strong>
            <span>Your personal dashboard</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>

              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`nav-item ${
                    activePage === item.id ? "nav-item-active" : ""
                  }`}
                  onClick={() => navigateTo(item.id)}
                >
                  <Icon>{item.icon}</Icon>
                  <span>{item.label}</span>

                  {activePage === item.id && (
                    <span className="active-indicator" />
                  )}
                </button>
              ))}
            </div>
          ))}

          <div className="nav-group">
            <p className="nav-label">ACCOUNT</p>

            <button
              type="button"
              className={`nav-item ${
                activePage === "profile" ? "nav-item-active" : ""
              }`}
              onClick={() => navigateTo("profile")}
            >
              <Icon>U</Icon>
              <span>My Profile</span>

              {activePage === "profile" && (
                <span className="active-indicator" />
              )}
            </button>
          </div>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">✳</span>
            <strong>Small steps add up.</strong>
            <p>
              Your career grows with every skill you build.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
