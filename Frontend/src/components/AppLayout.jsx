import { useEffect } from "react";
import {
  Home,
  Package,
  Server,
  Briefcase,
  LayoutDashboard,
  BellRing,
  Clock,
  Receipt,
  CalendarCheck,
  History,
  Users,
  Settings,
  ShoppingCart,
  FileText,
  LogIn,
  UserPlus,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
} from "lucide-react";

const iconMap = {
  Home, Package, Server, Briefcase, LayoutDashboard, BellRing, Clock, Receipt,
  CalendarCheck, History, Users, Settings, ShoppingCart, FileText, LogIn, UserPlus,
  ShieldCheck,
};

function NavIcon({ name }) {
  const Icon = iconMap[name];
  return Icon ? <Icon className="w-[18px] h-[18px]" /> : null;
}

function buildSidebarGroups(app) {
  const { currentUser, path, selectedPackage, selectedPrice, pendingPayment, bookingSent, subscriptions } = app;
  const hasCompletedBilling = (subscriptions || []).some((item) => item.status === "completed");
  const hasSubscriptions = (subscriptions || []).length > 0;

  const publicMenu = [
    { href: "/home", label: "Home", icon: "Home", hint: "services" },
    { href: "/package", label: "Packages", icon: "Package", hint: "plans" },
    { href: "/system-subscription", label: "System Subscription", icon: "Server", hint: "hire" },
    { href: "/potfolio", label: "Portfolio", icon: "Briefcase", hint: "gallery" },
  ];

  const customerFlow = [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", hint: "overview" },
    { href: "/subscription", label: "Subscription", icon: "BellRing", hint: hasSubscriptions ? "active" : "status" },
    { href: "/package", label: "Package", icon: "Package", hint: selectedPackage ? "selected" : "choose" },
    { href: "/package-time", label: "Package Time", icon: "Clock", hint: selectedPrice ? "selected" : "duration" },
    { href: "/billing", label: "Billing", icon: "Receipt", hint: pendingPayment ? "ready" : "payment" },
    { href: "/booking", label: "Booking", icon: "CalendarCheck", hint: bookingSent ? "sent" : "confirm" },
    { href: "/billing-history", label: "Billing History", icon: "History", hint: hasCompletedBilling ? "records" : "history" },
  ];

  const adminMenu = [
    { href: "/admin-dashboard", label: "Admin Dashboard", icon: "LayoutDashboard", hint: "manage" },
    { href: "/admin/users", label: "Users", icon: "Users", hint: "accounts" },
    { href: "/admin-subscription", label: "Subscriptions", icon: "BellRing", hint: "plans" },
    { href: "/system-control", label: "System Control", icon: "Settings", hint: "tenant" },
    { href: "/bookings-services", label: "Bookings", icon: "ShoppingCart", hint: "orders" },
    { href: "/booked-service", label: "Booked Service", icon: "FileText", hint: "detail" },
    { href: "/booking-history", label: "History", icon: "History", hint: "done" },
  ];

  const guestAccess = [
    { href: "/login", label: "Customer Login", icon: "LogIn", hint: "signin" },
    { href: "/register", label: "Customer Register", icon: "UserPlus", hint: "signup" },
    { href: "/admin/login", label: "Admin Login", icon: "ShieldCheck", hint: "admin" },
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
      if (item.href === "/subscription") {
        return hasSubscriptions || path === "/subscription";
      }
      if (item.href === "/billing-history") {
        return hasCompletedBilling || path === "/billing-history";
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
  const isCustomer = currentUser?.role === "customer";

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

        <button
          type="button"
          className={`sidebar-brand ${isCustomer ? "sidebar-brand-button" : ""}`}
          onClick={isCustomer ? () => handleNavigation("/profile") : undefined}
          disabled={!isCustomer}
        >
          <span className="sidebar-mark">i</span>
          <div>
            <p>{isCustomer ? currentUser?.username || "customer profile" : "infaan web & design"}</p>
            <span>
              {isCustomer
                ? currentUser?.email || "open profile"
                : currentUser
                  ? `${currentUser.role} panel`
                  : "full system"}
            </span>
          </div>
        </button>

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
                    <span className="nav-sign"><NavIcon name={item.icon} /></span>
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
                <Sun className="theme-switch-label w-[13px] h-[13px]" />
                <Moon className="theme-switch-label w-[13px] h-[13px]" />
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
              <Menu className="w-5 h-5" />
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
