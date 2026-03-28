function AdminDashboardPage({ app }) {
  const {
    adminUserForm,
    setAdminUserForm,
    updateField,
    submitAdminUser,
    packageForm,
    setPackageForm,
    savePackage,
    editingPackageId,
    setEditingPackageId,
    groupedPackages,
    services,
    deletePackage,
    loading,
    subscriptions,
    formatPrice,
    navigate,
  } = app;

  const billingPeriods = ["weekly", "monthly", "yearly", "per_task"];

  function updatePackagePrice(index, field, value) {
    setPackageForm((previous) => ({
      ...previous,
      prices: previous.prices.map((price, priceIndex) =>
        priceIndex === index ? { ...price, [field]: value } : price
      ),
    }));
  }

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">admin dashboard</p>
          <h2>Admin Dashboard</h2>
        </div>
        <div className="admin-grid">
          <form className="form-card" onSubmit={(event) => { event.preventDefault(); submitAdminUser(); }}>
            <h3>Add customer account</h3>
            <input value={adminUserForm.username} onChange={(event) => updateField(setAdminUserForm, "username", event.target.value)} placeholder="Username" />
            <input value={adminUserForm.first_name} onChange={(event) => updateField(setAdminUserForm, "first_name", event.target.value)} placeholder="First name" />
            <input value={adminUserForm.last_name} onChange={(event) => updateField(setAdminUserForm, "last_name", event.target.value)} placeholder="Last name" />
            <input type="email" value={adminUserForm.email} onChange={(event) => updateField(setAdminUserForm, "email", event.target.value)} placeholder="Email" />
            <input value={adminUserForm.phone_number} onChange={(event) => updateField(setAdminUserForm, "phone_number", event.target.value)} placeholder="Phone number" />
            <input type="password" value={adminUserForm.password} onChange={(event) => updateField(setAdminUserForm, "password", event.target.value)} placeholder="Password" />
            <button type="submit" className="solid-button" disabled={loading}>Create customer</button>
          </form>

          <form className="form-card" onSubmit={(event) => { event.preventDefault(); savePackage(); }}>
            <h3>{editingPackageId ? "Edit package" : "Post package"}</h3>
            <select value={packageForm.service} onChange={(event) => updateField(setPackageForm, "service", event.target.value)}>
              <option value="">Select service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
            <select value={packageForm.tier} onChange={(event) => updateField(setPackageForm, "tier", event.target.value)}>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="premium">Premium</option>
              <option value="extra">Extra</option>
            </select>
            <input value={packageForm.title} onChange={(event) => updateField(setPackageForm, "title", event.target.value)} placeholder="Package title" />
            <textarea value={packageForm.description} onChange={(event) => updateField(setPackageForm, "description", event.target.value)} placeholder="Description" />
            <textarea value={packageForm.features} onChange={(event) => updateField(setPackageForm, "features", event.target.value)} placeholder="One feature per line" />
            <input value={packageForm.payment_notes} onChange={(event) => updateField(setPackageForm, "payment_notes", event.target.value)} placeholder="Payment notes" />
            <div className="admin-price-editor">
              <p className="micro-label">package prices</p>
              {billingPeriods.map((period, index) => (
                <div key={period} className="admin-price-row">
                  <strong>{period.replace("_", " ")}</strong>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={packageForm.prices[index]?.usd_amount || ""}
                    onChange={(event) => updatePackagePrice(index, "usd_amount", event.target.value)}
                    placeholder="USD amount"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={packageForm.prices[index]?.tzs_amount || ""}
                    onChange={(event) => updatePackagePrice(index, "tzs_amount", event.target.value)}
                    placeholder="TZS amount"
                  />
                </div>
              ))}
            </div>
            <button type="submit" className="solid-button" disabled={loading}>{editingPackageId ? "Update package" : "Create package"}</button>
            {editingPackageId && (
              <button type="button" className="outline-button" onClick={() => { setPackageForm(app.emptyPackage); setEditingPackageId(null); }}>
                Cancel edit
              </button>
            )}
          </form>
        </div>

        <div className="package-grid">
          {groupedPackages.flatMap((service) =>
            service.packages.map((pkg) => (
              <div key={pkg.id} className={`package-card tone-${pkg.tier}`}>
                <h4>{pkg.title}</h4>
                <p>{pkg.description}</p>
                <div className="admin-package-prices">
                  {pkg.prices.map((price) => (
                    <span key={`${price.billing_period}-${price.currency}`} className="price-chip">
                      {price.billing_period} {price.currency} {formatPrice(price.amount, price.currency).replace(`${price.currency} `, "")}
                    </span>
                  ))}
                </div>
                <div className="price-list">
                  <button type="button" className="outline-button" onClick={() => {
                    const priceMap = {
                      weekly: { billing_period: "weekly", usd_amount: "", tzs_amount: "" },
                      monthly: { billing_period: "monthly", usd_amount: "", tzs_amount: "" },
                      yearly: { billing_period: "yearly", usd_amount: "", tzs_amount: "" },
                      per_task: { billing_period: "per_task", usd_amount: "", tzs_amount: "" },
                    };
                    pkg.prices.forEach((price) => {
                      const amountKey = price.currency === "TZS" ? "tzs_amount" : "usd_amount";
                      if (priceMap[price.billing_period]) {
                        priceMap[price.billing_period][amountKey] = String(price.amount);
                      }
                    });
                    setPackageForm({
                      service: String(pkg.service),
                      tier: pkg.tier,
                      title: pkg.title,
                      description: pkg.description,
                      features: pkg.features.join("\n"),
                      payment_notes: pkg.payment_notes,
                      prices: Object.values(priceMap),
                      is_active: pkg.is_active,
                    });
                    setEditingPackageId(pkg.id);
                  }}>
                    Edit
                  </button>
                  <button type="button" className="header-button" onClick={() => deletePackage(pkg.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="section-headline admin-booking-head">
          <div>
            <p className="micro-label">recent bookings</p>
            <h2>Customer bookings</h2>
          </div>
          <button type="button" className="outline-button" onClick={() => navigate("/bookings-services")}>
            View all bookings
          </button>
        </div>

        <div className="subscription-stack">
          {[...subscriptions]
            .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
            .slice(0, 6)
            .map((booking) => (
            <div key={booking.id} className="subscription-card">
              <strong>{booking.user_details?.username}</strong>
              <p>{booking.business_name}</p>
              <p>{booking.package_details?.title}</p>
              <p>
                {booking.package_details?.billing_period} -{" "}
                {formatPrice(booking.package_details?.amount, booking.package_details?.currency)}
              </p>
              <span className={`status-pill status-${booking.status}`}>{booking.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AdminDashboardPage;
