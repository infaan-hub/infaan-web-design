const sidebarLinks = [
  { href: "/home", label: "Home", sign: "HM" },
  { href: "/admin/register", label: "Admin Register", sign: "AR" },
  { href: "/admin/login", label: "Admin Login", sign: "AL" },
  { href: "/register", label: "Register", sign: "RG" },
  { href: "/login", label: "Login", sign: "LG" },
];

function AppLayout({ app, children }) {
  const { currentUser, sidebarOpen, setSidebarOpen, navigate, logout, feedback, error, path, theme, setTheme } = app;

  function handleNavigation(nextPath) {
    navigate(nextPath);
    setSidebarOpen(false);
  }

  return (
    <div className={`shell ${sidebarOpen ? "shell-sidebar-open" : "shell-sidebar-closed"}`}>
      <button
        type="button"
        className={`sidebar-backdrop ${sidebarOpen ? "sidebar-backdrop-visible" : ""}`}
        aria-label="Close sidebar"
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="sidebar-window-dots">
          <span />
          <span />
          <span />
        </div>

        <div className="sidebar-brand">
          <span className="sidebar-mark">i</span>
          <div>
            <p>infaan web & design</p>
            <span>full system</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-group-card">
            {sidebarLinks.map((item) => (
              <button
                key={item.href}
                type="button"
                className={`nav-link ${path === item.href ? "nav-link-active" : ""}`}
                onClick={() => handleNavigation(item.href)}
              >
                <span className="nav-sign">{item.sign}</span>
                <span className="nav-label-wrap">
                  <strong>{item.label}</strong>
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-utility-row">
            <button
              type="button"
              className="sidebar-icon-button"
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              Theme
            </button>
          </div>
        </div>
      </aside>

      <div className="page">
        <header className="thin-header">
          <div className="header-left">
            <button type="button" className="menu-toggle" onClick={() => setSidebarOpen((value) => !value)}>
              <span />
              <span />
              <span />
            </button>
            <div>
              <p className="micro-label">infaan web & design</p>
              <h1>Infaan Web & Design</h1>
            </div>
          </div>

          <div className="header-right">
            {currentUser ? (
              <>
                <span className="role-chip">{currentUser.role}</span>
                <button type="button" className="header-button" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <button type="button" className="header-button" onClick={() => handleNavigation("/login")}>
                Sign in
              </button>
            )}
          </div>
        </header>

        {(feedback || error) && (
          <section className={`notice ${error ? "notice-error" : "notice-success"}`}>{error || feedback}</section>
        )}

        {children}
      </div>
    </div>
  );
}

export default AppLayout;
