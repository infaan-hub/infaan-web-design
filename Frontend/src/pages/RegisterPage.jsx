function RegisterPage({ app }) {
  const { registerForm, setRegisterForm, updateField, submitAuth, beginGoogleLogin, loading, navigate } = app;

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-form-side">
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); submitAuth(registerForm, "/auth/register/", "customer"); }}>
            <h2>Create Account</h2>
            <label className="auth-input-wrap">
              <span>Username</span>
              <input value={registerForm.username} onChange={(event) => updateField(setRegisterForm, "username", event.target.value)} placeholder="Choose username" />
            </label>
            <label className="auth-input-wrap">
              <span>First name</span>
              <input value={registerForm.first_name} onChange={(event) => updateField(setRegisterForm, "first_name", event.target.value)} placeholder="First name" />
            </label>
            <label className="auth-input-wrap">
              <span>Last name</span>
              <input value={registerForm.last_name} onChange={(event) => updateField(setRegisterForm, "last_name", event.target.value)} placeholder="Last name" />
            </label>
            <label className="auth-input-wrap">
              <span>Email</span>
              <input type="email" value={registerForm.email} onChange={(event) => updateField(setRegisterForm, "email", event.target.value)} placeholder="@ email" />
            </label>
            <label className="auth-input-wrap">
              <span>Phone number</span>
              <input value={registerForm.phone_number} onChange={(event) => updateField(setRegisterForm, "phone_number", event.target.value)} placeholder="Phone number" />
            </label>
            <label className="auth-input-wrap">
              <span>Password</span>
              <input type="password" value={registerForm.password} onChange={(event) => updateField(setRegisterForm, "password", event.target.value)} placeholder="Create password" />
            </label>
            <button type="submit" className="auth-submit-button" disabled={loading}>Sign up</button>

            <div className="auth-socials">
              <button type="button" className="social-icon-button google-button" onClick={beginGoogleLogin} aria-label="Register with Google">
                <span className="google-g">G</span>
              </button>
              <button type="button" className="social-icon-button" aria-label="Facebook">
                f
              </button>
              <button type="button" className="social-icon-button" aria-label="Apple">
                
              </button>
            </div>

            <p className="auth-switch-copy">
              Already have an account? <button type="button" className="auth-inline-link" onClick={() => navigate("/login")}>Sign in</button>
            </p>
          </form>
        </div>

        <div className="auth-visual-side">
          <div className="auth-visual-blob">
            <div className="auth-figure">🎧</div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default RegisterPage;
