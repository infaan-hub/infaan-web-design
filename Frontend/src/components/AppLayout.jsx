function buildSidebarGroups(app) {
  const { currentUser, path, selectedPackage, selectedPrice, pendingPayment, bookingSent } = app;

  const publicMenu = [
    { href: "/home", label: "Home", sign: "⌂", hint: "services" },
    { href: "/package", label: "Packages", sign: "◫", hint: "plans" },
    { href: "/potfolio", label: "Portfolio", sign: "◩", hint: "gallery" },
  ];

  const customerFlow = [
    { href: "/dashboard", label: "Dashboard", sign: "◈", hint: "overview" },
    { href: "/package", label: "Package", sign: "◫", hint: selectedPackage ? "selected" : "choose" },
    { href: "/package-time", label: "Package Time", sign: "◷", hint: selectedPrice ? "selected" : "duration" },
    { href: "/billing", label: "Billing", sign: "◳", hint: pendingPayment ? "ready" : "payment" },
    { href: "/booking", label: "Booking", sign: "✓", hint: bookingSent ? "sent" : "confirm" },
  ];

  const adminMenu = [
    { href: "/admin-dashboard", label: "Admin Dashboard", sign: "◈", hint: "manage" },
    { href: "/admin/users", label: "Users", sign: "☺", hint: "accounts" },
    { href: "/bookings-services", label: "Bookings", sign: "▤", hint: "orders" },
    { href: "/booked-service", label: "Booked Service", sign: "◉", hint: "detail" },
    { href: "/booking-history", label: "History", sign: "⟲", hint: "done" },
  ];

  const guestAccess = [
    { href: "/login", label: "Customer Login", sign: "→", hint: "signin" },
    { href: "/register", label: "Customer Register", sign: "+", hint: "signup" },
    { href: "/admin/login", label: "Admin Login", sign: "◇", hint: "signin" },
  ];

  if (currentUser?.role === "admin") {
    return [
      { title: "Menu", items: adminMenu },
      { title: "Public", items: publicMenu },
    ];
  }

  if (currentUser?.role === "customer") {
    const flowItems = customerFlow.filter((item) => {
      if (item.href === "/package-time") {
        return Boolean(selectedPackage) || path === "/package-time" || path === "/billing" || path === "/booking";
      }
      if (item.href === "/billing") {
        return Boolean(selectedPackage && selectedPrice) || path === "/billing" || path === "/booking";
      }
      if (item.href === "/booking") {
        return Boolean(selectedPackage && selectedPrice) || Boolean(pendingPayment) || bookingSent || path === "/booking";
      }
      return true;
    });

    return [
      { title: "Menu", items: flowItems },
      { title: "Browse", items: publicMenu },
    ];
  }

  const authPages = ["/login", "/register", "/admin/login"];
  const guestPrimary = authPages.includes(path) ? guestAccess : publicMenu;
  const guestSecondary = authPages.includes(path) ? publicMenu : guestAccess;

  return [
    { title: authPages.includes(path) ? "Access" : "Browse", items: guestPrimary },
    { title: authPages.includes(path) ? "Browse" : "Access", items: guestSecondary },
  ];
}

function AppLayout({ app, children }) {
  const { currentUser, sidebarOpen, setSidebarOpen, navigate, logout, feedback, error, path, theme, setTheme } = app;
  const sidebarGroups = buildSidebarGroups(app);

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
            <span>{currentUser ? `${currentUser.role} panel` : "full system"}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="nav-group">
              <p className="sidebar-group-title">{group.title}</p>
              <div className="sidebar-group-card">
                {group.items.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    className={`nav-link ${path === item.href ? "nav-link-active" : ""}`}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <span className="nav-sign">{item.sign}</span>
                    <span className="nav-label-wrap">
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-account-block">
            {currentUser ? (
              <>
                <span className="role-chip">{currentUser.role}</span>
                <button type="button" className="header-button sidebar-auth-button" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <button type="button" className="header-button sidebar-auth-button" onClick={() => handleNavigation("/login")}>
                Sign in
              </button>
            )}
          </div>

          <div className="sidebar-utility-row">
            <button
              type="button"
              className={`theme-switch ${theme === "dark" ? "theme-switch-dark" : ""}`}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-pressed={theme === "dark"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <span className="theme-switch-track">
                <span className="theme-switch-label">☼</span>
                <span className="theme-switch-label">◐</span>
                <span className="theme-switch-thumb" />
              </span>
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
            <h1>Infaan Web & Design</h1>
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
