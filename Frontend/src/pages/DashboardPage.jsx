function DashboardPage({ app }) {
  const { currentUser, subscriptions, selectedPackage, navigate, formatPrice } = app;
  const activeSubscription = [...subscriptions].sort(
    (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)
  )[0] || null;
  const packageDetails = activeSubscription?.package_details;
  const workChecklist = selectedPackage?.features || [];

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">dashboard</p>
          <h2>Customer Dashboard</h2>
        </div>
        <div className="profile-card dashboard-summary">
          <span className="profile-sign">iwd</span>
          <h3>{currentUser?.username || "Guest"}</h3>
          <p>
            {activeSubscription
              ? "Track your booking, payment approval, and service workflow below."
              : "Choose a package, select package time, follow the manual payment instructions, and send your booking to admin."}
          </p>
          <div className="hero-actions">
            <button type="button" className="solid-button" onClick={() => navigate(activeSubscription ? "/package" : "/home")}>
              {activeSubscription ? "View selected package" : "Browse packages"}
            </button>
            <button type="button" className="outline-button" onClick={() => navigate("/booking")}>
              View booking status
            </button>
          </div>
        </div>

        <div className="admin-grid dashboard-work-grid">
          <div className="subscription-card">
            <p className="micro-label">selected package</p>
            <strong>{packageDetails?.title || selectedPackage?.title || "No package selected yet"}</strong>
            <p>{packageDetails?.service || app.selectedService?.name || "Choose one of the Infaan packages to begin."}</p>
            <p>
              {packageDetails
                ? `${packageDetails.billing_period} · ${formatPrice(packageDetails.amount, packageDetails.currency)}`
                : "Weekly, monthly, and yearly plans are available according to the package."}
            </p>
            <span className={`status-pill status-${activeSubscription?.status || "pending"}`}>
              {activeSubscription?.status || "not booked"}
            </span>
            {activeSubscription?.payment_status === "pending" ? <p>Payment is waiting for manual verification from admin.</p> : null}
          </div>

          <div className="subscription-card">
            <p className="micro-label">customer credentials</p>
            <strong>{currentUser?.first_name || currentUser?.username}</strong>
            <p>{currentUser?.email || "No email available"}</p>
            <p>{activeSubscription?.contact_phone || "Add your phone number during billing."}</p>
            <button type="button" className="outline-button" onClick={() => navigate(activeSubscription ? "/billing" : "/package")}>
              {activeSubscription ? "Update billing details" : "Continue setup"}
            </button>
          </div>
        </div>

        <div className="section-card dashboard-flow-card">
          <div className="section-headline">
            <div>
              <p className="micro-label">work according to package</p>
              <h2>Service Workflow</h2>
            </div>
          </div>

          {workChecklist.length ? (
            <div className="dashboard-task-grid">
              {workChecklist.map((feature, index) => (
                <div key={feature} className="subscription-card">
                  <p className="micro-label">step {index + 1}</p>
                  <strong>{feature}</strong>
                  <p>
                    {activeSubscription
                      ? "This work item is included in your selected package and is now visible to admin through your booking."
                      : "This work item will appear in your dashboard after you finish subscription, billing, and booking."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="form-card">
              <h3>No package workflow yet</h3>
              <p>Select a package first so we can show the full work list according to your chosen service.</p>
              <button type="button" className="solid-button" onClick={() => navigate("/package")}>Choose package</button>
            </div>
          )}
        </div>

        <div className="subscription-stack">
          {subscriptions.map((item) => (
            <div key={item.id} className="subscription-card">
              <strong>{item.package_details?.title}</strong>
              <p>{item.business_name}</p>
              <p>{item.package_details?.service}</p>
              <p>
                {item.package_details?.billing_period} -{" "}
                {formatPrice(item.package_details?.amount, item.package_details?.currency)}
              </p>
              <span className={`status-pill status-${item.status}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
