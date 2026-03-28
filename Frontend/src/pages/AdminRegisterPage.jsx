function AdminRegisterPage({ app }) {
  const { adminRegisterForm, setAdminRegisterForm, updateField, submitAuth, loading } = app;

  return (
    <main className="main-content">
      <section className="section-card single-column-card">
        <div className="section-headline">
          <p className="micro-label">admin register</p>
          <h2>Admin Register</h2>
        </div>
        <form className="form-card" onSubmit={(event) => { event.preventDefault(); submitAuth(adminRegisterForm, "/auth/admin/register/", "admin"); }}>
          <input value={adminRegisterForm.username} onChange={(event) => updateField(setAdminRegisterForm, "username", event.target.value)} placeholder="Admin username" />
          <input value={adminRegisterForm.first_name} onChange={(event) => updateField(setAdminRegisterForm, "first_name", event.target.value)} placeholder="First name" />
          <input value={adminRegisterForm.last_name} onChange={(event) => updateField(setAdminRegisterForm, "last_name", event.target.value)} placeholder="Last name" />
          <input type="email" value={adminRegisterForm.email} onChange={(event) => updateField(setAdminRegisterForm, "email", event.target.value)} placeholder="Email" />
          <input value={adminRegisterForm.phone_number} onChange={(event) => updateField(setAdminRegisterForm, "phone_number", event.target.value)} placeholder="Phone number" />
          <input type="password" value={adminRegisterForm.password} onChange={(event) => updateField(setAdminRegisterForm, "password", event.target.value)} placeholder="Password" />
          <button type="submit" className="solid-button" disabled={loading}>Register admin</button>
        </form>
      </section>
    </main>
  );
}

export default AdminRegisterPage;
