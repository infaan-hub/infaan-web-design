const authVisualImage =
  "https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1200&q=80";

function LoginPage({ app }) {
  const { loginForm, setLoginForm, updateField, submitAuth, beginGoogleLogin, loading, navigate } = app;

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-form-side">
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); submitAuth(loginForm, "/auth/login/", "customer"); }}>
            <h2>Welcome Back!!</h2>
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

            <div className="auth-socials">
              <button type="button" className="social-icon-button google-button" onClick={beginGoogleLogin} aria-label="Login with Google">
                <span className="google-g">G</span>
              </button>
            </div>

            <p className="auth-switch-copy">
              Don&apos;t have an account? <button type="button" className="auth-inline-link" onClick={() => navigate("/register")}>Sign up</button>
            </p>
          </form>
        </div>

        <div className="auth-visual-side">
          <div className="auth-visual-blob">
            <div className="auth-visual-image" style={{ backgroundImage: `url(${authVisualImage})` }} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
