function ProfilePage({ app }) {
  const { currentUser, subscriptions, navigate, formatPrice } = app;
  const latestSubscription = [...subscriptions].sort(
    (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)
  )[0] || null;

  return (
    <main className="main-content">
      <section className="section-card single-column-card">
        <div className="section-headline">
          <div>
            <p className="micro-label">profile</p>
            <h2>Customer information</h2>
          </div>
        </div>

        <div className="selected-credentials">
          <div className="credential-card">
            <span className="micro-label">username</span>
            <strong>{currentUser?.username || "-"}</strong>
          </div>
          <div className="credential-card">
            <span className="micro-label">full name</span>
            <strong>{`${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() || "-"}</strong>
          </div>
          <div className="credential-card">
            <span className="micro-label">email</span>
            <strong>{currentUser?.email || "-"}</strong>
          </div>
          <div className="credential-card">
            <span className="micro-label">phone number</span>
            <strong>{currentUser?.phone_number || latestSubscription?.contact_phone || "-"}</strong>
          </div>
          <div className="credential-card">
            <span className="micro-label">latest package</span>
            <strong>{latestSubscription?.package_details?.title || "No booking yet"}</strong>
          </div>
          <div className="credential-card">
            <span className="micro-label">latest payment</span>
            <strong>
              {latestSubscription?.package_details
                ? formatPrice(latestSubscription.package_details.amount, latestSubscription.package_details.currency)
                : "-"}
            </strong>
          </div>
        </div>

        <div className="hero-actions">
          <button type="button" className="solid-button" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </button>
          <button type="button" className="outline-button" onClick={() => navigate("/billing-history")}>
            Billing history
          </button>
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;
