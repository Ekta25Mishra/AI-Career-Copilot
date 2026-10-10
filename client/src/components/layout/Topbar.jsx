
import { useState } from 'react';
import Icon from '../common/Icon';

export default function Topbar({ onMenuClick, activePage }) {
  const [search, setSearch] = useState('');

  return (
    <header className="topbar">
      <button
      type='button'
        className="mobile-menu icon-button"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        ☰
      </button>

      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-divider">/</span>
        <strong>
          {activePage === 'dashboard'
            ? 'Overview'
            : activePage.charAt(0).toUpperCase() + activePage.slice(1)}
        </strong>
      </div>

      <div className="topbar-actions">
        <label className="search-box">
          <Icon>⌕</Icon>
          <input
            type="search"
            placeholder="Search your workspace..."
            aria-label="Search workspace"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="search-shortcut">/</span>
        </label>

        <button
          className="icon-button notification-button"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => window.alert('You are all caught up!')}
        >
          ♧
          <span className="notification-dot" />
        </button>
      </div>
    </header>
  );
}
