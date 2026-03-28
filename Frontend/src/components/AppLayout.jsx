const navLinks = [
  ["/home", "Home"],
  ["/package", "Package"],
  ["/package-time", "Package Time"],
  ["/billing", "Billing"],
  ["/booking", "Booking"],
  ["/dashboard", "Dashboard"],
  ["/login", "Login"],
  ["/register", "Register"],
  ["/admin/login", "Admin Login"],
  ["/admin/register", "Admin Register"],
  ["/admin-dashboard", "Admin Dashboard"],
  ["/admin/users", "Admin Users"],
  ["/bookings-services", "Bookings Services"],
];

function AppLayout({ app, children }) {
  const { currentUser, sidebarOpen, setSidebarOpen, navigate, logout, feedback, error } = app;

  return (
    <div className={`shell ${sidebarOpen ? "shell-sidebar-open" : "shell-sidebar-closed"}`}>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="sidebar-brand">
          <span className="sidebar-mark">i</span>
          <div>
            <p>infaan web & design</p>
            <span>full system</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map(([href, label]) => (
            <button key={href} type="button" className="nav-link" onClick={() => navigate(href)}>
              <span className="nav-dot" />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>Web services, digital ads, logo and poster packages, bookings and dashboards.</p>
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
              <h1>{window.location.pathname.replaceAll("/", " ").trim() || "home"}</h1>
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
              <button type="button" className="header-button" onClick={() => navigate("/login")}>
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
