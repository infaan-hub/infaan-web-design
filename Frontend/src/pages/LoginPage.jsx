function LoginPage({ app }) {
  const { loginForm, setLoginForm, updateField, submitAuth, beginGoogleLogin, loading } = app;

  return (
    <main className="main-content">
      <section className="section-card single-column-card">
        <div className="section-headline">
          <p className="micro-label">customer login</p>
          <h2>/login</h2>
        </div>
        <form className="form-card" onSubmit={(event) => { event.preventDefault(); submitAuth(loginForm, "/auth/login/"); }}>
          <input value={loginForm.username} onChange={(event) => updateField(setLoginForm, "username", event.target.value)} placeholder="Username" />
          <input type="password" value={loginForm.password} onChange={(event) => updateField(setLoginForm, "password", event.target.value)} placeholder="Password" />
          <button type="submit" className="solid-button" disabled={loading}>Login</button>
          <button type="button" className="outline-button" onClick={beginGoogleLogin}>Login with Google OAuth</button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
