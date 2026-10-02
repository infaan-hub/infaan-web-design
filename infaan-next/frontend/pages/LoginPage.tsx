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

            <button type="button" className="google-glass-button" onClick={beginGoogleLogin} aria-label="Continue with Google">
              <svg className="google-g-logo" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span className="google-glass-label">Continue with Google</span>
            </button>

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
