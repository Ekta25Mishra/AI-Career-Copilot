
import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppLayout({ activePage, onNavigate, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleNavigate(page) {
    onNavigate(page);
    setSidebarOpen(false);
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <div className="app-topbar-row">
          <div className="app-topbar-content">
            <Topbar
              activePage={activePage}
              onMenuClick={() =>
                setSidebarOpen((current) => !current)
              }
            />
          </div>

          <button
            type="button"
            className="app-logout-button"
            onClick={onLogout}
          >
            <span>↪</span> Log out
          </button>
        </div>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
