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
  } = app;

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
                <div className="price-list">
                  <button type="button" className="outline-button" onClick={() => {
                    setPackageForm({
                      service: String(pkg.service),
                      tier: pkg.tier,
                      title: pkg.title,
                      description: pkg.description,
                      features: pkg.features.join("\n"),
                      payment_notes: pkg.payment_notes,
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
      </section>
    </main>
  );
}

export default AdminDashboardPage;
