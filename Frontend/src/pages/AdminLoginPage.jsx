import adminVisualImage from "../assets/WhatsApp Image 2025-09-21 at 01.56.52_720d7821.jpg";

function AdminLoginPage({ app }) {
  const { loginForm, setLoginForm, updateField, submitAuth, loading } = app;

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-form-side">
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); submitAuth(loginForm, "/auth/login/", "admin"); }}>
            <h2>Admin Login</h2>
            <label className="auth-input-wrap">
              <span>Email or Username</span>
              <input value={loginForm.username} onChange={(event) => updateField(setLoginForm, "username", event.target.value)} placeholder="@ username or email" />
            </label>
            <label className="auth-input-wrap">
              <span>Password</span>
              <input type="password" value={loginForm.password} onChange={(event) => updateField(setLoginForm, "password", event.target.value)} placeholder="Enter your password" />
            </label>
            <div className="auth-meta-row">
              <span />
              <button type="button" className="auth-link-button">Forgot Password?</button>
            </div>
            <button type="submit" className="auth-submit-button" disabled={loading}>Login</button>
          </form>
        </div>

        <div className="auth-visual-side">
          <div className="auth-visual-blob">
            <div className="auth-visual-image" style={{ backgroundImage: `url(${adminVisualImage})` }} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminLoginPage;
