function DashboardPage({ app }) {
  const { currentUser, subscriptions, navigate } = app;

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">dashboard</p>
          <h2>/dashboard</h2>
        </div>
        <div className="profile-card dashboard-summary">
          <span className="profile-sign">iwd</span>
          <h3>{currentUser?.username || "Guest"}</h3>
          <p>View work according to your package selection and active bookings.</p>
          <button type="button" className="solid-button" onClick={() => navigate("/home")}>Browse packages</button>
        </div>
        <div className="subscription-stack">
          {subscriptions.map((item) => (
            <div key={item.id} className="subscription-card">
              <strong>{item.package_details?.title}</strong>
              <p>{item.business_name}</p>
              <p>{item.package_details?.billing_period} - {item.package_details?.currency} {item.package_details?.amount}</p>
              <span className={`status-pill status-${item.status}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
