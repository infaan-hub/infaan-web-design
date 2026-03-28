function RegisterPage({ app }) {
  const { registerForm, setRegisterForm, updateField, submitAuth, beginGoogleLogin, loading } = app;

  return (
    <main className="main-content">
      <section className="section-card single-column-card">
        <div className="section-headline">
          <p className="micro-label">customer register</p>
          <h2>/register</h2>
        </div>
        <form className="form-card" onSubmit={(event) => { event.preventDefault(); submitAuth(registerForm, "/auth/register/"); }}>
          <input value={registerForm.username} onChange={(event) => updateField(setRegisterForm, "username", event.target.value)} placeholder="Username" />
          <input value={registerForm.first_name} onChange={(event) => updateField(setRegisterForm, "first_name", event.target.value)} placeholder="First name" />
          <input value={registerForm.last_name} onChange={(event) => updateField(setRegisterForm, "last_name", event.target.value)} placeholder="Last name" />
          <input type="email" value={registerForm.email} onChange={(event) => updateField(setRegisterForm, "email", event.target.value)} placeholder="Email" />
          <input value={registerForm.phone_number} onChange={(event) => updateField(setRegisterForm, "phone_number", event.target.value)} placeholder="Phone number" />
          <input type="password" value={registerForm.password} onChange={(event) => updateField(setRegisterForm, "password", event.target.value)} placeholder="Password" />
          <button type="submit" className="solid-button" disabled={loading}>Register</button>
          <button type="button" className="outline-button" onClick={beginGoogleLogin}>Register with Google OAuth</button>
        </form>
      </section>
    </main>
  );
}

export default RegisterPage;
