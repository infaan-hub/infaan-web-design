function AdminLoginPage({ app }) {
  const { loginForm, setLoginForm, updateField, submitAuth, loading } = app;

  return (
    <main className="main-content">
      <section className="section-card single-column-card">
        <div className="section-headline">
          <p className="micro-label">admin login</p>
          <h2>/admin/login</h2>
        </div>
        <form className="form-card" onSubmit={(event) => { event.preventDefault(); submitAuth(loginForm, "/auth/login/", "admin"); }}>
          <input value={loginForm.username} onChange={(event) => updateField(setLoginForm, "username", event.target.value)} placeholder="Admin username" />
          <input type="password" value={loginForm.password} onChange={(event) => updateField(setLoginForm, "password", event.target.value)} placeholder="Password" />
          <button type="submit" className="solid-button" disabled={loading}>Login as admin</button>
        </form>
      </section>
    </main>
  );
}

export default AdminLoginPage;
