const adminRegisterVisualImage =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

function AdminRegisterPage({ app }) {
  const { adminRegisterForm, setAdminRegisterForm, updateField, submitAuth, loading } = app;

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-form-side">
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); submitAuth(adminRegisterForm, "/auth/admin/register/", "admin"); }}>
            <h2>Admin Register</h2>
            <label className="auth-input-wrap">
              <span>Username</span>
              <input value={adminRegisterForm.username} onChange={(event) => updateField(setAdminRegisterForm, "username", event.target.value)} placeholder="Admin username" />
            </label>
            <label className="auth-input-wrap">
              <span>First name</span>
              <input value={adminRegisterForm.first_name} onChange={(event) => updateField(setAdminRegisterForm, "first_name", event.target.value)} placeholder="First name" />
            </label>
            <label className="auth-input-wrap">
              <span>Last name</span>
              <input value={adminRegisterForm.last_name} onChange={(event) => updateField(setAdminRegisterForm, "last_name", event.target.value)} placeholder="Last name" />
            </label>
            <label className="auth-input-wrap">
              <span>Email</span>
              <input type="email" value={adminRegisterForm.email} onChange={(event) => updateField(setAdminRegisterForm, "email", event.target.value)} placeholder="Email" />
            </label>
            <label className="auth-input-wrap">
              <span>Phone number</span>
              <input value={adminRegisterForm.phone_number} onChange={(event) => updateField(setAdminRegisterForm, "phone_number", event.target.value)} placeholder="Phone number" />
            </label>
            <label className="auth-input-wrap">
              <span>Password</span>
              <input type="password" value={adminRegisterForm.password} onChange={(event) => updateField(setAdminRegisterForm, "password", event.target.value)} placeholder="Create password" />
            </label>
            <button type="submit" className="auth-submit-button" disabled={loading}>Register</button>
          </form>
        </div>

        <div className="auth-visual-side">
          <div className="auth-visual-blob">
            <div className="auth-visual-image" style={{ backgroundImage: `url(${adminRegisterVisualImage})` }} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminRegisterPage;
